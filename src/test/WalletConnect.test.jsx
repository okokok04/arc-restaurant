import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '../context/WalletContext.jsx';
import WalletConnect from '../components/WalletConnect.jsx';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue(true),
  isAllowed: vi.fn().mockResolvedValue(false),
  setAllowed: vi.fn().mockResolvedValue(true),
  getPublicKey: vi.fn().mockResolvedValue(''),
  requestAccess: vi.fn().mockResolvedValue(''),
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
