const AudioContext = window.AudioContext || window.webkitAudioContext;

export const CONSTANTS = {
   noteFade: 0.8
}

export const state = {
   mouseDown: false,
   audioContext: new AudioContext(),
   kb: undefined,
   audio: [], // holds all decoded audio resources
   pedal: false, // damper pedal state
   midiIndex: 0, // the index of the last midi event processed
   rects: undefined,
   player: [], // holds all setTimeouts so that we can destroy them all on pause/stop
   volume: 1, // volume multiplier
   longestTrackIndex: 0,
   midi: undefined
};

// probably don't need 16 colors but just in case... cause I'm not guarding against bad access =)
export const colors = [
   "Red",
   "Blue",
   "Green",
   "GoldenRod",
   "Orchid",
   "Aqua",
   "AliceBlue",
   "BlanchedAlmond",
   "Brown",
   "DodgerBlue",
   "FireBrick",
   "LightCoral",
   "Navy",
   "PapayaWhip",
   "SaddleBrown",
   "SeaGreen"
];

export const keyReference = {};