"use strict";

let kb;
let audio;
let gain;
let note;

window.addEventListener("load", function() {
   kb = document.getElementById("kb").getSVGDocument();

   const rects = kb.getElementsByTagName("rect");

   for (let i = 0; i < rects.length; i++) {
      const key = rects[i];

      key.addEventListener("mousedown", function() {
         key.style.fill = "red";

         const pitch = calcPitch(Number(key.dataset.note));
         playSine(pitch);
      });

      key.addEventListener("mouseup", function() {
         key.style.fill = key.dataset.fill;
         gain.gain.linearRampToValueAtTime(0.000001, audio.currentTime + 0.5);

         setTimeout(() => {
            note.stop();
         }, 500);  
      });

      key.addEventListener("mouseout", function() {
         key.style.fill = key.dataset.fill;
         gain.gain.linearRampToValueAtTime(0.000001, audio.currentTime + 0.5);

         setTimeout(() => {
            note.stop();
         }, 500);  
      });
   }

});

function playSine(freq) {
   const audioContext = new AudioContext();
   const gainNode = audioContext.createGain();
   const oscillator = audioContext.createOscillator();

   audio = audioContext;
   gain = gainNode;
   note = oscillator;
   
   oscillator.connect(gainNode);
   gainNode.connect(audioContext.destination);

   oscillator.type = "sine";
   oscillator.frequency.value = freq;
   oscillator.start()

   gainNode.gain.linearRampToValueAtTime(0.000001, audioContext.currentTime + 3);

}

function calcPitch(keyNum) {
   const KEY_NUM_OF_CONCERT_A = 49;
   const KEYS_PER_OCTAVE = 12;
   const CONCERT_A_FREQ = 440;

   const exponent = (keyNum - KEY_NUM_OF_CONCERT_A) / KEYS_PER_OCTAVE;

   return CONCERT_A_FREQ * Math.pow(2, exponent);
}