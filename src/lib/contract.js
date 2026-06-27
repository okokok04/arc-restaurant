/** Arc Nexus Store Configuration */
export const CONTRACT_ID = (import.meta.env.VITE_CONTRACT_ID || '').trim();

/** Stellar contract IDs are 56 chars: C + 55 base32 chars */
export function isValidContractId(id) {
  return typeof id === 'string' && /^C[A-Z2-7]{55}$/.test(id);
}

/** Example tx hash from contract interaction (testnet) */
export const EXAMPLE_TX_HASH =
  import.meta.env.VITE_EXAMPLE_TX_HASH || '';

export const NETWORK = import.meta.env.VITE_NETWORK || 'TESTNET';

export const NETWORK_PASSPHRASE =
  NETWORK === 'MAINNET'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

/** Native XLM Stellar Asset Contract on testnet */
export const DEFAULT_TOKEN =
  import.meta.env.VITE_TOKEN_ADDRESS ||
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

/** Contract function names — must match Rust #[contractimpl] methods */
export const CONTRACT_FUNCTIONS = {
  INIT: 'init',
  PAY: 'pay',
  GET_BALANCE: 'get_balance',
  GET_OWNER: 'get_owner',
  GET_NAME: 'get_name',
  GET_ORDER_COUNT: 'get_order_count',
};

/** ScVal argument builders for each contract function */
export function buildInitArgs(owner, name) {
  return [
    { address: owner },
    { string: name },
  ];
}

export function buildPayArgs(customer, tokenAddress, amount, orderId) {
  return [
    { address: customer },
    { address: tokenAddress },
    { i128: amount.toString() },
    { u64: orderId.toString() },
  ];
}

export const MENU_ITEMS = [
  { id: 1, name: 'Neural Link Gen-S', price: 5000000, emoji: '🧠', desc: 'Direct brain-to-web interface' },
  { id: 2, name: 'Quantum Watch', price: 12000000, emoji: '⌚', desc: 'Syncs with stellar time protocol' },
  { id: 3, name: 'Holo-Glasses v4', price: 8500000, emoji: '👓', desc: 'AR overlay for real-time finance' },
  { id: 4, name: 'Cyber Drone', price: 15000000, emoji: '🛸', desc: 'Autonomous delivery unit' },
];
