import { HORIZON_URL, NETWORK } from './contract.js';

export function formatStellarError(err) {
  const msg = err?.message || String(err);

  if (/non-existent contract function|MissingValue/i.test(msg)) {
    return {
      message:
        'Contract mismatch: deployed contract does not expose init/pay. Deploy this repo\'s contract and set VITE_CONTRACT_ID.',
      needsFunding: false,
      wrongContract: true,
    };
  }

  if (/invalid contract id|invalid strkey|invalid address/i.test(msg)) {
    return {
      message: 'Invalid contract or token address. Check VITE_CONTRACT_ID on Vercel.',
      needsFunding: false,
    };
  }

  if (/account not found|not funded/i.test(msg)) {
    return {
      message:
        'Your wallet is not funded on Stellar Testnet. Click "Fund Testnet Account" to get free test XLM.',
      needsFunding: true,
    };
  }

  if (/already initialized|Error\(Contract, #1\)/i.test(msg)) {
    return {
      message: 'Restaurant is already initialized on this contract. You can proceed to Pay.',
      needsFunding: false,
    };
  }

  if (/amount must be positive|Error\(Contract, #4\)/i.test(msg)) {
    return {
      message: 'Payment amount must be greater than 0.',
      needsFunding: false,
    };
  }

  if (/not initialized|Error\(Contract, #2\)/i.test(msg)) {
    return {
      message: 'Restaurant has not been initialized yet. Click "Init Restaurant" first.',
      needsFunding: false,
    };
  }

  if (/insufficient|Error\(Contract, #3\)|balance too low|underflow/i.test(msg)) {
    return {
      message:
        'Insufficient XLM balance for this purchase. Fund your testnet wallet or pick a cheaper item.',
      needsFunding: false,
    };
  }

  if (/freighter must be on testnet|network passphrase/i.test(msg)) {
    return {
      message: msg,
      needsFunding: false,
    };
  }

  if (/rejected in freighter|signing was cancelled/i.test(msg)) {
    return {
      message: msg,
      needsFunding: false,
    };
  }

  if (/account entry is missing/i.test(msg)) {
    return {
      message:
        'Your account is not ready for Soroban payments yet. Wait 5–10 seconds after funding, then retry.',
      needsFunding: false,
    };
  }

  if (/simulation failed|operation failed|HostError/i.test(msg)) {
    return { message: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg, needsFunding: false };
  }

  return { message: msg, needsFunding: false };
}

/**
 * Check if a Stellar account exists and is funded on the network.
 * A 404 from Horizon means the account is not funded — this is expected and handled silently.
 * Includes a 5-second timeout to prevent hanging requests.
 */
export async function checkAccountExists(publicKey) {
  if (!publicKey) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`, {
      signal: controller.signal,
    });
    // 200 = funded, 404 = not funded (expected, not an error)
    return res.status === 200;
  } catch {
    // Network error, timeout, or abort — don't crash, assume unknown state
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Fund a testnet account via Horizon Friendbot */
export async function fundTestnetAccount(publicKey) {
  if (NETWORK !== 'TESTNET') {
    throw new Error('Friendbot funding is only available on Testnet');
  }

  const url = `${HORIZON_URL}/friendbot?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Friendbot failed (${res.status}). Use Open Friendbot link.`);
  }

  const data = await res.json();
  return data?.hash || null;
}

export function friendbotUrl(publicKey) {
  return `${HORIZON_URL}/friendbot?addr=${encodeURIComponent(publicKey)}`;
}

export function laboratoryFundUrl(publicKey) {
  return `https://laboratory.stellar.org/#account-creator?network=test&account=${encodeURIComponent(publicKey)}`;
}
