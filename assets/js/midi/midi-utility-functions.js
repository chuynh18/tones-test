import { midiConstants } from "./midi-constants.js";

export const trackMetadata = {
    // 0x00: {type: "sequence number", handler: function() {console.log("TODO")}},
    0x01: {type: "text", handler: parseText},
    0x02: {type: "copyright", handler: parseText},
    0x03: {type: "sequence/track name", handler: parseText},
    0x04: {type: "instrument", handler: parseText},
    0x05: {type: "lyric", handler: parseText},
    0x06: {type: "marker", handler: parseText},
    0x07: {type: "cue point", handler: parseText},
    0x2f: {type: "end track", handler: null},
    // 0x20: {type: "channel prefix", handler: function() {console.log("TODO")}},
    0x51: {type: "set tempo", handler: parseTempo}, // microseconds per quarter note
    // 0x54: {type: "smpte offset", handler: function() {console.log("TODO")}},
    0x58: {type: "time signature", handler: parseTimeSignature},
    0x59: {type: "key signature", handler: parseKeySignature},
    // 0x7F: {type: "sequencer-specific metadata", handler: function() {console.log("TODO")}}
};

// the 4 most significant bits
export const midiMessage = {
    0b1000: {type: "note off event", dataBytes: 2},
    0b1001: {type: "note on event", dataBytes: 2},
    0b1010: {type: "polyphonic key pressure", dataBytes: 2},
    0b1011: {type: "control change or channel mode message", dataBytes: 2},
    0b1100: {type: "program change", dataBytes: 1},
    0b1101: {type: "channel pressure", dataBytes: 1},
    0b1110: {type: "pitch wheel change", dataBytes: 2},
    0b1111: {type: "system message", lowerBytes: // lowerBytes = 4 least significant bits
        {
            0b0000: {type: "system exclusive", handler: function(trackFragment) {
                for (let i = 0; i < trackFragment.length; i++) {
                    if (trackFragment[i] === SYSTEM_EXCLUSIVE_MESSAGE_END_BYTE) {
                        return i;
                    }
                }

                throw new Error("Encountered system exclusive message but never encountered end byte 0b11110111");
            }},
            0b0001: {type: "MIDI time code quarter frame", dataBytes: 1},
            0b0010: {type: "song position pointer", dataBytes: 2},
            0b0011: {type: "song select", dataBytes: 1},
            0b0100: {type: "undefined (reserved)"},
            0b0101: {type: "undefined (reserved)"},
            0b1000: {type: "timing clock"},
            0b1001: {type: "undefined (reserved)"},
            0b1011: {type: "continue"},
            0b1100: {type: "stop"},
            0b1101: {type: "undefined (reserved)"},
            0b1110: {type: "active sensing"},
            0b1111: {type: "reset"}
        }
    }
};

const SYSTEM_EXCLUSIVE_MESSAGE_END_BYTE = 0b11110111;

// the 4 least significant bits in a control change message (that is, the 4 most significant bits are 0b1011)
export const controlChangeMessages = {
    0: {type: "bank select"},
    1: {type: "modulation wheel"},
    7: {type: "channel volume"},
    10: {type: "pan"},
    11: {type: "expression controller"},
    64: {type: "damper pedal toggle"},
    65: {type: "portamento toggle"},
    66: {type: "sostenuto toggle"},
    67: {type: "una corda toggle"},
    68: {type: "legato footswitch toggle"},
    121: {type: "reset all controllers"},
    122: {type: "local control change"},
    123: {type: "all notes off"},
    124: {type: "omni mode off"}, // causes all notes off
    125: {type: "omni mode on"}, // causes all notes off
    126: {type: "mono mode on"}, // causes all notes off, no polyphony
    127: {type: "poly mode on"} // causes all notes off
};

// the 4 least significant bits in a system message (that is, the 4 most significant bits are 0b1111)
export const systemMessages = {
    0b0010: {type: "song position pointer", dataBytes: 2},
    0b0011: {type: "song select", dataBytes: 1}
};

