/**
 * Deploy RestaurantContract to Stellar Testnet.
 * Run from repo root: npm run deploy:contract --prefix frontend
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Keypair,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Address,
  hash,
  xdr,
  Contract,
} from '@stellar/stellar-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const WASM_PATH = path.join(
  ROOT,
  'target/wasm32-unknown-unknown/release/restaurant_contract.wasm'
);

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const server = new rpc.Server(RPC_URL);

async function fundAccount(publicKey) {
  const res = await fetch(`${HORIZON_URL}/friendbot?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot failed: ${await res.text()}`);
  return res.json();
}

async function pollTx(txHash) {
  for (let i = 0; i < 30; i++) {
    const tx = await server.getTransaction(txHash);
    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) return tx;
    if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${txHash}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timeout waiting for ${txHash}`);
}

async function submitSigned(keypair, tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error || 'Simulation failed');
  }
  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(keypair);
  const sent = await server.sendTransaction(assembled);
  if (sent.status === 'ERROR') {
    throw new Error(sent.errorResult?.toString() || 'Send failed');
  }
  await pollTx(sent.hash);
  return { hash: sent.hash, sim };
}

async function main() {
  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(
      `WASM not found. Build first:\n  cargo build --target wasm32-unknown-unknown --release --package restaurant-contract`
    );
  }

  const wasm = fs.readFileSync(WASM_PATH);
  const deployer = Keypair.random();

  console.log('Funding deployer:', deployer.publicKey());
  await fundAccount(deployer.publicKey());
  await new Promise((r) => setTimeout(r, 3000));

  let account = await server.getAccount(deployer.publicKey());

  console.log('Uploading WASM...');
  const uploadTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();

  await submitSigned(deployer, uploadTx);

  const wasmHash = hash(wasm);
  account = await server.getAccount(deployer.publicKey());

  console.log('Deploying contract...');
  const deployTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: Address.fromString(deployer.publicKey()),
        wasmHash,
        salt: Keypair.random().rawPublicKey(),
      })
    )
    .setTimeout(30)
    .build();

  const { sim: deploySim } = await submitSigned(deployer, deployTx);
  const contractId = Address.fromScVal(deploySim.result.retval).toString();
  console.log('Contract ID:', contractId);

  account = await server.getAccount(deployer.publicKey());
  const contract = new Contract(contractId);

  console.log('Initializing restaurant...');
  const initTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'init',
        Address.fromString(deployer.publicKey()).toScVal(),
        xdr.ScVal.scvString('Arc Bistro')
      )
    )
    .setTimeout(30)
    .build();

  const { hash: initHash } = await submitSigned(deployer, initTx);

  const envContent = `VITE_NETWORK=TESTNET
VITE_CONTRACT_ID=${contractId}
VITE_RPC_URL=${RPC_URL}
VITE_HORIZON_URL=${HORIZON_URL}
VITE_EXAMPLE_TX_HASH=${initHash}
`;

  fs.writeFileSync(path.join(ROOT, 'frontend/.env'), envContent);
  fs.writeFileSync(
    path.join(ROOT, 'frontend/.env.production.local'),
    envContent
  );

  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log('CONTRACT_ID=' + contractId);
  console.log('INIT_TX=' + initHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
