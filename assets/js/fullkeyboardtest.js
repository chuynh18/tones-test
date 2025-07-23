import { state, keyReference, CONSTANTS } from "./piano/resources.js"
import parseMidiArrayBuffer from "./midi/midi-serializer.js";
import {
   startPlayer,
   startPlaying,
   stopPlaying,
   setPedal,
   pausePlaying,
   stopMidiPlaying,
   userMovesSeekBar
} from "./piano/pianoPlayer.js";
import { setReferencesToElements, resizeVisualizerCanvas } from "./visualizer/visualizer.js";

window.addEventListener("load", function() {
   const keyboardElement = document.getElementById("kb");
   const keyboard = keyboardElement.getSVGDocument();
   const visualizer = document.getElementById("visualizer");
   state.rects = keyboard.getElementsByTagName("rect");

   setReferencesToElements(keyboardElement, visualizer);

   keyboard.addEventListener("click", function() {
      state.audioContext.resume().then(() => {
         console.log("AudioContext is now active.");
      });
   }, {once: true});

   keyboard.addEventListener("pointerdown", function() {
      state.mouseDown = true;
   });

   keyboard.addEventListener("pointerup", function() {
      state.mouseDown = false;
   });

   // attach event listeners to each key of the piano
   for (let i = 0; i < state.rects.length; i++) {
      preload(`assets/audio/samples/${Number(state.rects[i].id)}.mp3`, i);

      // I think I assigned IDs in the piano keyboard SVG in the proper order, but I defined all the white keys first
      // then I defined all the black keys. So when iterating through the SVG rects, the white keys are indexed first
      // then the black keys are indexed next. I use this object to reconcile the numbering differences.
      keyReference[state.rects[i].id] = i;

      state.rects[i].addEventListener("pointerdown", function() {
         startPlaying(i, state.rects[i]);
         console.log("pointer down", i);
      });

      state.rects[i].addEventListener("pointerup", function() {
         stopPlaying(i, state.rects[i]);
         console.log("pointer up", i);
      });

      state.rects[i].addEventListener("pointercancel", function() {
         console.log("pointer cancel");
      });

      state.rects[i].addEventListener("mouseenter", function() {
         if (state.mouseDown) {
            startPlaying(i, state.rects[i]);
            console.log("mouse enter", i);
         }
      });

      state.rects[i].addEventListener("mouseleave", function() {
         if (state.mouseDown) {
            stopPlaying(i, state.rects[i]);
            console.log("mouse leave", i);
         }
      });
   
      state.bufferSources[i] = []; // place empty arrays into bufferSources array
      state.visualizerRects[i] = []; // same as above
   }

   document.getElementById("damper").addEventListener("click", togglePedal);
   document.getElementById("playMidi").addEventListener("click", playMidi);
   document.getElementById("pauseMidi").addEventListener("click", pausePlaying);
   document.getElementById("stopMidi").addEventListener("click", stopMidiPlaying);
   document.getElementById("volume").addEventListener("pointerup", setVolume);

   const fileInput = document.getElementById("midi");
   
   fileInput.addEventListener("change", () => {
      decideBasedOnFileExtension(fileInput);
   });

   document.getElementById("music").addEventListener("change", () => {
      clearFileSelector();
      retrieveMidi(document.getElementById("music").value);
   });

   document.getElementById("seekBar").addEventListener("change", userMovesSeekBar);

   window.addEventListener('resize', function() {
      resizeVisualizerCanvas();
   }, true);

   resizeVisualizerCanvas(keyboardElement, visualizer);
});

function decideBasedOnFileExtension(fileInput) {
   const fileNameArray = fileInput.value.split(".");
   const fileExtension = fileNameArray[fileNameArray.length - 1];

   switch(fileExtension) {
      case "mid":
      case "midi":
         getMidi(fileInput)
         .then(result => {
            console.log(result);
            state.midi = result;
            clearMusicLibrarySelector();
         })
         .catch(error => console.log(error));
         break;
      default:
         throw new Error("Unable to determine filetype based on file name.");
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

/**
 * @param {HTMLInputElement} fileSelector
 * @returns {Promise} Promise that should resolve to an object of MIDI tracks
 */
async function getMidi(fileSelector) {
    const file = fileSelector.files[0];
    
    const retVal = await file.arrayBuffer().then(buffer => parseMidiArrayBuffer(buffer));
    return retVal;
}

function togglePedal() {
   state.pedal ? setPedal(false) : setPedal(true);
}

// plays currently selected MIDI which is stored in state.midi (see startPlayer function)
function playMidi() {
   if (state.player.length > 0) return; // NO CHAOS (prevent kicking off playback multiple times)

   // partial workaround for the browser not cleanly resetting the page state upon cached page refresh
   if (! state.midi && document.getElementById("music").value) {
      state.midiIndex = 0
      retrieveMidi(
         document.getElementById("music").value,
         function() {
            startPlayer(state.midiIndex);
         }
      );

      return;
   }

   state.midiIndex = Number(document.getElementById("seekBar").value);
   startPlayer(Number(state.midiIndex));
}

function setVolume() {
   state.volume = Number(document.getElementById("volume").value) / CONSTANTS.defaultVolume;
}

function clearFileSelector() {
   document.getElementById("midi").value ="";
}

function clearMusicLibrarySelector() {
   document.getElementById("music").value = "";
}

function retrieveMidi(file, callback) {
   if (! file) return;
   const url = `assets/audio/midi/${file}.mid`;
   const req = new XMLHttpRequest;
   req.open("GET", url, true);
   req.responseType = 'arraybuffer';

   req.onload = function() {
      state.midi = parseMidiArrayBuffer(req.response);
      console.log(state.midi);
      if (typeof callback === "function") callback();
   }

   req.send();
}
