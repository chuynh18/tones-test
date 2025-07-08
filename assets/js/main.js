"use strict";

import getMidi from "./midi/midi-serializer.js";

const fileInput = document.getElementById("midi");

fileInput.addEventListener("change", () => {
    getMidi(fileInput)
        .then(result => {
            console.log(result);
            globalThis.midiFile = result; // if you want to make it available in the global scope
        })
        .catch(error => console.log(error));
});
