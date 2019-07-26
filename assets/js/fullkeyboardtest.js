"use strict";

let state = {
   kb: undefined,
   audio: []
};

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();

   const rects = state.kb.getElementsByTagName("rect");

   for (let i = 0; i < rects.length; i++) {
      const key = rects[i];

      preload(`assets/audio/${Number(key.id)}.webm`, state.audio);

      key.addEventListener("mousedown", function() {
         startPlaying(i, key);
      });

      key.addEventListener("mouseup", function() {
         stopPlaying(i, key);
      });

      key.addEventListener("mouseout", function() {
         stopPlaying(i, key);
      });
   }
});

function startPlaying(i, key) {
   key.style.fill = "red";
   state.audio[i].play();
}

function stopPlaying(i, key) {
   key.style.fill = key.dataset.fill;
   state.audio[i].pause();
   state.audio[i].currentTime = 0;
}

function preload(url, dest) {
   const audio = new Audio();
   audio.src = url;

   if (typeof dest !== "undefined") {
      dest.push(audio);
   }
}