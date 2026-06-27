/**
 * Smoke test: simulate pay against deployed testnet contract.
 * Run: node scripts/test-pay-sim.mjs [G-address]
 */
import { Contract, rpc, TransactionBuilder, Address, nativeToScVal, BASE_FEE } from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.VITE_CONTRACT_ID || 'CALNBNJF7HWOU2T4H33JSOWOZX57NPAHEVENJKDFEWE7363PKF62HCAI';
const TOKEN = process.env.VITE_TOKEN_ADDRESS || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const CUSTOMER = process.argv[2] || 'GA3WQEYJLB6QDRULKA4SM5GYZ6W53RNC4SZWUMNXUNEMKW6ITSB3NZI7';
const PASS = 'Test SDF Network ; September 2015';
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const contract = new Contract(CONTRACT_ID);

const account = await server.getAccount(CUSTOMER);
const payArgs = [
  Address.fromString(CUSTOMER).toScVal(),
  Address.fromString(TOKEN).toScVal(),
  nativeToScVal(5000000n, { type: 'i128' }),
  nativeToScVal(888n, { type: 'u64' }),
];
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASS })
  .addOperation(contract.call('pay', ...payArgs))
  .setTimeout(30)
  .build();

const sim = await server.simulateTransaction(tx);
if (rpc.Api.isSimulationError(sim)) {
  console.error('FAIL:', sim.error);
  process.exit(1);
}

const prepared = rpc.assembleTransaction(tx, sim).build();
console.log('OK pay simulation + assembly for', CUSTOMER);
console.log('xdr bytes:', prepared.toXDR().length);
