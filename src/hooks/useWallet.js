import { useState, useCallback } from 'react';
import {
  isConnected,
  isAllowed,
  setAllowed,
  getPublicKey,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api';

/**
 * Safely call a Freighter API function used for CONNECTION checks only.
 * Suppresses internal extension communication noise for read-only calls.
 * DO NOT use this for signTransaction — that needs direct invocation.
 */
async function safeFreighterCheck(fn, ...args) {
  try {
    return await fn(...args);
  } catch (err) {
    const msg = err?.message || '';
    if (
      msg.includes('Could not establish connection') ||
      msg.includes('message channel closed') ||
      msg.includes('Unable to send message') ||
      msg.includes('Receiving end does not exist')
    ) {
      // Extension not ready — return null silently
      return null;
    }
    throw err;
  }
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const installed = await safeFreighterCheck(isConnected);
      if (!installed) {
        throw new Error(
          'Freighter wallet not found. Please install it from https://freighter.app and refresh the page.'
        );
      }

      const allowed = await safeFreighterCheck(isAllowed);
      if (!allowed) {
        await safeFreighterCheck(setAllowed);
      }

      let address = await safeFreighterCheck(getPublicKey);
      if (!address) {
        address = await safeFreighterCheck(requestAccess);
      }

      if (!address) {
        throw new Error('Wallet connection was cancelled or no address returned.');
      }

      setPublicKey(address);
      return address;
    } catch (err) {
      const msg = err?.message || 'Failed to connect wallet';
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

  /**
   * Sign a transaction via Freighter popup.
   * Called DIRECTLY without any error suppression wrapper so the Freighter
   * popup can open and the user can confirm/reject the transaction.
   */
  const signTransaction = useCallback(async (xdr, opts) => {
    let signed;
    try {
      signed = await freighterSignTransaction(xdr, opts);
    } catch (err) {
      const msg = err?.message || '';
      // User explicitly rejected in Freighter popup
      if (msg.includes('User declined') || msg.includes('rejected')) {
        throw new Error('Transaction rejected by user in wallet.');
      }
      throw err;
    }

    if (!signed) {
      throw new Error('Transaction signing was cancelled.');
    }
    // Some versions of Freighter return an object with error property
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
