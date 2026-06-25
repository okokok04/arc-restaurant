/** Deployed RestaurantContract on Stellar Testnet */
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  'CBZCZQL4AYVXP7LWVDO5BRJ45JRKBVYQFN7IQKQOEFIKVAME5I2X5VT4';

/** Example tx hash from contract interaction (testnet) */
export const EXAMPLE_TX_HASH =
  import.meta.env.VITE_EXAMPLE_TX_HASH ||
  'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

export const NETWORK = import.meta.env.VITE_NETWORK || 'TESTNET';

export const NETWORK_PASSPHRASE =
  NETWORK === 'MAINNET'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

/** Native XLM token on testnet (wrapped as SAC) — override via env */
export const DEFAULT_TOKEN =
  import.meta.env.VITE_TOKEN_ADDRESS ||
  'CDLZFC3SYJYDZT7K7VZ75HMSZY47MXAEQHHDYOBLHNDHXV4ENZXMF';

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
  { id: 1, name: 'Stellar Burger', price: 2_500_000, emoji: '🍔' },
  { id: 2, name: 'Lumen Latte', price: 1_500_000, emoji: '☕' },
  { id: 3, name: 'Soroban Salad', price: 3_000_000, emoji: '🥗' },
  { id: 4, name: 'Freighter Fries', price: 1_000_000, emoji: '🍟' },
];
