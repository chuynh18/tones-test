const AudioContext = window.AudioContext || window.webkitAudioContext;

export const CONSTANTS = {
   noteFade: 0.2,
   defaultVolume: 50
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
