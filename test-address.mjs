import { Address } from '@stellar/stellar-sdk';

const testAddress = 'CDLZFC3SYJYDZT7K7VZ75HMSZY47MXAEQHHDYOBLHNDHXV4ENZXMF';
try {
  const addr = Address.fromString(testAddress);
  console.log('Success:', addr.toString());
  console.log('ScVal:', addr.toScVal());
} catch (e) {
  console.error('Error:', e.message);
}
