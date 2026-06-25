import { createContext, useContext } from 'react';
import { useWallet } from '../hooks/useWallet.js';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return ctx;
}
