import { CONSTANTS, colors, state, keyReference } from "./resources.js"

export function startPlayer(startIndex = 0) {
   if (state.midi) {
      const ticksPerSecond = state.midi.header.ticksPerSecond;
      const playableTracks = state.midi.tracks.filter(track => track.playableMusic);
      let earliestStartTime = Infinity; // some MIDIs start with long silences, let's chop that out
      let latestEndTime = 0; // get end time of MIDI so that we can reset player state at the end of playback
      let longestTrackLength = 0; // store length of current longest track for comparison purposes

      playableTracks.forEach((track, trackNum) => {
         if (earliestStartTime > track.startTime) earliestStartTime = track.startTime;
         if (longestTrackLength < track.playableMusic.length) {
            longestTrackLength = track.playableMusic.length;
            latestEndTime = track.endTime
            state.longestTrackIndex = trackNum;
         }
      });

      setPedal(false); // reset pedal back to off in case playback stopped before the damper pedal was reset
      updateSeekBarUI(playableTracks);

      // sync object for seeking across multi-track MIDI files
      const sync = syncSeekAcrossTracks(playableTracks, state.longestTrackIndex, startIndex);

      playableTracks.forEach((track, trackNum) => {
         let seekOffset = earliestStartTime; // chop out silence at start of playback
         // convert ticks to milliseconds with 1 second grace period
         latestEndTime = (1000 * latestEndTime / ticksPerSecond) - seekOffset;

         if (startIndex > 0) {
            seekOffset = 1000 * track.playableMusic[sync[trackNum].startIndex].startTime / ticksPerSecond; // convert to millis
            if (trackNum === state.longestTrackIndex) latestEndTime -= seekOffset;
         }

         for (let i = sync[trackNum].startIndex; i < track.playableMusic.length; i++) {
            const midiEvent = track.playableMusic[i];
            const baseStartTime = 1000 * midiEvent.startTime / ticksPerSecond;
            const trackOffset = 1000 * sync[trackNum].offset / ticksPerSecond;
            const startMillis = baseStartTime - seekOffset - trackOffset; // realign tracks that are offset in time from each other
            processMidiEvent(midiEvent, startMillis, ticksPerSecond, trackNum, i);
         }
      });

      // reset player state when we reach end of the MIDI file
      state.player.push(setTimeout(function() {
         stopMidiPlaying();
      }, latestEndTime));

   } else {
      console.log("MIDI not loaded!");
   }
}

function processMidiEvent(midiEvent, startMillis, ticksPerSecond, trackNum, i) {
   if (midiEvent.pianoNote) {
      (function(i){state.player.push(setTimeout(function() {
         playNoteForDuration(
            midiEvent.pianoNote,
            1000 * midiEvent.duration / ticksPerSecond,
            colors[trackNum],
            midiEvent.velocity
         );
         if (i > state.midiIndex) state.midiIndex = i;
         updateSeekBarUI();
      }, startMillis));})(i);
   } else if (midiEvent.type === "control change or channel mode message") {
      handleControlChangeEvent(midiEvent, startMillis, i);
   }
}

function playNoteForDuration(pianoKeyNumber, duration, color, velocity) {
   const volume = velocity/127;
   startPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]], color, volume);
   setTimeout(function() {
      stopPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]])
   }, duration);
}

export function startPlaying(i, key, color = "red", gain = 1) {
   key.style.fill = color;

   const note = state.audio[i];
   note.currentTime = state.audioContext.currentTime;
   state.currentlyHeldDownKeys[i] = true;
   
   note.source = state.audioContext.createBufferSource();
   note.source.buffer = note.buffer;
   note.gain = state.audioContext.createGain();
   note.source.connect(note.gain);
   note.gain.connect(state.audioContext.destination);
   note.gain.gain.linearRampToValueAtTime(gain * state.volume, state.audioContext.currentTime + 0.06);

   note.source.start(0);
}

export function stopPlaying(i, key) {
   key.style.fill = key.dataset.fill;
   const note = state.audio[i];
   noteStop(note);
   state.currentlyHeldDownKeys[i] = false;
}

function noteStop(note, endingVolume = 0.05, noteFadeDuration = CONSTANTS.noteFade) {
   try {
      if (note.source && !state.pedal) {
      note.gain.gain.linearRampToValueAtTime(endingVolume, state.audioContext.currentTime + noteFadeDuration);
      note.source.stop(state.audioContext.currentTime + CONSTANTS.noteFade);
      }
   } catch (e) {
      console.log(e);
   }
}

export function setPedal(pedalState) {
   const damperButton = document.getElementById("damper");
   state.pedal = pedalState;

   if (pedalState) {
      damperButton.textContent = "Damper pedal ON";
   } else {
      damperButton.textContent = "Damper pedal OFF";

      for (let i = 0; i < state.audio.length; i++) {
         if (! state.currentlyHeldDownKeys[i]) noteStop(state.audio[i], 0.15, CONSTANTS.noteFade + 0.4);  
      }   
   }
}

export function pausePlaying(updateUI = true) {
   state.player.forEach(queuedNote => clearTimeout(queuedNote));
   state.player.length = 0;
   if (updateUI) updateSeekBarUI();
}

export function stopMidiPlaying(updateUI = true) {
   state.midiIndex = 0;
   pausePlaying(updateUI);
}

function handleControlChangeEvent(event, startMillis, i) {
   switch(event.controlChangeType) {
      case "damper pedal toggle":

         (function(i){state.player.push(setTimeout(function() {
            (event.controlChangeValue > 63) ? setPedal(true) : setPedal(false); 
            state.midiIndex = i;
            updateSeekBarUI();
         }, startMillis));})(i);
         break;
      
      default:
   }
}

function updateSeekBarUI(playableTracks) {
   const seekBar = document.getElementById("seekBar");

   if (playableTracks) {
      seekBar.setAttribute("max", playableTracks[state.longestTrackIndex].playableMusic.length - 1);
   }

   seekBar.value = state.midiIndex;
}

export function userMovesSeekBar() {
   const seekBar = document.getElementById("seekBar");
   stopMidiPlaying(false);
   startPlayer(Number(seekBar.value));
}

// helper function for keeping multi track MIDI files in sync when seeking
// we seek based on the index of the longest track (the track with the most notes)
// but sometimes the other tracks will not have notes that are played at the same moment in time
// so we will have to realign them by adding a time offset to the other tracks
function syncSeekAcrossTracks(playableTracks, longestTrackIndex, startIndexOfLongestTrack) {
   const seek = [];
   const startTimeOfLongestTrack = playableTracks[longestTrackIndex].playableMusic[startIndexOfLongestTrack].startTime;

   seek[longestTrackIndex] = {
      startIndex: startIndexOfLongestTrack,
      offset: 0,
      startTime: startTimeOfLongestTrack
   };

   for (let i = 0; i < playableTracks.length; i++) {
      if (i === longestTrackIndex) continue;

      seek[i] = searchForCorrespondingStartIndex(playableTracks[i], startTimeOfLongestTrack);
   }

   return seek;
}

// todo: replace with binary search
function searchForCorrespondingStartIndex(track, startTimeOfLongestTrack) {
   for (let i = 0; i < track.playableMusic.length; i++) {
      if (track.playableMusic[i].startTime > startTimeOfLongestTrack) {
         return {
            startIndex: i - 1,
            offset: startTimeOfLongestTrack - track.playableMusic[i - 1].startTime,
            startTime: track.playableMusic[i - 1].startTime
         };
      }
   }
}