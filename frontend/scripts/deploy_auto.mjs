import {
  rpc,
  TransactionBuilder,
  Networks,
  Keypair,
  BASE_FEE,
  Operation,
  StrKey,
  xdr,
  Address,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

async function deploy() {
  console.log('--- Starting Deployment ---');
  
  // 1. Create temporary deployer
  const deployer = Keypair.random();
  console.log('Deployer Public Key:', deployer.publicKey());
  
  // 2. Fund via Friendbot
  console.log('Funding account...');
  await fetch(`https://friendbot.stellar.org/?addr=${deployer.publicKey()}`);
  console.log('Account funded.');

  // 3. Load WASM
  const wasm = readFileSync('./target/wasm32-unknown-unknown/release/restaurant_contract.wasm');
  console.log('WASM loaded, size:', wasm.length);

  // 4. Upload WASM
  let account = await server.getAccount(deployer.publicKey());
  let tx = new TransactionBuilder(account, {
    fee: (parseInt(BASE_FEE) * 100).toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasm),
      auth: [],
    }))
    .setTimeout(30)
    .build();

  console.log('Simulating upload...');
  let sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    console.error('Simulation Error:', sim.error);
    process.exit(1);
  }
  tx = rpc.assembleTransaction(tx, sim).build();
  tx.sign(deployer);

  console.log('Submitting upload...');
  let result = await server.sendTransaction(tx);
  console.log('Upload Result hash:', result.hash);

  // Poll
  let status;
  for(let i=0; i<30; i++) {
    status = await server.getTransaction(result.hash);
    if (status.status !== 'NOT_FOUND') break;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const wasmHash = status.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success();
  const wasmHashHex = wasmHash.toXDR().toString('hex').slice(16); // Dirty way to get hash
  console.log('WASM Installed. Hash:', wasmHashHex);

  // 5. Create Contract
  account = await server.getAccount(deployer.publicKey());
  tx = new TransactionBuilder(account, {
    fee: (parseInt(BASE_FEE) * 100).toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeCreateContract(
        new xdr.CreateContractArgs({
          contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            new xdr.ContractIdPreimageFromAddress({
              address: Address.fromString(deployer.publicKey()).toScAddress(),
              salt: Buffer.alloc(32),
            })
          ),
          executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash)
        })
      ),
      auth: [],
    }))
    .setTimeout(30)
    .build();

  console.log('Simulating create...');
  sim = await server.simulateTransaction(tx);
  tx = rpc.assembleTransaction(tx, sim).build();
  tx.sign(deployer);

  console.log('Submitting create...');
  result = await server.sendTransaction(tx);
  
  for(let i=0; i<30; i++) {
    status = await server.getTransaction(result.hash);
    if (status.status !== 'NOT_FOUND') break;
    await new Promise(r => setTimeout(r, 2000));
  }

  const contractId = StrKey.encodeContract(status.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success().toXDR().slice(12, 44));
  console.log('CONTRACT DEPLOYED! ID:', contractId);
  return contractId;
}

deploy().catch(console.error);
