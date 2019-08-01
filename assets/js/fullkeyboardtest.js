"use strict";

const AudioContext = window.AudioContext || window.webkitAudioContext;

const CONSTANTS = {
   noteFade: 0.8
}

const state = {
   mouseDown: false,
   audioContext: new AudioContext(),
   kb: undefined,
   audio: [],
   pedal: false
};

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();

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

   const rects = state.kb.getElementsByTagName("rect");

   for (let i = 0; i < rects.length; i++) {
      const key = rects[i];

      preload(`assets/audio/${Number(key.id)}.webm`, i);
      console.log(`preloading assets/audio/${Number(key.id)}.webm`);

      key.addEventListener("mousedown", function() {
         startPlaying(i, key);
      });

      key.addEventListener("mouseup", function() {
         stopPlaying(i, key);
      });

      key.addEventListener("mouseenter", function() {
         if (state.mouseDown) {
            startPlaying(i, key);
         }
      });

      key.addEventListener("mouseout", function() {
         stopPlaying(i, key);
      });
   }
});

function startPlaying(i, key) {
   key.style.fill = "red";

   const note = state.audio[i];
   
   note.source = state.audioContext.createBufferSource();
   note.source.buffer = note.buffer;
   note.gain = state.audioContext.createGain();
   note.source.connect(note.gain);
   note.gain.connect(state.audioContext.destination);

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
         note.gain.gain.exponentialRampToValueAtTime(0.00001, state.audioContext.currentTime + CONSTANTS.noteFade);
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
      state.audioContext.decodeAudioData(req.response,
         function(buffer) {
            note.buffer = buffer;

            state.audio[index] = note;
         },
         function(err) {
            console.log(err);
         });
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