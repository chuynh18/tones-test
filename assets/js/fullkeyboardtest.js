import { CONSTANTS, state, colors, keyReference } from "./piano/resources.js"

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();
   state.rects = state.kb.getElementsByTagName("rect");

   state.kb.addEventListener("click", function() {
      state.audioContext.resume().then(() => {
         console.log("AudioContext is now active.");
      });
   }, {once: true});

   state.kb.addEventListener("mousedown", function() {
      state.mouseDown = true;
   });

   state.kb.addEventListener("mouseup", function() {
      state.mouseDown = false;
   });

   // attach event listeners to each key of the piano
   for (let i = 0; i < state.rects.length; i++) {
      preload(`assets/audio/${Number(state.rects[i].id)}.mp3`, i);

      // penance for my sin of being not smart when assigning IDs to the piano keys in the SVG
      keyReference[state.rects[i].id] = i;

      state.rects[i].addEventListener("mousedown", function() {
         startPlaying(i, state.rects[i]);
      });

      state.rects[i].addEventListener("mouseup", function() {
         stopPlaying(i, state.rects[i]);
      });

      state.rects[i].addEventListener("mouseenter", function() {
         if (state.mouseDown) {
            startPlaying(i, state.rects[i]);
         }
      });

      state.rects[i].addEventListener("mouseout", function() {
         stopPlaying(i, state.rects[i]);
      });
   }

   document.getElementById("damper").addEventListener("click", togglePedal);

   document.getElementById("playMidi").addEventListener("click", playMidi);
});

function startPlaying(i, key, color = "red", gain = 1) {
   key.style.fill = color;

   const note = state.audio[i];
   
   note.source = state.audioContext.createBufferSource();
   note.source.buffer = note.buffer;
   note.gain = state.audioContext.createGain();
   note.source.connect(note.gain);
   note.gain.connect(state.audioContext.destination);

   note.gain.gain.value = gain;

   note.source.start(0);
}

function stopPlaying(i, key) {
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

function preload(url, index) {
   const req = new XMLHttpRequest;
   req.open("GET", url, true);
   req.responseType = 'arraybuffer';

   const note = {
      buffer: null,
      source: null,
      gain: null
   };

   req.onload = function() {
      state.audioContext.decodeAudioData(
         req.response,
         function(buffer) {
            note.buffer = buffer;

            state.audio[index] = note;
         },
         function(err) {
            console.log(err);
         }
      );
    }
    req.send();
}

function togglePedal() {
   const damperButton = document.getElementById("damper");

   if (state.pedal) {
      state.pedal = false;
      damperButton.textContent = "Damper pedal OFF";

      for (let i = 0; i < state.audio.length; i++) {
         noteStop(state.audio[i]);
      }      
   } else {
      state.pedal = true;
      damperButton.textContent = "Damper pedal ON";
   }
}

function playMidi() {
   state.midiIndex = Number(document.getElementById("midiIndex").value);
   startPlayer(Number(state.midiIndex));
}

function startPlayer(startIndex = 0) {
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
            if (midiEvent.pianoNote) {
               const startMillis = (1000 * midiEvent.startTime / ticksPerSecond) - offset;

               (function(i){setTimeout(function() {
                  playNoteForDuration(
                     midiEvent.pianoNote,
                     1000 * midiEvent.duration / ticksPerSecond,
                     colors[trackNum],
                     midiEvent.velocity
                  );
                  state.midiIndex = i;
                  document.getElementById("currentPosition").innerHTML = `Current note is ${state.midiIndex} out of `;
               }, startMillis);})(i);
            }
         }
      });

   } else {
      console.log("MIDI not loaded!");
   }
}

function playNoteForDuration(pianoKeyNumber, duration, color, velocity) {
   const volume = velocity/127;
   startPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]], color, volume);
   setTimeout(function() {
      stopPlaying(keyReference[pianoKeyNumber], state.rects[keyReference[pianoKeyNumber]])
   }, duration);
}