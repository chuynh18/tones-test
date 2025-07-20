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
   rects: undefined,
   player: [], // holds all setTimeouts so that we can destroy them all on pause/stop
   volume: 1, // volume multiplier
   longestTrackIndex: 0,
   midi: undefined, // object that contains representation of music (originally MIDI deserialized by midijs)
   currentlyHeldDownKeys: []
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
   [330, 100, 50]
];

export const keyReference = {};
