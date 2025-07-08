import { midiConstants } from "./midi-constants.js";
import { trackMetadata, midiMessage } from "./midi-utility-functions.js";
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
                
                // intentional null handler for midi track end event
                if (! trackMetadata[metaEvent].handler) break;

                parsedTrack[metaEvent] = {
                    type: trackMetadata[metaEvent].type,

                    // skip 3 bytes: first byte is 0xFF, 2nd is the metadata type, 3rd is the message length
                    data: trackMetadata[metaEvent].handler(track.slice(i+3, i + messageLength + 3))
                };

                i += messageLength;
            } else {
                parsedTrack[tempArray[0]] = Array.from(tempArray.slice(1)); // TODO: probably dead or at least invalid code
            }

        tempArray.length = 0;

        } else if (track[i] < 128 && track[i+1] != 0xFF) { // encountered delta-time stamp, process it and then handle the following midi event
            const timeArray = tempArray.concat(track[i]);
            tempArray.length = 0;
            const time = parseVariableLengthValue(timeArray);
            const dataIndexStart = i + 1;
            const potentialMidiMessage = track[dataIndexStart] >> 4;
            
            // check next byte for midi event
            if (midiMessage[potentialMidiMessage]) {
                const dataIndexEnd = dataIndexStart + midiMessage[potentialMidiMessage].dataBytes + 1;
                runningStatus = midiMessage[potentialMidiMessage];

                parsedTrack.music.push(
                    createMessage(track, runningStatus.type, time, dataIndexStart, dataIndexEnd)
                );

                i += midiMessage[potentialMidiMessage].dataBytes + 1;
            } else if (runningStatus && i < track.length - 1) {
                // For consecutive events of the same type, MIDI might not explicitly include the event byte
                // we need to keep track of the last event and reuse it
                const dataIndexEnd = dataIndexStart + runningStatus.dataBytes + 1;

                parsedTrack.music.push(
                    createMessage(track, runningStatus.type, time, dataIndexStart - 1, dataIndexEnd - 1)
                );

                i+= runningStatus.dataBytes;
            }
            
        } else { // don't yet know what this data is, temporarily store it as we might find out what it is later
            tempArray.push(track[i]);
        }
    }

    return parsedTrack;
}

function createMessage(track, messageType, time, dataIndexStart, dataIndexEnd) {
    const data = track.slice(dataIndexStart + 1, dataIndexEnd);
    const note = resolveNote(data);

    const midiEvent = {
        time: time,
        type: messageType,
        index: dataIndexStart
    };

    if (messageType === midiMessage[0b1000].type || messageType === midiMessage[0b1001].type) {
        midiEvent.midiNote = note.midiNote;
        midiEvent.pianoNote = note.pianoNote;
        midiEvent.velocity = note.velocity;
    } else {
        midiEvent.data = data;
    }

    return midiEvent;
}

function resolveNote(data) {
    return {
        midiNote: data[0],
        pianoNote: data[0] - 20,
        velocity: data[1]
    };
}

// naively written with the assumption that every note being played will be commanded to cease being played
export function postprocess(parsedTrack) {
    const currentlyPlaying = {};
    const postprocessed = [];
    let runningTime = 0;

    for (let i = 0; i < parsedTrack.length; i++) {
        const currentCommand = parsedTrack[i];
        runningTime += currentCommand.time;

        if ((currentCommand.type === midiMessage[0b1001].type &&
            currentCommand.velocity === 0) ||
            currentCommand.type === midiMessage[0b1000].type
        ) {
            // a note is being stopped
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
            // this is naive, we'll eventually handle the damper pedal here
            currentCommand.startTime = runningTime;
            postprocessed.push(currentCommand);
        }
    }

    return postprocessed.sort((a,b) => a.startTime - b.startTime);
}