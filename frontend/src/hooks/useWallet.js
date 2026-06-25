import { useState, useCallback } from 'react';
import {
  isConnected,
  requestAccess,
  getPublicKey,
  isAllowed,
  setAllowed,
  signTransaction as freighterSign,
} from '@stellar/freighter-api';

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const installed = await isConnected();
      if (!installed) {
        throw new Error(
          'Freighter wallet not found. Install it from https://freighter.app'
        );
      }

      const allowed = await isAllowed();
      if (!allowed) {
        await setAllowed();
      }

      let address = await getPublicKey();
      if (!address) {
        address = await requestAccess();
      }

      if (!address) {
        throw new Error('Wallet connection was cancelled or no address returned');
      }

      setPublicKey(address);
      return address;
    } catch (err) {
      const msg = err.message || 'Failed to connect wallet';
      setError(msg);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setError(null);
  }, []);

  const signTransaction = useCallback(async (xdr, opts) => {
    const signed = await freighterSign(xdr, opts);
    if (!signed) {
      throw new Error('Transaction signing was cancelled');
    }
    if (typeof signed === 'object' && signed.error) {
      throw new Error(signed.error);
    }
    return signed;
  }, []);

  return {
    publicKey,
    connecting,
    error,
    connected: !!publicKey,
    connect,
    disconnect,
    signTransaction,
  };
}
