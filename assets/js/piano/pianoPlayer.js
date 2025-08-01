import { CONSTANTS, colors, state, keyReference } from "./resources.js"
import { drawRect, onscreenDurationMillis, destroyAndRedrawRect } from "../visualizer/visualizer.js";

export function startPlayer(startIndex = 0) {
   if (state.midi) {
      const ticksPerSecond = state.midi.header.ticksPerSecond;
      const playableTracks = state.midi.tracks.filter(track => track.playableMusic);
      let seekOffset = Infinity; // some MIDIs start with long silences, let's chop that out
      let latestEndTime = 0; // get end time of MIDI so that we can reset player state at the end of playback
      let longestTrackLength = 0; // store length of current longest track for comparison purposes
      
      playableTracks.forEach((track, trackNum) => {
         if (seekOffset > track.startTime) seekOffset = track.startTime;
         if (longestTrackLength < track.playableMusic.length) {
            longestTrackLength = track.playableMusic.length;
            latestEndTime = track.endTime
            state.longestTrackIndex = trackNum;
         }
      });

      latestEndTime = (1000 * latestEndTime / ticksPerSecond) - seekOffset; // convert ticks to milliseconds

      setDamper(false); // reset pedal back to off in case playback stopped before the damper pedal was reset
      updateSeekBarUI(playableTracks);

      // sync object for seeking across multi-track MIDI files
      const sync = syncSeekAcrossTracks(playableTracks, state.longestTrackIndex, startIndex);

      playableTracks.forEach((track, trackNum) => {
         if (startIndex > 0) {
            seekOffset = 1000 * track.playableMusic[sync[trackNum].startIndex].startTime / ticksPerSecond; // convert to ms
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
      }, latestEndTime + 500));

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
            computeColor(trackNum, midiEvent.velocity),
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
   const volume = velocity / 127; // maximum MIDI velocity is 7 bit number
   startPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]], color, volume, true);
   const rect = drawRect(state.rects[keyReference[pianoKeyNumber]], duration, color);
   setTimeout(function() {;
      rect.parentNode.removeChild(rect);
   }, duration + onscreenDurationMillis);
   setTimeout(function() {
      stopPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]], true);
   }, duration);
}

/**
 * Start playing a note
 * @param {Number} i the note number to be played (# of the key on the piano, 1 through 88)
 * @param {SVGElement} key the key SVG rect
 * @param {String} color the color of the key when it is being played, defaults to "red"
 * @param {Number} gain how loud the note should be
 */
export function startPlaying(i, key, color = "red", gain = 1, skipDrawing = false) {
   key.style.fill = color;
   key.setAttribute("class", "pressed");

   const note = state.audio[i];
   note.currentTime = state.audioContext.currentTime;
   state.currentlyHeldDownKeys[i] = true;
   let unaCordaGain;
   state.unaCorda ? unaCordaGain = 0.8 : unaCordaGain = 1;
   
   // I was thinking it's inefficient to create a BufferSource every time a note is played, but the MDN docs say
   // this is the right way to do it. They are very inexpensive to create and will be garbage collected, and I am
   // reusing the underlying AudioBuffer which is the more expensive thing to instantiate. Also, BufferSources can only
   // be played once, so they have to be recreated anyway.
   
   const noteSource = state.bufferSources[i];
   
   // store references to each AudioBufferSourceNode so that we can KILL THEM ALL when the damper pedal is released
   // (I'm from Buenos Aires)
   noteSource[noteSource.length] = new AudioBufferSourceNode(
      state.audioContext,
      {buffer: note.buffer}
   );

   const noteToBePlayed = noteSource[noteSource.length - 1]

   note.gain = state.audioContext.createGain();
   noteToBePlayed.connect(note.gain);
   note.gain.connect(state.audioContext.destination);
   note.gain.gain.setTargetAtTime(gain * state.volume * unaCordaGain, state.audioContext.currentTime, 0.005);

   noteToBePlayed.start(0);

   if (! skipDrawing) {
      const rect = drawRect(state.rects[i], 10000, color);
      state.visualizerRects[i].push({
         rect: rect,
         createdAt: Date.now(),
         i: i,
         color: color
      });
   }
}

/**
 * 
 * @param {Number} i the note number to be played (# of the key on the piano, 1 through 88)
 * @param {SVGElement} key the key SVG rect
 */
export function stopPlaying(i, key, skipDestroy = false) {
   key.style.fill = key.dataset.fill;
   key.setAttribute("class", "unpressed");
   state.currentlyHeldDownKeys[i] = false;
   
   if (! skipDestroy) {
      const rectObj = state.visualizerRects[i].shift();
      destroyAndRedrawRect(rectObj);
   }
   
   if (!state.pedal) {
      const note = state.audio[i];
      // This is mutating the array from the front. generally, though, the array length should be 0 or 1, so there
      // should not be performance implications (well computers today are way too fast so it doesn't actually matter)
      // However there is an edge case: some of the MIDIs I've found are glitchy as heck and have multiple tracks for
      // no reason at all and sometimes spam the same note multiple times before releasing. Still, computers are fast!
      const noteBufferSource = state.bufferSources[i].shift();
      noteStop(note, noteBufferSource);
   }
}

