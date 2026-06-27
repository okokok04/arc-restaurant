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
        <h1>ARC NEXUS <span style={{fontSize: '0.6em', opacity: 0.5}}>v2.0</span></h1>
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
              'Connect Wallet'
            )}
          </button>
        )}
      </div>
    </header>
  );
}
