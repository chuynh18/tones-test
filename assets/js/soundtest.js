"use strict";

function playSine(freq, duration) {
   const beginFadeTime = duration - 700;

   const audioContext = new AudioContext();
   const gainNode = audioContext.createGain();
   const oscillator = audioContext.createOscillator();
   
   oscillator.connect(gainNode);
   gainNode.connect(audioContext.destination);

   
   setTimeout(function() {
      gainNode.gain.linearRampToValueAtTime(0.000001, audioContext.currentTime + 0.7);
   }, beginFadeTime);

   oscillator.type = "sine";
   oscillator.frequency.value = freq;
   oscillator.start()

   setTimeout(function() {
      oscillator.stop();
   }, duration);
}

function play() {
   for (let i = 0; i < 4; i++) {
      setTimeout(function() {
         playSine(100 * (i + 1), 1000);
         playSine(100 * (i + 2), 1000);
      }, 1000 * i);
   }
}