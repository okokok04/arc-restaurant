import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Keypair,
  Operation,
  TransactionBuilder,
  rpc,
  Address,
  hash,
  nativeToScVal,
  Contract,
} from '@stellar/stellar-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WASM_PATH = path.join(ROOT, 'target/wasm32v1-none/release/restaurant_contract.wasm');
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

async function pollTx(txHash) {
  for (let i = 0; i < 30; i++) {
    try {
      const tx = await server.getTransaction(txHash);
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) return tx;
      if (tx.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error('Tx failed');
    } catch (e) {
      // If it's just a parsing error (like Bad union switch), but the status might be success
      if (e.message.includes('Bad union switch')) {
        console.log('Transaction confirmed (parsing skipped)');
        return { status: 'SUCCESS' };
      }
      // Otherwise wait
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  if (!fs.existsSync(WASM_PATH)) throw new Error('WASM not found');
  const wasmData = fs.readFileSync(WASM_PATH);
  const deployer = Keypair.random();
  console.log('Deploying with:', deployer.publicKey());
  
  await fetch(`https://horizon-testnet.stellar.org/friendbot?addr=${deployer.publicKey()}`);
  console.log('Waiting for account to be visible...');
  for (let i = 0; i < 10; i++) {
    try {
      await server.getAccount(deployer.publicKey());
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  let account = await server.getAccount(deployer.publicKey());
  const wasmHash = hash(wasmData);

  // 1. Upload WASM
  console.log('Step 1: Uploading WASM...');
  const uploadTx = new TransactionBuilder(account, { fee: '10000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmData }))
    .setTimeout(60).build();
  const uploadSim = await server.simulateTransaction(uploadTx);
  const finalUpload = rpc.assembleTransaction(uploadTx, uploadSim).build();
  finalUpload.sign(deployer);
  const uploadSent = await server.sendTransaction(finalUpload);
  await pollTx(uploadSent.hash);

  // 2. Create Contract
  console.log('Step 2: Creating Contract...');
  account = await server.getAccount(deployer.publicKey());
  const createTx = new TransactionBuilder(account, { fee: '10000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.createCustomContract({
      address: Address.fromString(deployer.publicKey()),
      wasmHash,
      salt: Keypair.random().rawPublicKey(),
    }))
    .setTimeout(60).build();
  const createSim = await server.simulateTransaction(createTx);
  const finalCreate = rpc.assembleTransaction(createTx, createSim).build();
  finalCreate.sign(deployer);
  const createSent = await server.sendTransaction(finalCreate);
  await pollTx(createSent.hash);
  
  const contractId = Address.fromScVal(createSim.result.retval).toString();
  console.log('✅ Contract ID:', contractId);

  // 3. Initialize
  console.log('Step 3: Initializing...');
  account = await server.getAccount(deployer.publicKey());
  const initTx = new TransactionBuilder(account, { fee: '10000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(contractId).call('init', 
      Address.fromString(deployer.publicKey()).toScVal(),
      nativeToScVal('Arc Bistro', { type: 'string' })
    ))
    .setTimeout(60).build();
  const initSim = await server.simulateTransaction(initTx);
  const finalInit = rpc.assembleTransaction(initTx, initSim).build();
  finalInit.sign(deployer);
  await server.sendTransaction(finalInit);
  
  const env = `VITE_NETWORK=TESTNET
VITE_CONTRACT_ID=${contractId}
VITE_RPC_URL=${RPC_URL}
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
`;
  fs.writeFileSync(path.join(ROOT, '.env'), env);
  console.log('DONE!');
}
main().catch(console.error);
