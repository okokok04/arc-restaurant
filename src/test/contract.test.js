import { describe, it, expect } from 'vitest';
import {
  CONTRACT_ID,
  isValidContractId,
  CONTRACT_FUNCTIONS,
  buildInitArgs,
  buildPayArgs,
  MENU_ITEMS,
} from '../lib/contract.js';

describe('contract.js configuration', () => {
  it('validates Stellar contract ID format', () => {
    expect(isValidContractId('CBZCZQL4AYVXP7LWVDO5BRJ45JRKBVYQFN7IQKQOEFIKVAME5I2X5VT4')).toBe(true);
    expect(isValidContractId('CDG6P7LKWVN4S3WUTW7Z5Y47MXAEQHHDYOBLHNDHXV4ENZXMFCAU7C5')).toBe(false);
    expect(isValidContractId('')).toBe(false);
  });

  it('exports contract ID from env or empty string', () => {
    expect(typeof CONTRACT_ID).toBe('string');
    if (CONTRACT_ID) {
      expect(isValidContractId(CONTRACT_ID)).toBe(true);
    }
  });

  it('maps frontend actions to Rust contract function names', () => {
    expect(CONTRACT_FUNCTIONS.INIT).toBe('init');
    expect(CONTRACT_FUNCTIONS.PAY).toBe('pay');
    expect(CONTRACT_FUNCTIONS.GET_BALANCE).toBe('get_balance');
    expect(CONTRACT_FUNCTIONS.GET_ORDER_COUNT).toBe('get_order_count');
  });

  it('builds init args matching init(env, owner, name)', () => {
    const owner = 'GCKFBEIYTKP6FA5X5OBOPDDFYJXLOSLDF7NMYFF3OFHGXXPQHYOGQZGY';
    const args = buildInitArgs(owner, 'Arc Bistro');
    expect(args).toHaveLength(2);
    expect(args[0]).toEqual({ address: owner });
    expect(args[1]).toEqual({ string: 'Arc Bistro' });
  });

  it('builds pay args matching pay(env, customer, token, amount, order_id)', () => {
    const customer = 'GCKFBEIYTKP6FA5X5OBOPDDFYJXLOSLDF7NMYFF3OFHGXXPQHYOGQZGY';
    const token = 'CDLZFC3SYJYDZT7K7VZ75HMSZY47MXAEQHHDYOBLHNDHXV4ENZXMF';
    const args = buildPayArgs(customer, token, 2_500_000, 1);
    expect(args).toHaveLength(4);
    expect(args[0]).toEqual({ address: customer });
    expect(args[1]).toEqual({ address: token });
    expect(args[2]).toEqual({ i128: '2500000' });
    expect(args[3]).toEqual({ u64: '1' });
  });

  it('menu items have valid order IDs and positive prices', () => {
    expect(MENU_ITEMS.length).toBeGreaterThanOrEqual(3);
    MENU_ITEMS.forEach((item) => {
      expect(item.id).toBeGreaterThan(0);
      expect(item.price).toBeGreaterThan(0);
      expect(item.name).toBeTruthy();
    });
  });
});
