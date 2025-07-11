import { CONSTANTS, colors, state, keyReference } from "./resources.js"

export function startPlayer(startIndex = 0) {
   if (globalThis.midiFile) {
      const ticksPerSecond = globalThis.midiFile.header.ticksPerSecond;
      const playableTracks = globalThis.midiFile.tracks.filter(track => track.playableMusic);
      updateSeekBarUI(playableTracks);
      
      let earliestStartTime = Infinity; // some MIDIs start with long silences, let's chop that out
      let latestEndTime = 0; // get end time of MIDI so that we can reset player state at the end of playback
      
      playableTracks.forEach(track => {
         if (earliestStartTime > track.startTime) earliestStartTime = track.startTime;
         if (latestEndTime < track.endTime) latestEndTime = track.endTime;
      });
      
      playableTracks.forEach((track, trackNum) => {
         let offset = earliestStartTime; // chop out silence at start of playback
         // convert ticks to milliseconds with 1 second grace period
         latestEndTime = (1000 * latestEndTime / ticksPerSecond) - offset;

         if (startIndex > 0) {
            offset = 1000 * track.playableMusic[startIndex].startTime / ticksPerSecond;
            latestEndTime -= offset;
         }

         for (let i = startIndex; i < track.playableMusic.length; i++) {
            const midiEvent = track.playableMusic[i];
            const startMillis = (1000 * midiEvent.startTime / ticksPerSecond) - offset;
            processMidiEvent(midiEvent, startMillis, ticksPerSecond, trackNum, i);
         }
      });

      console.log(latestEndTime);
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
         state.midiIndex = i;
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
   state.audio[i].currentTime = state.audioContext.currentTime;
   
   note.source = state.audioContext.createBufferSource();
   note.source.buffer = note.buffer;
   note.gain = state.audioContext.createGain();
   note.source.connect(note.gain);
   note.gain.connect(state.audioContext.destination);

   note.gain.gain.value = gain * state.volume;

   note.source.start(0);
}

export function stopPlaying(i, key) {
   key.style.fill = key.dataset.fill;
   const note = state.audio[i];
   noteStop(note);
}

function noteStop(note) {
   try {
      if (note.source && !state.pedal) {
      note.gain.gain.exponentialRampToValueAtTime(0.05, state.audioContext.currentTime + CONSTANTS.noteFade);
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
         noteStop(state.audio[i]);
      }   
   }
}

export function pausePlaying(updateUI = true) {
   state.player.forEach(queuedNote => clearTimeout(queuedNote));
   state.player.length = 0;
   if (updateUI) updateSeekBarUI();
}

export function stopMidiPlaying() {
   state.midiIndex = 0;
   pausePlaying();
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
      seekBar.setAttribute("max", playableTracks[0].playableMusic.length - 1);
   }

   seekBar.value = state.midiIndex;
}

export function userMovesSeekBar() {
   const seekBar = document.getElementById("seekBar");
   pausePlaying(false);
   startPlayer(Number(seekBar.value));
}