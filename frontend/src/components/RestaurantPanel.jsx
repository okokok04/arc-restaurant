import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '../context/WalletContext.jsx';
import {
  initRestaurant,
  payOrder,
  getContractBalance,
  getOrderCount,
} from '../lib/soroban.js';
import {
  checkAccountExists,
  fundTestnetAccount,
  formatStellarError,
  friendbotUrl,
} from '../lib/account.js';
import { MENU_ITEMS, DEFAULT_TOKEN, CONTRACT_ID } from '../lib/contract.js';

export default function RestaurantPanel() {
  const { publicKey, connected, signTransaction } = useWalletContext();
  const [restaurantName, setRestaurantName] = useState('Arc Bistro');
  const [balance, setBalance] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [action, setAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [needsFunding, setNeedsFunding] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(null);

  const refreshStats = useCallback(async () => {
    try {
      const [bal, count] = await Promise.all([getContractBalance(), getOrderCount()]);
      setBalance(bal);
      setOrderCount(count);
    } catch {
      // Read-only stats may fail if contract not initialized
    }
  }, []);

  const checkFunding = useCallback(async () => {
    if (!publicKey) {
      setNeedsFunding(false);
      return;
    }
    const exists = await checkAccountExists(publicKey);
    setNeedsFunding(!exists);
    if (!exists) {
      setError(
        'Your Freighter account is not funded on Stellar Testnet. Get free test XLM below.'
      );
    }
  }, [publicKey]);

  useEffect(() => {
    refreshStats();
    const id = setInterval(refreshStats, 10000);
    return () => clearInterval(id);
  }, [refreshStats]);

  useEffect(() => {
    if (connected && publicKey) {
      setError(null);
      checkFunding();
    } else {
      setNeedsFunding(false);
    }
  }, [connected, publicKey, checkFunding]);

  const handleFund = async () => {
    if (!publicKey) return;
    setFunding(true);
    setError(null);
    setMessage(null);
    try {
      const hash = await fundTestnetAccount(publicKey);
      setMessage(
        hash
          ? `Account funded! Tx: ${hash.slice(0, 16)}…`
          : 'Account funded with test XLM. You can now Init or Pay.'
      );
      setNeedsFunding(false);
      await checkFunding();
    } catch (err) {
      const { message: msg } = formatStellarError(err);
      setError(msg || 'Funding failed. Try the Friendbot link below.');
    } finally {
      setFunding(false);
    }
  };

  const handleInit = async () => {
    if (!connected || !publicKey) {
      setError('Connect your Freighter wallet first');
      return;
    }
    if (needsFunding) {
      setError('Fund your testnet account before initializing.');
      return;
    }
    setLoading(true);
    setAction('init');
    setError(null);
    setMessage(null);
    try {
      const result = await initRestaurant(publicKey, restaurantName, publicKey, signTransaction);
      setLastTxHash(result.hash);
      setMessage(`Restaurant initialized! Tx: ${result.hash.slice(0, 16)}…`);
      await refreshStats();
    } catch (err) {
      const { message: msg, needsFunding: nf } = formatStellarError(err);
      setError(msg);
      setNeedsFunding(nf);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePay = async (item) => {
    if (!connected || !publicKey) {
      setError('Connect your Freighter wallet first');
      return;
    }
    if (needsFunding) {
      setError('Fund your testnet account before paying.');
      return;
    }
    setLoading(true);
    setAction(`pay-${item.id}`);
    setError(null);
    setMessage(null);
    try {
      const result = await payOrder(
        publicKey,
        DEFAULT_TOKEN,
        item.price,
        item.id,
        publicKey,
        signTransaction
      );
      setLastTxHash(result.hash);
      setMessage(`Paid for ${item.name}! Tx: ${result.hash.slice(0, 16)}…`);
      await refreshStats();
    } catch (err) {
      const { message: msg, needsFunding: nf } = formatStellarError(err);
      setError(msg);
      setNeedsFunding(nf);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <section className="panel restaurant-panel">
      <h2>Restaurant Contract</h2>
      <p className="contract-id">
        Contract: <code>{CONTRACT_ID.slice(0, 12)}…</code>
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Balance</span>
          <span className="stat-value">
            {balance !== null ? `${(balance / 1_000_000).toFixed(2)} XLM` : '—'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Orders</span>
          <span className="stat-value">{orderCount ?? '—'}</span>
        </div>
      </div>

      {needsFunding && connected && (
        <div className="alert alert-info funding-banner" role="status">
          <p>Account not found on Testnet — fund with free XLM to use Init/Pay.</p>
          <div className="funding-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleFund}
              disabled={funding}
            >
              {funding ? (
                <>
                  <span className="spinner" /> Funding…
                </>
              ) : (
                'Fund Testnet Account'
              )}
            </button>
            {publicKey && (
              <a
                href={friendbotUrl(publicKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Open Friendbot
              </a>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}
      {lastTxHash && (
        <p className="tx-hash">
          Last tx:{' '}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lastTxHash.slice(0, 20)}…
          </a>
        </p>
      )}

      <div className="init-section">
        <h3>Initialize Restaurant</h3>
        <p className="hint">Calls contract function: <code>init(owner, name)</code></p>
        <div className="form-row">
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Restaurant name"
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleInit}
            disabled={loading || !connected || needsFunding}
          >
            {action === 'init' ? (
              <>
                <span className="spinner" /> Initializing…
              </>
            ) : (
              'Init Restaurant'
            )}
          </button>
        </div>
      </div>

      <div className="menu-section">
        <h3>Menu — Pay with Soroban</h3>
        <p className="hint">Calls contract function: <code>pay(customer, token, amount, order_id)</code></p>
        <div className="menu-grid">
          {MENU_ITEMS.map((item) => (
            <article key={item.id} className="menu-card">
              <span className="menu-emoji">{item.emoji}</span>
              <h4>{item.name}</h4>
              <p className="menu-price">{(item.price / 1_000_000).toFixed(2)} XLM</p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handlePay(item)}
                disabled={loading || !connected || needsFunding}
              >
                {action === `pay-${item.id}` ? (
                  <>
                    <span className="spinner" /> Paying…
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
