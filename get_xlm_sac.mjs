import { Asset, Networks } from '@stellar/stellar-sdk';

// Get the testnet XLM SAC address
const native = Asset.native();
const testnetId = native.contractId(Networks.TESTNET);
console.log('Testnet XLM SAC:', testnetId);
