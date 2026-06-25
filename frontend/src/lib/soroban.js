import {
  Contract,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  CONTRACT_FUNCTIONS,
  buildInitArgs,
  buildPayArgs,
} from './contract.js';
import { formatStellarError } from './account.js';

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });

function scValFromSpec(spec) {
  if (spec.address) return nativeToScVal(spec.address, { type: 'address' });
  if (spec.string !== undefined) return nativeToScVal(spec.string, { type: 'string' });
  if (spec.i128 !== undefined) return nativeToScVal(BigInt(spec.i128), { type: 'i128' });
  if (spec.u64 !== undefined) return nativeToScVal(BigInt(spec.u64), { type: 'u64' });
  throw new Error(`Unsupported ScVal spec: ${JSON.stringify(spec)}`);
}

function getContract() {
  return new Contract(CONTRACT_ID);
}

/**
 * Simulate a read-only contract call (no wallet signature required).
 */
export async function simulateContractCall(functionName, args = []) {
  const account = await server.getAccount(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
  ).catch(() => null);

  const source =
    account ||
    (await server.getLatestLedger()).then(() => ({
      accountId: () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      sequenceNumber: () => '0',
    }));

  const acct =
    typeof source.then === 'function'
      ? await source
      : source;

  const contract = getContract();
  const scArgs = args.map(scValFromSpec);

  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...scArgs))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error || 'Simulation failed');
  }
  return sim;
}

/**
 * Build, sign (via Freighter), and submit a contract invocation transaction.
 */
export async function invokeContract(functionName, args, publicKey, signTransaction) {
  let account;
  try {
    account = await server.getAccount(publicKey);
  } catch (err) {
    const { message } = formatStellarError(err);
    throw new Error(message);
  }

  const contract = getContract();
  const scArgs = args.map(scValFromSpec);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...scArgs))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const { message } = formatStellarError(new Error(sim.error || 'Simulation failed'));
    throw new Error(message || `Simulation failed for ${functionName}`);
  }

  tx = rpc.assembleTransaction(tx, sim).build();

  const signedXdr = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    accountToSign: publicKey,
  });

  if (!signedXdr) {
    throw new Error('Transaction signing was cancelled');
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(signedTx);

  if (result.status === 'ERROR') {
    throw new Error(result.errorResult?.toXDR('base64') || 'Transaction failed');
  }

  return pollTransaction(result.hash);
}

async function pollTransaction(hash, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const tx = await server.getTransaction(hash);
    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, status: 'SUCCESS', result: tx };
    }
    if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction ${hash} failed on-chain`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { hash, status: 'PENDING' };
}

/** Call contract `init` — maps to RestaurantContract::init */
export async function initRestaurant(owner, name, publicKey, signTransaction) {
  return invokeContract(
    CONTRACT_FUNCTIONS.INIT,
    buildInitArgs(owner, name),
    publicKey,
    signTransaction
  );
}

/** Call contract `pay` — maps to RestaurantContract::pay */
export async function payOrder(customer, tokenAddress, amount, orderId, publicKey, signTransaction) {
  return invokeContract(
    CONTRACT_FUNCTIONS.PAY,
    buildPayArgs(customer, tokenAddress, amount, orderId),
    publicKey,
    signTransaction
  );
}

/** Read contract balance via simulation */
export async function getContractBalance() {
  try {
    const sim = await simulateContractCall(CONTRACT_FUNCTIONS.GET_BALANCE, []);
    if (sim.result?.retval) {
      return Number(scValToNative(sim.result.retval));
    }
  } catch {
    return null;
  }
  return null;
}

/** Read order count via simulation */
export async function getOrderCount() {
  try {
    const sim = await simulateContractCall(CONTRACT_FUNCTIONS.GET_ORDER_COUNT, []);
    if (sim.result?.retval) {
      return Number(scValToNative(sim.result.retval));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Stream contract events in real-time via Soroban RPC getEvents polling.
 */
export async function fetchContractEvents(startLedger = null) {
  const latest = await server.getLatestLedger();
  const from = startLedger ?? Math.max(1, latest.sequence - 1000);

  const filter = {
    type: 'contract',
    contractIds: [CONTRACT_ID],
  };

  const response = await server.getEvents({
    startLedger: from,
    endLedger: latest.sequence,
    filters: [filter],
  });

  return (response.events || []).map((evt) => ({
    id: evt.id || `${evt.ledger}-${evt.txHash}`,
    type: evt.type,
    ledger: evt.ledger,
    txHash: evt.txHash,
    contractId: evt.contractId?.toString?.() ?? evt.contractId,
    topics: evt.topic?.map((t) => {
      try {
        return scValToNative(t);
      } catch {
        return t;
      }
    }) ?? [],
    value: evt.value
      ? (() => {
          try {
            return scValToNative(evt.value);
          } catch {
            return evt.value;
          }
        })()
      : null,
    timestamp: evt.ledgerClosedAt || null,
  }));
}

export { server, CONTRACT_ID, NETWORK_PASSPHRASE };
