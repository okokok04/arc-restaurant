import { readFileSync, writeFileSync } from 'fs';

const wasmPath = './target/wasm32-unknown-unknown/release/restaurant_contract.wasm';
const buffer = readFileSync(wasmPath);

console.log('Original size:', buffer.length);

let pos = 8;
const newBuffer = Buffer.alloc(buffer.length);
buffer.copy(newBuffer, 0, 0, 8);
let newPos = 8;

while (pos < buffer.length) {
    const sectionId = buffer[pos++];
    
    let size = 0;
    let shift = 0;
    let byte;
    let lebPos = pos;
    do {
        byte = buffer[pos++];
        size |= (byte & 0x7F) << shift;
        shift += 7;
    } while (byte & 0x80);

    if (sectionId === 0) {
        // Read custom section name
        let nameLen = 0;
        let nameShift = 0;
        let nameByte;
        let namePos = pos;
        do {
            nameByte = buffer[namePos++];
            nameLen |= (nameByte & 0x7F) << nameShift;
            nameShift += 7;
        } while (nameByte & 0x80);
        
        const name = buffer.toString('utf8', namePos, namePos + nameLen);
        console.log(`Checking custom section: ${name} (size ${size})`);

        if (name === 'producers' || name === 'target_features') {
            console.log(`Stripping problematic section: ${name}`);
            pos += size;
            continue;
        }
    }

    // Keep the section
    newBuffer[newPos++] = sectionId;
    let tempSize = size;
    do {
        let b = tempSize & 0x7F;
        tempSize >>= 7;
        if (tempSize !== 0) b |= 0x80;
        newBuffer[newPos++] = b;
    } while (tempSize !== 0);
    
    buffer.copy(newBuffer, newPos, pos, pos + size);
    newPos += size;
    pos += size;
}

const finalBuffer = newBuffer.subarray(0, newPos);
writeFileSync(wasmPath, finalBuffer);
console.log('Final size:', finalBuffer.length);
console.log('--- Selective Surgery Complete ---');
