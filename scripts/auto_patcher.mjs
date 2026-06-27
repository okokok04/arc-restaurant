import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const wasmPath = './target/wasm32-unknown-unknown/release/restaurant_contract.wasm';

function patchFile(offset) {
    const buffer = readFileSync(wasmPath);
    console.log(`Patching offset ${offset} (current byte: ${buffer[offset]})`);
    buffer[offset] = 0;
    writeFileSync(wasmPath, buffer);
}

function run() {
    for (let i = 0; i < 50; i++) { // Max 50 patches
        console.log(`--- Attempt ${i + 1} ---`);
        try {
            const output = execSync('node scripts/deploy_auto.mjs', { encoding: 'utf8' });
            console.log(output);
            console.log('SUCCESS!');
            return;
        } catch (err) {
            const out = err.stdout || err.stderr;
            console.log(out);
            const match = out.match(/offset: (\d+)/);
            if (match) {
                const offset = parseInt(match[1]);
                patchFile(offset);
            } else {
                console.error('No offset found in error message.');
                break;
            }
        }
    }
}

run();
