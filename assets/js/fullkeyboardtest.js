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
   pedal: false,
   midiIndex: 0
};

let rects

const keyReference = {};

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();
   rects = state.kb.getElementsByTagName("rect");

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

   for (let i = 0; i < rects.length; i++) {
      preload(`assets/audio/${Number(rects[i].id)}.mp3`, i);

      keyReference[rects[i].id] = i;

      rects[i].addEventListener("mousedown", function() {
         startPlaying(i, rects[i]);
      });

      rects[i].addEventListener("mouseup", function() {
         stopPlaying(i, rects[i]);
      });

      rects[i].addEventListener("mouseenter", function() {
         if (state.mouseDown) {
            startPlaying(i, rects[i]);
         }
      });

      rects[i].addEventListener("mouseout", function() {
         stopPlaying(i, rects[i]);
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
   console.log(startIndex);
   if (globalThis.midiFile) {
      const ticksPerSecond = globalThis.midiFile.header.ticksPerSecond;
      const playableTracks = globalThis.midiFile.tracks.filter(track => track.playableMusic);
      document.getElementById("midiTotalLength").innerHTML = `total length: ${playableTracks[0].playableMusic.length}`;
      playableTracks.forEach(track => {
         let offset = 0;

         if (startIndex > 0) {
            offset = 1000 * track.playableMusic[startIndex].startTime / ticksPerSecond;
         }

         for (let i = startIndex; i < track.playableMusic.length; i++) {
            const midiEvent = track.playableMusic[i];
            if (midiEvent.pianoNote) {
               const startMillis = (1000 * midiEvent.startTime / ticksPerSecond) - offset;
               console.log(startMillis);
               setTimeout(function() {
                  playNoteForDuration(
                     midiEvent.pianoNote,
                     1000 * midiEvent.duration / ticksPerSecond,
                     midiEvent.velocity
                  );
                  state.midiIndex = i;
                  document.getElementById("midiIndex").setAttribute("value", i);
               }, startMillis);
            }
         }
      });

   } else {
      console.log("MIDI not loaded!");
   }
}

function getPlayableTracks(tracks) {
   return tracks.map
}

function playNoteForDuration(pianoKeyNumber, duration, velocity) {
   startPlaying(keyReference[pianoKeyNumber], rects[keyReference[pianoKeyNumber]]);
   setTimeout(function() {
      stopPlaying(keyReference[pianoKeyNumber], rects[keyReference[pianoKeyNumber]])
   }, duration);
}