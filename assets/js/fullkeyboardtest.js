import { state, keyReference } from "./piano/resources.js"
import getMidi from "./midi/midi-serializer.js";
import {
   startPlayer,
   startPlaying,
   stopPlaying,
   setPedal,
   pausePlaying,
   stopMidiPlaying,
   userMovesSeekBar
} from "./piano/pianoPlayer.js";

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();
   state.rects = state.kb.getElementsByTagName("rect");

   state.kb.addEventListener("click", function() {
      state.audioContext.resume().then(() => {
         console.log("AudioContext is now active.");
      });
   }, {once: true});

   state.kb.addEventListener("pointerdown", function() {
      state.mouseDown = true;
   });

   state.kb.addEventListener("pointerup", function() {
      state.mouseDown = false;
   });

   // attach event listeners to each key of the piano
   for (let i = 0; i < state.rects.length; i++) {
      preload(`assets/audio/${Number(state.rects[i].id)}.mp3`, i);

      // penance for my sin of being not smart when assigning IDs to the piano keys in the SVG
      keyReference[state.rects[i].id] = i;

      state.rects[i].addEventListener("pointerdown", function() {
         startPlaying(i, state.rects[i]);
      });

      state.rects[i].addEventListener("pointerup", function() {
         stopPlaying(i, state.rects[i]);
      });

      state.rects[i].addEventListener("pointerenter", function() {
         if (state.mouseDown) {
            startPlaying(i, state.rects[i]);
         }
      });

      state.rects[i].addEventListener("pointerleave", function() {
         stopPlaying(i, state.rects[i]);
      });
   }

   document.getElementById("damper").addEventListener("click", togglePedal);
   document.getElementById("playMidi").addEventListener("click", playMidi);
   document.getElementById("pauseMidi").addEventListener("click", pausePlaying);
   document.getElementById("stopMidi").addEventListener("click", stopMidiPlaying);
   document.getElementById("volume").addEventListener("pointerup", setVolume);

   const fileInput = document.getElementById("midi");
   
   fileInput.addEventListener("change", () => {
       getMidi(fileInput)
           .then(result => {
               console.log(result);
               globalThis.midiFile = result; // if you want to make it available in the global scope
           })
           .catch(error => console.log(error));
   });

   this.document.getElementById("seekBar").addEventListener("change", userMovesSeekBar);
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
   state.pedal ? setPedal(false) : setPedal(true);
}

function playMidi() {
   if (state.player.length > 0) return; // NO CHAOS (prevent kicking off playback multiple times)
   state.midiIndex = Number(document.getElementById("seekBar").value);
   startPlayer(Number(state.midiIndex));
}

function setVolume() {
   state.volume = Number(document.getElementById("volume").value)/50;
}