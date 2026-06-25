/**
 * Deploy RestaurantContract to Stellar Testnet.
 * Fixed version: uses correct WASM path relative to project root.
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
  nativeToScVal,
} from '@stellar/stellar-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Script is at frontend/scripts/, project root is ../../
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
  if (!res.ok) {
    const text = await res.text();
    // Account might already exist — try to get it
    if (text.includes('createAccountAlreadyExist') || text.includes('already exists')) {
      console.log('Account already funded, continuing...');
      return;
    }
    throw new Error(`Friendbot failed: ${text}`);
  }
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
  return pollTx(sent.hash);
}

async function main() {
  if (!fs.existsSync(WASM_PATH)) {
    console.error(`WASM not found at: ${WASM_PATH}`);
    console.error('Build first:');
    console.error('  $env:RUSTFLAGS="-C target-feature=-reference-types"; cargo build --target wasm32-unknown-unknown --release --package restaurant-contract');
    process.exit(1);
  }

  const wasmData = fs.readFileSync(WASM_PATH);
  console.log(`WASM size: ${wasmData.length} bytes`);

  const deployer = Keypair.random();
  console.log('\nDeployer public key:', deployer.publicKey());
  console.log('Funding deployer via Friendbot...');

  await fundAccount(deployer.publicKey());
  await new Promise((r) => setTimeout(r, 4000));

  let account = await server.getAccount(deployer.publicKey());

  console.log('\nUploading WASM...');
  const uploadTx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmData }))
    .setTimeout(60)
    .build();

  const uploadResult = await submitSigned(deployer, uploadTx);
  const wasmHash = hash(wasmData);
  console.log('WASM uploaded. Hash:', wasmHash.toString('hex'));

  account = await server.getAccount(deployer.publicKey());

  console.log('\nDeploying contract...');
  const deployTx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: Address.fromString(deployer.publicKey()),
        wasmHash,
        salt: Keypair.random().rawPublicKey(),
      })
    )
    .setTimeout(60)
    .build();

  const deploySim = await server.simulateTransaction(deployTx);
  if (rpc.Api.isSimulationError(deploySim)) {
    throw new Error(deploySim.error || 'Deploy simulation failed');
  }

  const assembledDeploy = rpc.assembleTransaction(deployTx, deploySim).build();
  assembledDeploy.sign(deployer);

  const deployResult = await server.sendTransaction(assembledDeploy);
  if (deployResult.status === 'ERROR') {
    throw new Error(deployResult.errorResult?.toString() || 'Deploy send failed');
  }

  const deployReceipt = await pollTx(deployResult.hash);
  const contractId = Address.fromScVal(deploySim.result.retval).toString();
  console.log('\n✅ Contract deployed! ID:', contractId);

  // Init contract
  account = await server.getAccount(deployer.publicKey());
  const contract = new Contract(contractId);

  console.log('\nInitializing restaurant...');
  const initTx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'init',
        Address.fromString(deployer.publicKey()).toScVal(),
        nativeToScVal('Arc Bistro', { type: 'string' }),
      )
    )
    .setTimeout(60)
    .build();

  const initReceipt = await submitSigned(deployer, initTx);
  const initHash = deployResult.hash;

  console.log('\nRestaurant initialized!');

  const envContent = `VITE_NETWORK=TESTNET
VITE_CONTRACT_ID=${contractId}
VITE_RPC_URL=${RPC_URL}
VITE_HORIZON_URL=${HORIZON_URL}
VITE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
VITE_EXAMPLE_TX_HASH=${initHash}
`;

  fs.writeFileSync(path.join(ROOT, 'frontend/.env'), envContent);
  fs.writeFileSync(path.join(ROOT, 'frontend/.env.production.local'), envContent);

  console.log('\n========== DEPLOYMENT COMPLETE ==========');
  console.log('CONTRACT_ID=' + contractId);
  console.log('INIT_TX=' + initHash);
  console.log('\nUpdate .env and README with:');
  console.log(envContent);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
