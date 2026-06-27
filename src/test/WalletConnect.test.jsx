import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '../context/WalletContext.jsx';
import WalletConnect from '../components/WalletConnect.jsx';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
  isAllowed: vi.fn().mockResolvedValue({ isAllowed: true }),
  setAllowed: vi.fn().mockResolvedValue({ isAllowed: true }),
  getAddress: vi.fn().mockResolvedValue({ address: '' }),
  requestAccess: vi.fn().mockResolvedValue({ address: '' }),
  getNetworkDetails: vi.fn().mockResolvedValue({
    network: 'TESTNET',
    networkPassphrase: 'Test SDF Network ; September 2015',
  }),
  signTransaction: vi.fn(),
}));

describe('WalletConnect component', () => {
  it('renders connect wallet button when disconnected', () => {
    render(
      <WalletProvider>
        <WalletConnect />
      </WalletProvider>
    );
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('displays app branding', () => {
    render(
      <WalletProvider>
        <WalletConnect />
      </WalletProvider>
    );
    expect(screen.getByText(/Arc Nexus/i)).toBeInTheDocument();
  });
});
