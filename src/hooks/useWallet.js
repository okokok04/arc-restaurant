import { useState, useCallback } from 'react';

/**
 * Safely call a Freighter API function.
 * If the extension is not installed or not ready, returns null instead of throwing.
 */
async function safeFreighterCall(fn, ...args) {
  try {
    const result = await fn(...args);
    return result;
  } catch (err) {
    // Suppress internal extension communication errors (not actionable by user)
    const msg = err?.message || '';
    if (
      msg.includes('Could not establish connection') ||
      msg.includes('message channel closed') ||
      msg.includes('Unable to send message') ||
      msg.includes('Receiving end does not exist')
    ) {
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
      // Dynamically import to avoid issues when extension is not present
      const freighter = await import('@stellar/freighter-api');

      const installed = await safeFreighterCall(freighter.isConnected);
      if (!installed) {
        throw new Error(
          'Freighter wallet not found. Please install it from https://freighter.app and refresh the page.'
        );
      }

      const allowed = await safeFreighterCall(freighter.isAllowed);
      if (!allowed) {
        await safeFreighterCall(freighter.setAllowed);
      }

      let address = await safeFreighterCall(freighter.getPublicKey);
      if (!address) {
        address = await safeFreighterCall(freighter.requestAccess);
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

  const signTransaction = useCallback(async (xdr, opts) => {
    const freighter = await import('@stellar/freighter-api');
    const signed = await safeFreighterCall(freighter.signTransaction, xdr, opts);
    if (!signed) {
      throw new Error('Transaction signing was cancelled or extension is unavailable.');
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
