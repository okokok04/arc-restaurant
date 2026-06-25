import { HORIZON_URL, NETWORK } from './contract.js';

export function formatStellarError(err) {
  const msg = err?.message || String(err);

  if (/non-existent contract function|MissingValue|does not exist|contract.{0,10}not found/i.test(msg)) {
    return {
      message: null, // Don't block the UI with an error, just wait for user to Init
      needsFunding: false,
      wrongContract: false,
    };
  }

  if (/invalid contract id|invalid strkey|invalid address/i.test(msg)) {
    return {
      message: 'Token or Contract ID is invalid. Please try a different contract or check your network.',
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

  return { message: msg, needsFunding: false };
}

export async function checkAccountExists(publicKey) {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    return res.ok;
  } catch {
    return false;
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
