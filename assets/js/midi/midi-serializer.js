import { applicationSettings, midiConstants } from "./midi-constants.js";
import { parseTrack, postprocess } from "./track.js";
import { isMidi,
    parseBytes,
    parseDataViewSegment,
    validateMidi,
    handleSmtpe } from "./midi-utility-functions.js";

/**
 * @param {HTMLInputElement} fileSelector
 * @returns {Promise} Promise that should resolve to an object of MIDI tracks
 */
export default async function getMidi(fileSelector) {
    const file = fileSelector.files[0];
    
    const retVal = await file.arrayBuffer().then(buffer =>
        {
            if (fileSizeExceedsThreshold(file)) {
                throw new Error(`Selected file is ${file.size} bytes which is larger than the threshold of ${applicationSettings.maxFileSizeBytes} bytes.`);
            }

            const dataView = new DataView(buffer);
            const header = parseHeader(dataView);

            if (! header.isMidi) {
                const fileName = file.name;
                const fileSplit = file.name.split(".");
                const fileExtension = fileSplit.length === 1 ? "an unknown type of" : `a ${fileSplit[fileSplit.length - 1]}`;
                throw new Error(`Not a valid MIDI file. ${fileName} is ${fileExtension} file.`);
            }
        
            const tracks = parseTracks(dataView, header);
            
            if (! validateMidi(header, tracks)) {
                return;
            }

            const midi = {
                header: header,
                tracks: tracks
            };

            // ugh, ugly
            midi.header.ticksPerSecond = midi.header.division*midi.tracks[0].track[81].data.musicTempo/60;

            return midi;
        }
    );

    return retVal;
}

/**
 * Returns an object representation of the MIDI header
 * @param {DataView} dataView the DataView of an ArrayBuffer that contains the entire MIDI file
*/
export function parseHeader(dataView) {
    // MIDI format data is always at offset 8, track count at offset 10, and division at offset 12
    // yes, division is apparently the name of the unit. it specifies how to interpret the timing of the midi file
    let division = dataView.getUint16(12);
    const smtpe = handleSmtpe(division);

    if (smtpe.isSmtpe) {
        console.log("Division high bit set, now handling SMTPE values. This is untested code.");
        division = smtpe.division;
    }
    
    return {
        isMidi: isMidi(dataView),
        format: dataView.getUint16(8),
        numTracks: dataView.getUint16(10),
        division: division,
        isSmtpe: smtpe.isSmtpe // true means division is ticks per second, false means ticks per quarter note!
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
            const rawTrack = parseDataViewSegment(dataView, startingBytes, startingBytes + trackLength);
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

    tracks.forEach(track => {
        if (track.track.music.length > 0) {
            track.playableMusic = postprocess(track.track.music);
        }
    });
    
    return tracks;
}

/**
 * Returns true if input file's size is less than the set threshold
 * @param {File} file A file object from an HTMLInputElement
 * @param {number} sizeThreshold Maximum file size to parse
 */
function fileSizeExceedsThreshold(file, sizeThreshold = applicationSettings.maxFileSizeBytes) {
    return file.size > sizeThreshold;
}
