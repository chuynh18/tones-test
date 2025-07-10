import { CONSTANTS, colors, state, keyReference } from "./resources.js"

export function startPlayer(startIndex = 0) {
   if (globalThis.midiFile) {
      const ticksPerSecond = globalThis.midiFile.header.ticksPerSecond;
      const playableTracks = globalThis.midiFile.tracks.filter(track => track.playableMusic);
      document.getElementById("midiTotalLength").innerHTML = `${playableTracks[0].playableMusic.length}`;
      playableTracks.forEach((track, trackNum) => {
         let offset = 0;

         if (startIndex > 0) {
            offset = 1000 * track.playableMusic[startIndex].startTime / ticksPerSecond;
         }

         for (let i = startIndex; i < track.playableMusic.length; i++) {
            const midiEvent = track.playableMusic[i];
            const startMillis = (1000 * midiEvent.startTime / ticksPerSecond) - offset;

            processMidiEvent(midiEvent, startMillis, ticksPerSecond, trackNum, i);

         }
      });

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
         document.getElementById("currentPosition").innerHTML = `Current note is ${state.midiIndex} out of `;
      }, startMillis));})(i);
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

export function pausePlaying() {
   state.player.forEach(queuedNote => clearTimeout(queuedNote));
   state.player.length = 0;
   document.getElementById("midiIndex").setAttribute("value", state.midiIndex);
}

export function stopMidiPlaying() {
   state.midiIndex = 0;
   pausePlaying();
}