import { useWalletContext } from '../context/WalletContext.jsx';

function truncateKey(key) {
  if (!key) return '';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export default function WalletConnect() {
  const { publicKey, connecting, error, connected, connect, disconnect } = useWalletContext();

  return (
    <header className="wallet-header">
      <div className="brand">
        <span className="brand-icon">🍽️</span>
        <div>
          <h1>Arc Restaurant</h1>
          <p className="subtitle">Soroban payments on Stellar</p>
        </div>
      </div>

      <div className="wallet-actions">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {connected ? (
          <div className="wallet-connected">
            <span className="wallet-badge" title={publicKey}>
              <span className="dot" /> {truncateKey(publicKey)}
            </span>
            <button type="button" className="btn btn-ghost" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <span className="spinner" /> Connecting…
              </>
            ) : (
              'Connect Freighter Wallet'
            )}
          </button>
        )}
      </div>
    </header>
  );
}

