import { midiConstants } from "./midi-constants.js";
import { trackMetadata, midiMessage, controlChangeMessages } from "./midi-utility-functions.js";
import parseVariableLengthValue from "./parse-quantity.js";

/**
 * 
 * @param {Array} track 
 */
export function parseTrack(track) {
    let runningStatus;
    const tempArray = [];
    const parsedTrack = {
        music: []
    };

    for (let i = 0; i < track.length; i++) {
        // handle metadata event
        if (track[i] === midiConstants.trackMetaDataStartingByte && trackMetadata[track[i+1]]) {
            const metaEvent = track[i+1];
            const messageLength = track[i+2];

            if (trackMetadata[metaEvent]) {
                // I intentionally set a null handler for MIDI end of track event. break out of the loop
                if (! trackMetadata[metaEvent].handler) break;

                parsedTrack[metaEvent] = {
                    type: trackMetadata[metaEvent].type,

                    // skip 3 bytes: first byte is 0xFF, 2nd is the metadata type, 3rd is the message length
                    data: trackMetadata[metaEvent].handler(track.slice(i+3, i + messageLength + 3))
                };

                i += messageLength;
            } else {
                // if we don't recognize the metadata type, just insert the raw bytes
                // the key is the first byte which should correspond to the MIDI metadata type
                // the value is the rest of the array which should be the metadata (but undecoded, of course)
                parsedTrack[tempArray[0]] = Array.from(tempArray.slice(1)); // TODO: probably dead or at least invalid code
            }

        tempArray.length = 0;

        // encountered end of delta-time stamp, process variable-length value (VLV) and then handle the following midi event
        } else if (track[i] < 128 && track[i+1] != 0xFF) {
            const timeArray = tempArray.concat(track[i]);
            tempArray.length = 0;
            const time = parseVariableLengthValue(timeArray);
            const dataIndexStart = i + 1;
            const potentialMidiMessage = track[dataIndexStart] >> 4;
            
            // the next byte after the delta-time VLV is a MIDI event
            if (midiMessage[potentialMidiMessage]) {
                const dataIndexEnd = dataIndexStart + midiMessage[potentialMidiMessage].dataBytes + 1;
                runningStatus = midiMessage[potentialMidiMessage];

                parsedTrack.music.push(
                    createMessage(track, runningStatus.type, time, dataIndexStart, dataIndexEnd)
                );

                i += midiMessage[potentialMidiMessage].dataBytes + 1;
            
            // For consecutive events of the same type, MIDI might not explicitly include the event byte
            // we need to keep track of the last event and reuse it
            } else if (runningStatus && i < track.length - 1) {
                const dataIndexEnd = dataIndexStart + runningStatus.dataBytes + 1;

                parsedTrack.music.push(
                    createMessage(track, runningStatus.type, time, dataIndexStart - 1, dataIndexEnd - 1)
                );

                i+= runningStatus.dataBytes;
            }
            
        // we haven't gotten enough bytes to identify the MIDI data yet
        // temporarily store because we likely just need to decode a few more bytes
        } else { 
            tempArray.push(track[i]);
        }
    }

    return parsedTrack;
}

function createMessage(track, messageType, time, dataIndexStart, dataIndexEnd) {
    const data = track.slice(dataIndexStart + 1, dataIndexEnd);

    const midiEvent = {
        time: time,
        type: messageType,
        index: dataIndexStart
    };

    switch(messageType) {
        case midiMessage[0b1000].type:
        case midiMessage[0b1001].type:
            const note = resolveNote(data);
            midiEvent.midiNote = note.midiNote;
            midiEvent.pianoNote = note.pianoNote;
            midiEvent.velocity = note.velocity;
            break;
        case midiMessage[0b1011].type:
            const controlChange = handleControlChangeMessage(data);
            midiEvent.controlChangeType = controlChange.controlChangeType;
            midiEvent.controlChangeValue = controlChange.value;
            break;
        default:
            midiEvent.data = data;
    }

    return midiEvent;
}

function handleControlChangeMessage(data) {
    if (controlChangeMessages[data[0]]) {
        return {
            controlChangeType: controlChangeMessages[data[0]].type,
            value: data[1]
        };
    } else {
        console.log("Unhandled control change message. Raw data:");
        console.log(data);
    }
    
}

function resolveNote(data) {
    return {
        midiNote: data[0],
        pianoNote: data[0] - 20, // the piano key number is simply 20 lower than the midi note number
        velocity: data[1]
    };
}

export function postprocess(parsedTrack) {
    const currentlyPlaying = {};
    const postprocessed = [];
    let runningTime = 0;

    for (let i = 0; i < parsedTrack.length; i++) {
        const currentCommand = parsedTrack[i];
        runningTime += currentCommand.time;

        // a note is being stopped
        if ((currentCommand.type === midiMessage[0b1001].type &&
            currentCommand.velocity === 0) ||
            currentCommand.type === midiMessage[0b1000].type
        ) {
            if (! currentlyPlaying[currentCommand.midiNote]) continue; // discard spurious note off events

            const postProcessedNote = {
                midiNote: currentCommand.midiNote,
                pianoNote: currentCommand.pianoNote,
                velocity: currentlyPlaying[currentCommand.midiNote].velocity,
                startTime: currentlyPlaying[currentCommand.midiNote].startTime,
                duration: runningTime - currentlyPlaying[currentCommand.midiNote].startTime,
                type: currentlyPlaying[currentCommand.midiNote].type
            };

            postprocessed.push(postProcessedNote);
            delete currentlyPlaying[currentCommand.midiNote];
        } else if (currentCommand.type === midiMessage[0b1001].type) {
            // a note is being started, track it in the currentlyPlaying object
            currentCommand.startTime = runningTime;
            currentlyPlaying[currentCommand.midiNote] = currentCommand;
        } else {
            // just pass the command on as-is if it's not a note on or note off event
            currentCommand.startTime = runningTime;
            postprocessed.push(currentCommand);
        }
    }

    let lastNote;

    for (let i = postprocessed.length - 1; i > 0; i--) {
        if (postprocessed[i].pianoNote) {
            lastNote = postprocessed[i];
            break;
        }
    }

    let lastNoteDuration = 0;
    if (lastNote.duration) {
        lastNoteDuration = lastNote.duration;
    }

    return {
        music: postprocessed.sort((a,b) => a.startTime - b.startTime),
        startTime: postprocessed[0].startTime,
        endTime: lastNote.startTime + lastNoteDuration
    };
}