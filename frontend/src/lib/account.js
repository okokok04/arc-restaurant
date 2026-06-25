import { HORIZON_URL, NETWORK } from './contract.js';

export function formatStellarError(err) {
  const msg = err?.message || String(err);

  if (/account not found/i.test(msg)) {
    return {
      message:
        'Your wallet account is not funded on Stellar Testnet. Fund it with test XLM before sending transactions.',
      needsFunding: true,
    };
  }

  if (/already initialized/i.test(msg)) {
    return {
      message: 'Restaurant is already initialized on this contract. You can proceed to Pay.',
      needsFunding: false,
    };
  }

  if (/simulation failed|operation failed/i.test(msg)) {
    return { message: msg, needsFunding: false };
  }

  return { message: msg, needsFunding: false };
}

export async function checkAccountExists(publicKey) {
  const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  return res.ok;
}

/** Fund a testnet account via Horizon Friendbot */
export async function fundTestnetAccount(publicKey) {
  if (NETWORK !== 'TESTNET') {
    throw new Error('Friendbot funding is only available on Testnet');
  }

  const res = await fetch(
    `${HORIZON_URL}/friendbot?addr=${encodeURIComponent(publicKey)}`
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Friendbot failed (${res.status})`);
  }

  const data = await res.json();
  return data?.hash || null;
}

export function friendbotUrl(publicKey) {
  return `${HORIZON_URL}/friendbot?addr=${encodeURIComponent(publicKey)}`;
}
