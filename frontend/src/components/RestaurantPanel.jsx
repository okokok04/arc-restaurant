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
  laboratoryFundUrl,
} from '../lib/account.js';
import {
  CONTRACT_ID,
  isValidContractId,
  CONTRACT_FUNCTIONS,
  buildInitArgs,
  buildPayArgs,
  MENU_ITEMS,
} from '../lib/contract.js';

export default function RestaurantPanel() {
  const { publicKey, connected, signTransaction } = useWalletContext();
  const [restaurantName, setRestaurantName] = useState('Arc Bistro');
  const [balance, setBalance] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
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
      return false;
    }
    setCheckingAccount(true);
    try {
      const exists = await checkAccountExists(publicKey);
      setNeedsFunding(!exists);
      return exists;
    } finally {
      setCheckingAccount(false);
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
      await new Promise((r) => setTimeout(r, 2000));
      const exists = await checkAccountExists(publicKey);
      if (!exists) {
        throw new Error('Funding submitted but account not ready yet. Wait a few seconds and retry.');
      }
      setNeedsFunding(false);
      setMessage(
        hash
          ? `Account funded! Tx: ${hash.slice(0, 16)}… — you can now Init or Pay.`
          : 'Account funded with test XLM. You can now Init or Pay.'
      );
    } catch (err) {
      const { message: msg } = formatStellarError(err);
      setError(msg || 'Auto-fund failed. Click "Open Friendbot" or use Stellar Laboratory.');
      setNeedsFunding(true);
    } finally {
      setFunding(false);
    }
  };

  const handleInit = async () => {
    if (!connected || !publicKey) {
      setError('Connect your Freighter wallet first');
      return;
    }
    const funded = await checkFunding();
    if (!funded) {
      setNeedsFunding(true);
      setError('Fund your testnet account first using the button below.');
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
    const funded = await checkFunding();
    if (!funded) {
      setNeedsFunding(true);
      setError('Fund your testnet account first using the button below.');
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
      console.error('Payment error:', err);
      const { message: msg, needsFunding: nf } = formatStellarError(err);
      setError(msg || 'Payment simulation failed. Ensure restaurant is initialized.');
      setNeedsFunding(nf);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const actionsDisabled = loading || !connected || needsFunding || checkingAccount || !isValidContractId(CONTRACT_ID);

  if (!isValidContractId(CONTRACT_ID)) {
    return (
      <section className="panel restaurant-panel">
        <h2>Restaurant Contract</h2>
        <div className="alert alert-error" role="alert">
          {CONTRACT_ID
            ? `Invalid VITE_CONTRACT_ID (${CONTRACT_ID.length} chars). Must be 56 characters (C + 55).`
            : 'VITE_CONTRACT_ID is not configured. Deploy the contract and set the env var on Vercel.'}
        </div>
      </section>
    );
  }

  return (
    <section className="panel restaurant-panel">
      <div className="panel-header">
        <h2>Restaurant Dashboard</h2>
        <span className="badge-network">Stellar Testnet</span>
      </div>
      <p className="contract-id">
        Logic ID: <code>{CONTRACT_ID}</code>
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Contract Balance</span>
          <span className="stat-value">
            {balance !== null ? `${(balance / 1_000_000).toFixed(2)} XLM` : '—'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{orderCount ?? '—'}</span>
        </div>
      </div>

      {checkingAccount && connected && (
        <div className="alert alert-info">Checking testnet account…</div>
      )}

      {needsFunding && connected && !checkingAccount && (
        <div className="funding-card" role="status">
          <h3>Fund Testnet Wallet</h3>
          <p>
            Freighter must be on <strong>Testnet</strong>. Your address{' '}
            <code>{publicKey?.slice(0, 8)}…</code> needs test XLM before Init/Pay.
          </p>
          <div className="funding-actions">
            <button
              type="button"
              className="btn btn-primary"
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
            <a
              href={friendbotUrl(publicKey)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Open Friendbot
            </a>
            <a
              href={laboratoryFundUrl(publicKey)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              Stellar Laboratory
            </a>
          </div>
        </div>
      )}

      {error && !needsFunding && (
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
            disabled={actionsDisabled}
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
                disabled={actionsDisabled}
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
