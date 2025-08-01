const AudioContext = window.AudioContext || window.webkitAudioContext;

export const CONSTANTS = {
   noteFade: 0.2,
   defaultVolume: 50,
   maximumNoteVelocity: 127
}

export const state = {
   mouseDown: false,
   audioContext: new AudioContext(),
   audio: [], // holds all decoded audio resources
   bufferSources: [], // holds all actively playing AudioBufferSourceNodes
   pedal: false, // damper pedal state
   unaCorda: false, // soft pedal
   midiIndex: 0, // the index of the last midi event processed
   rects: undefined, // stores references to all SVG rects at page load time (so it should just be the 88 keys)
   player: [], // holds all setTimeouts so that we can destroy them all on pause/stop
   volume: 1, // volume multiplier
   longestTrackIndex: 0,
   midi: undefined, // object that contains representation of music (originally MIDI deserialized by midijs)
   currentlyHeldDownKeys: [], // track keys being held down so damper pedal does not end their sound
   visualizerRects: [], // rects drawn when piano is being played manually so we can destroy them when a note ends
   cache: {} // cache deserialized music from XMLHttpRequest
};

// these are HSL values... except we won't use L
export const colors = [
   [0, 100, 50],
   [240, 100, 50],
   [120, 100, 50],
   [60, 100, 50],
   [180, 100, 50],
   [300, 100, 50],
   [30, 100, 50],
   [90, 100, 50],
   [150, 100, 50],
   [210, 100, 50],
   [270, 100, 50],
   [330, 100, 50],
   [15, 100, 50],
   [45, 100, 50],
   [75, 100, 50],
   [105, 100, 50],
   [135, 100, 50],
   [165, 100, 50],
   [195, 100, 50],
   [225, 100, 50],
   [255, 100, 50],
   [285, 100, 50],
   [315, 100, 50],
   [345, 100, 50]
];

export const keyReference = {};
