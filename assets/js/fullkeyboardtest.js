"use strict";

let state = {
   kb: undefined,
   audio: []
};

window.addEventListener("load", function() {
   state.kb = document.getElementById("kb").getSVGDocument();

   const rects = state.kb.getElementsByTagName("rect");

   for (let i = 0; i < rects.length; i++) {
      preload(`assets/audio/${i + 1}.webm`, state.audio);

      const key = rects[i];

      console.log(key)

      key.addEventListener("mousedown", function() {
         key.style.fill = "red";
         state.audio[i].play();
      });

      key.addEventListener("mouseup", function() {
         key.style.fill = key.dataset.fill;
         state.audio[i].pause();
         state.audio[i].currentTime = 0;
      });

      key.addEventListener("mouseout", function() {
         key.style.fill = key.dataset.fill;
         state.audio[i].pause();
         state.audio[i].currentTime = 0;
      });
   }
});

function preload(url, dest) {
   const audio = new Audio();
   audio.src = url;

   if (typeof dest !== "undefined") {
      dest.push(audio);
   }
}