import { state, keyReference } from "./piano/resources.js"
import { startPlayer, startPlaying, stopPlaying } from "./piano/midiPlayer.js";

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