/**
 * True if MIDI file starts with valid "MThd" header, false otherwise.
 * @param {DataView} dataView the DataView of an ArrayBuffer that contains the entire MIDI file
*/
export function isMidi(dataView) {
    return midiConstants[parseBytes(dataView, 0, midiConstants.magicStringSize)] ? true : false;
}

// In retrospect, this function is trying to be too clever. Should instead create DataViews when needed.
/**
 * Returns an array of numbers representing the bytes of a slice of a DataView.
 * @param {DataView} dataView the DataView of an ArrayBuffer that contains the entire MIDI file
 * @param {number} startingByte starting byte number of the DataView
 * @param {number} endingByte ending byte number
*/
export function parseDataViewSegment(dataView, startingByte, endingByte) {
    const bytes = [];

    for (let i = startingByte; i < endingByte; i++) {
        bytes.push(dataView.getUint8(i));
    }

    return bytes;
}

/**
 * Returns a string from a slice of a DataView. The slice is determined by startingByte and endingByte.
 * @param {DataView} dataView the DataView of an ArrayBuffer that contains the entire MIDI file
 * @param {number} startingByte starting byte number of the DataView
 * @param {number} endingByte ending byte number
*/
export function parseBytes(dataView, startingByte, endingByte) {
    return parseDataViewSegment(dataView, startingByte, endingByte)
    .map(byte => String.fromCharCode(byte))
    .join("");
}

/**
 * @param {object} header header object returned by parseHeader()
 * @param {object} tracks tracks object returned by findTracks()
*/
export function validateMidi(header, tracks) {
    if (header.numTracks != tracks.length) {
        console.log(`Track mismatch: MIDI header declared ${header.numTracks} tracks but found ${tracks.length} tracks.`);
        return false;
    };
    if (header.format < 0 || header.format > 2) {
        console.log(`Invalid header format. Got ${header.format} but must be 0, 1, or 2`);
        return false;
    }
    return true;
}

// Division bit 15 is 1 if it's an SMPTE timing, 0 if it's ticks per quarter note
// bits 14 through 8 can hold the values: -24, -25, -29, -30
// the absolute value of those represents the framerate
// bits 7 through 0: number of delta-time units per SMPTE frame
/**
 * @param {number} division 
 * @returns {number} SMPTE timing converted to ticks per second
 */
export function handleSmpte(division) {
    const smpte = {isSmpte: false};

    if ((division >> 15) & 1) {
        smpte.isSmpte = true;

        // high is originally a 7 bit integer and it is negative. how was it originally stored?
        // do we have to mask bit 7 off?
        // Or did bit 8 serve to make high negative AND signify an SMPTE timing? if so do we have to mask bit 8 off?
        const high = (division >> 8) | 0b10000000_00000000_00000000_00000000;

        const low = division & 0b00000000_11111111;

        smpte.division = Math.abs(high) * low;
    }

    return smpte;
}

function parseText(array) {
    return array.map(element => String.fromCharCode(element)).join("");
}

function parseTempo(array) {
    const MICROSECONDS_PER_SECOND = 1_000_000;
    const SECONDS_PER_MINUTE = 60;
    
    let result = 0;

    for (let i = 0; i < array.length; i++) {
        result |= array[i];

        if (i < array.length - 1) {
            result <<= 8;
        }
    }

    return {
        midiTempo: result,
        musicTempo: MICROSECONDS_PER_SECOND / result * SECONDS_PER_MINUTE
    };
}

function parseTimeSignature(array) {
    return {
        numerator: array[0],
        denominator: Math.pow(2, array[1]),
        clocksPerBeat: array[2],
        notated32ndNotesPerQuarterNote: array[3]
    };
}

function parseKeySignature(array) {
    return {
        key: array[0],
        minorKey: array[1]
    }
}