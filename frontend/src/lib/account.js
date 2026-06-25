import { HORIZON_URL, NETWORK } from './contract.js';

export function formatStellarError(err) {
  const msg = err?.message || String(err);

  if (/non-existent contract function|MissingValue/i.test(msg)) {
    return {
      message:
        'This contract ID does not match our RestaurantContract (missing init/pay). Deploy the repo contract and update VITE_CONTRACT_ID.',
      needsFunding: false,
      wrongContract: true,
    };
  }

  if (/account not found|not funded/i.test(msg)) {
    return {
      message:
        'Your wallet is not funded on Stellar Testnet. Click "Fund Testnet Account" to get free test XLM.',
      needsFunding: true,
    };
  }

  if (/already initialized/i.test(msg)) {
    return {
      message: 'Restaurant is already initialized on this contract. You can proceed to Pay.',
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
