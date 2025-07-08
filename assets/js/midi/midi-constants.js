"use strict";

export const applicationSettings = {
    maxFileSizeBytes: 5*1024*1024 // maximum file size to parse
};

export const midiConstants = {
    MThd: "Header", // MIDI headers start at the magic string "MThd"
    MTrk: "Track", // tracks start at the magic string "MTrk"
    magicStringSize: 4, // magic strings are always 4 bytes
    headerSize: 14, // MIDI headers are 14 bytes
    trackHeaderAndLengthSize: 8, // MIDI track header is 4 bytes + length of track is also 4 bytes
    trackMetaDataStartingByte: 0xFF
};