function noteStop(note, noteBufferSource, endingVolume = 0.1, noteFadeDuration = CONSTANTS.noteFade) {
   try {
         note.gain.gain.setTargetAtTime(endingVolume, state.audioContext.currentTime, noteFadeDuration);
         if (noteBufferSource) {
            noteBufferSource.stop(state.audioContext.currentTime + noteFadeDuration + 0.1);
         }
   } catch (e) {
      console.log(e);
   }
}

export function setDamper(pedalState) {
   const damperButton = document.getElementById("damper");
   state.pedal = pedalState;

   if (pedalState) {
      damperButton.textContent = "Damper pedal ON";
   } else {
      damperButton.textContent = "Damper pedal OFF";

      for (let i = 0; i < state.audio.length; i++) {
         if (! state.currentlyHeldDownKeys[i]) {
            state.bufferSources[i].forEach(buffer => {
               // arbitrarily chosen numbers because they sound good to my ears
               noteStop(state.audio[i], buffer, 0.15, CONSTANTS.noteFade + 0.4);
            });
            state.bufferSources[i].length = 0;
         }
      }   
   }
}

function setUnaCorda(pedalState) {
   state.unaCorda = pedalState;
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
         pedal(event, startMillis, i, setDamper);
         break;
      case "una corda toggle":
         pedal(event, startMillis, i, setUnaCorda);
         break;
      default:
         console.log("Unhandled control change event:", event);
   }
}

function pedal(event, startMillis, i, pedalFunction) {
   (function(i){state.player.push(setTimeout(function() {
      (event.controlChangeValue > 63) ? pedalFunction(true) : pedalFunction(false); 
      if (i > state.midiIndex) state.midiIndex = i;
      updateSeekBarUI();
   }, startMillis));})(i);
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
// but sometimes the other tracks will not have notes that are played at the exact same moment in time
// so we will have to realign them by adding a time offset to the other tracks
/**
 *
 * @param {Array.<Object>} playableTracks array of playable tracks
 * @param {Number} longestTrackIndex the index of the longest (in terms of MIDI events) track
 * @param {Number} startIndexOfLongestTrack the index from which to start playing (i.e. the user scrubbed the seek bar)
 * @returns {Array.<Object>} array of seek objects used to align playback of multi-track MIDI files
 */
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
      const seekObject = searchForCorrespondingStartIndex(playableTracks[i], startTimeOfLongestTrack);
      seek[i] = seekObject;
      if (! seekObject) {
         seek[i] = {
            startIndex: playableTracks[i].playableMusic.length - 1,
            offset: 0,
            startTime: Infinity
         };
      }
   }

   return seek;
}

/**
 *
 * @param {Object} track a playable track (deserialized by midijs from midi file)
 * @param {Number} startTimeOfLongestTrack MIDI start time of a MIDI event
 */
function searchForCorrespondingStartIndex(track, startTimeOfLongestTrack) {
   let previousIndex = 0;
   let index = 0;
   let lastStartTime = 0;
   
   for (let i = 0; i < track.playableMusic.length; i++) {
      if (track.playableMusic[i].startTime > lastStartTime) {
         lastStartTime = track.playableMusic[i].startTime;
         previousIndex = index;
         index = i;
      }

      if (track.playableMusic[i].startTime > startTimeOfLongestTrack) {
         return {
            startIndex: previousIndex,
            offset: startTimeOfLongestTrack - track.playableMusic[previousIndex].startTime,
            startTime: track.playableMusic[previousIndex].startTime
         };
      }
   }
}

// binary search version, but I'll have to rethink it for the edge cases for the really ugly noncompliant MIDI

// function searchForCorrespondingStartIndex(track, startTimeOfLongestTrack, left, right) {
//    function mean(...args) { // arithmetic mean, uses ...args so it is variadic even though we will only ever feed 2 args
//       return args.reduce((accumulator, currentValue) => accumulator + currentValue) / args.length;
//    }

//    if (!left) left = 0;
//    if (!right) right = track.playableMusic.length - 1;

//    let middle = Math.floor(mean(left, right));

//    if (left === middle || right === middle) {
//       return {
//             startIndex: middle,
//             offset: startTimeOfLongestTrack - track.playableMusic[middle].startTime,
//             startTime: track.playableMusic[middle].startTime
//          };
//    }

//    if (track.playableMusic[middle].startTime >= startTimeOfLongestTrack && track.playableMusic[middle - 1].startTime <= startTimeOfLongestTrack) {
//       return {
//          startIndex: middle - 1,
//          offset: startTimeOfLongestTrack - track.playableMusic[middle - 1].startTime,
//          startTime: track.playableMusic[middle - 1].startTime
//       };
//    } else if (track.playableMusic[middle].startTime > startTimeOfLongestTrack) {
//       return searchForCorrespondingStartIndex(track, startTimeOfLongestTrack, 0, middle);
//    } else {
//       return searchForCorrespondingStartIndex(track, startTimeOfLongestTrack, middle, right);
//    }
// }

function computeColor(trackNum, velocity) {
   const color = colors[trackNum];
   return `hsl(${color[0]}, ${color[1]}%, ${100 - (50 * velocity / CONSTANTS.maximumNoteVelocity)}%)`;
}