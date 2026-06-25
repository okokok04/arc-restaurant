import { readFileSync, writeFileSync } from 'fs';

const wasmPath = './target/wasm32-unknown-unknown/release/restaurant_contract.wasm';
let buffer = readFileSync(wasmPath);

console.log('Original size:', buffer.length);

// We look for the pattern 11 80 80 80 80 00 and replace it with 11 00 00
// Actually, call_indirect is 0x11 followed by type index (LEB128) and table index (0x00).
// The validator says "zero byte expected" at 8743. 
// If 8743 is 0x11, then the validator is looking at the NEXT byte.

// Let's try a broad replacement of padded LEB128 if they are zero.
let searchBuf = Buffer.from([0x11, 0x80, 0x80, 0x80, 0x80, 0x00]);
let count = 0;
let pos = 0;

while ((pos = buffer.indexOf(searchBuf, pos)) !== -1) {
    console.log(`Found padded call_indirect at ${pos}. Compressing...`);
    // 11 80 80 80 80 00 (6 bytes) -> 11 00 00 (3 bytes)
    const head = buffer.subarray(0, pos + 1); // 11
    const zeroes = Buffer.from([0x00, 0x00]); // type index 0, table index 0
    const tail = buffer.subarray(pos + 6);
    buffer = Buffer.concat([head, zeroes, tail]);
    count++;
    pos += 3; // move past new 11 00 00
}

writeFileSync(wasmPath, buffer);
console.log(`Patched ${count} occurrences.`);
