// You will be among the first to foray into the depths of this code. We know not what horrors lurk within.

/*
 * MIDI was introduced in 1983, slightly predating the 3.5" 720 KB and 1.44 MB floppy disk formats. Storage
 * was therefore a major consideration for the designers of the MIDI format. They chose to encode certain
 * values with variable lengths to save space. This makes the logic to parse MIDI tracks more involved.
 * 
 * The delta-time value captures how much time exists between MIDI events and ranges from 0x00000000 to
 * 0x0FFFFFFF. However, rather than always using 4 bytes to encode each delta-time value, only the necessary
 * number of bytes are used. This is called a variable-length value (VLV) and is done by only using 7 of the 8
 * bits per byte and setting the most significant bit (MSB) of all bytes other than the very last one to 1.
 * That is to say, the encoded delta-time can range from 1 to 4 bytes in length and you know you're looking
 * at the last byte when the MSB of that byte is 0.
 */

/**
 * Parses variable-length value.
 * @param {number[]} byteArray Array representing the raw bytes read from MIDI file
 * @returns {number} The encoded value
 */
export default function parseVariableLengthValue(byteArray) {
    const BITS_TO_SHIFT = 7; // always 7 because variable length quantities don't use the MSB to hold value data
    return twiddle(byteArray, BITS_TO_SHIFT);
}

/**
 * Concatenates bytes together
 * @param {[number]} byteArray the byte array to concatenate
 * @param {number} bits number of bits to shift by. 7 bits for encoded delta time, 8 for a normal concatenation
 */
function twiddle(byteArray, bitsToShift) {
    let result = 0;
    const mask = calculateMask(bitsToShift);
    let hasSkippedFirstBitShift = false;

    for (let i = 0; i < byteArray.length; i++) {
        // This is an artifact from when this function handled both fixed and variable-length quantities
        // Now we only handle VLVs because duh, just interpret 4 byte fixed quantities as Uint32
        // Technically we no longer need the "! byteArray[i]" part, but it doesn't harm anything
        if (! byteArray[i] && ! hasSkippedFirstBitShift) continue;

        // don't shift the first iteration otherwise 1 byte delta-times will be incorrect
        if (hasSkippedFirstBitShift) result <<= bitsToShift;
        hasSkippedFirstBitShift = true;

        result |= byteArray[i] & mask;
    }

    return result;
}

/**
 * Returns a bitmask starting from the least significant bits.
 * bitsToMaskOn  base10  base2
 * 0             0       00000000
 * 1             1       00000001
 * 2             3       00000011
 * 3             7       00000111
 * 4             15      00001111
 * 5             31      00011111
 * 6             63      00111111
 * 7             127     01111111
 * 8             255     11111111
 * @param {number} bitsToMaskOn how many bits to mask
 * @returns {number} an 8-bit bitmask starting from the LSB
 */
function calculateMask(bitsToMaskOn) {
    if (bitsToMaskOn < 0 || bitsToMaskOn > 8) throw new Error("bitsToMaskOn must be between 0 and 8 inclusive");
    return Math.pow(2, bitsToMaskOn) - 1;
}