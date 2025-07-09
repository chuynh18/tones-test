const AudioContext = window.AudioContext || window.webkitAudioContext;

export const CONSTANTS = {
   noteFade: 0.8
}

export const state = {
   mouseDown: false,
   audioContext: new AudioContext(),
   kb: undefined,
   audio: [],
   pedal: false,
   midiIndex: 0,
   rects: undefined
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