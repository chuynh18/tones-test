import { state, keyReference } from "./piano/resources.js"
import { startPlayer, startPlaying, stopPlaying, setPedal, pausePlaying, stopMidiPlaying } from "./piano/pianoPlayer.js";

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
   document.getElementById("pauseMidi").addEventListener("click", pausePlaying);
   document.getElementById("stopMidi").addEventListener("click", stopMidiPlaying);
   this.document.getElementById("volume").addEventListener("click", setVolume);
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
   state.midiIndex = Number(document.getElementById("midiIndex").value);
   startPlayer(Number(state.midiIndex));
}

function setVolume() {
   state.volume = Number(document.getElementById("volume").value)/50;
}