import { midiConstants } from "./midi-constants.js";
import { parseTrack, postprocess } from "./track.js";
import { isMidi,
    parseBytes,
    parseDataViewSegment,
    validateMidi,
    handleSmpte } from "./midi-utility-functions.js";

/**
 * 
 * @param {ArrayBuffer} buffer midi file as an ArrayBuffer
 * @returns {Object} midi object
 */
export default function parseMidiArrayBuffer(buffer) {
    const dataView = new DataView(buffer);
    const header = parseHeader(dataView);

    if (! header.isMidi) {
        throw new Error(`File is either corrupted or not a valid MIDI file.`);
    }

    const tracks = parseTracks(dataView, header);
    
    if (! validateMidi(header, tracks)) {
        return;
    }

    const midi = {
        header: header,
        tracks: tracks
    };

    // hardcode tempo for now if midi file doesn't encode tempo in the standard way
    midi.header.ticksPerSecond = 512;
    if (midi.tracks[0].track[81]) {
        midi.header.ticksPerSecond = midi.header.division * midi.tracks[0].track[81].data.musicTempo / 60;
    } else {
        console.log("Warning: MIDI file declares tempo in non-standard way. Using hardcoded tempo.");
    }

    return midi;
}

/**
 * Returns an object representation of the MIDI header
 * @param {DataView} dataView the DataView of an ArrayBuffer that contains the entire MIDI file
*/
export function parseHeader(dataView) {
    // MIDI format data is always at offset 8, track count at offset 10, and division at offset 12
    // yes, division is apparently the name of the unit. it specifies how to interpret the timing of the midi file
    let division = dataView.getUint16(12);
    const smpte = handleSmpte(division);

    if (smpte.isSmpte) {
        console.log("Division high bit set, now handling SMPTE values. This is untested code.");
        division = smpte.division;
    }
    
    return {
        isMidi: isMidi(dataView),
        format: dataView.getUint16(8),
        numTracks: dataView.getUint16(10),
        division: division,
        isSmpte: smpte.isSmpte // true means division is ticks per second, false means ticks per quarter note!
    };
}

/**
 * Returns an object that is a representation of the tracks of a MIDI file.
 * @param {DataView} dataView 
 * @param {object} header header object from parseHeader()
 * @returns {object}
 */
function parseTracks(dataView, header) {
    const tracks = [];
    const midiFormatType = header.format;

    for (let i = 0; i < dataView.byteLength - 4; i++) {
        let magicString = parseBytes(dataView, i, i + midiConstants.magicStringSize);

        if (midiConstants[magicString] === midiConstants.MTrk) {
            const trackLength = dataView.getUint32(i + midiConstants.magicStringSize);
            const startingBytes = i + midiConstants.trackHeaderAndLengthSize;
            const offset = startingBytes + trackLength < dataView.byteLength ? startingBytes + trackLength : dataView.byteLength;
            const rawTrack = parseDataViewSegment(dataView, startingBytes, offset);
            const parsedTrack = parseTrack(rawTrack, tracks.length, midiFormatType);

            tracks.push({
                metadata: {
                    startingBytes: i + startingBytes,
                    trackLength: trackLength
                },
                track: parsedTrack || rawTrack,
            });

            i += trackLength;
        }
    }

    const earliestFirstNoteTime = getEarliestFirstNote(tracks);

    tracks.forEach(track => {
        if (track.track.music.length > 0) {
            const postprocessed = postprocess(track.track.music, earliestFirstNoteTime);
            track.playableMusic = postprocessed.music;
            track.startTime = postprocessed.startTime;
            track.endTime = postprocessed.endTime;
        }
    });
    
    return tracks;
}

function getEarliestFirstNote(tracks) {
    console.log(tracks);
    const firstNoteTimes = tracks.map(track => {
        let time = 0;
        for (let i = 0; i < track.track.music.length; i++) {
            const event = track.track.music[i];

            if (event.type === "note on event" && event.velocity > 0 && event.pianoNote > 0 && event.pianoNote <= 88) {
                time += event.time;
                console.log("start time found at index", i, "and elapsed time", time);
                console.log("the event that triggered start:", event);
                return time;
            }

            time += event.time;
        }

        return Infinity;
    });

    const firstNoteTime = Math.min(...firstNoteTimes);

    return firstNoteTime === Infinity ? 0 : firstNoteTime;
}
