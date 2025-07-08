"use strict";

import parseVaribleLengthQuantity from "./midi/parse-quantity.js";

// test parseVaribleLengthQuantity() correctly parses MIDI event delta-time VLQs
const vlq = [
    {bytes: [0], value: 0},
    {bytes: [129,0], value: 128},
    {bytes: [192,0], value: 8192},
    {bytes: [255,255,127], value: 2097151},
    {bytes: [192,128,128,0], value: 134217728},
    {bytes: [255,255,255,127], value: 268435455}
];

function vlqTest(vlqObj) {
    console.log(`Testing ${vlqObj.bytes} === expected value ${vlqObj.value}. Test passed: ${parseVaribleLengthQuantity(vlqObj.bytes) === vlqObj.value}`);
}

vlq.forEach(obj => vlqTest(obj));
// end VLQ tests