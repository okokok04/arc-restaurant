import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletContext } from '../context/WalletContext.jsx';
import {
  initRestaurant,
  payOrder,
  getContractBalance,
  getOrderCount,
  simulateWriteCall,
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
  DEFAULT_TOKEN,
  MENU_ITEMS,
} from '../lib/contract.js';
import PurchaseConfirmModal from './PurchaseConfirmModal.jsx';

export default function RestaurantPanel() {
  const { publicKey, connected, connecting, connect, signTransaction } = useWalletContext();
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
  const [pendingItem, setPendingItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payPhase, setPayPhase] = useState('confirm');
  const [modalError, setModalError] = useState(null);
  const purchaseStatusRef = useRef(null);

  const scrollToPurchaseStatus = useCallback(() => {
    purchaseStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const bal = await getContractBalance();
      const count = await getOrderCount();
      
      // Only update if we get valid numbers back
      if (typeof bal === 'number') setBalance(bal);
      if (typeof count === 'number') setOrderCount(count);
    } catch (err) {
      console.warn('Refresh stats failed:', err.message);
      // Keep existing stats, don't crash
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
    if (!confirmOpen) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [confirmOpen]);

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
      await new Promise((r) => setTimeout(r, 5000));
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
      scrollToPurchaseStatus();
    } catch (err) {
      const { message: msg, needsFunding: nf } = formatStellarError(err);
      setError(msg);
      setNeedsFunding(nf);
      scrollToPurchaseStatus();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePay = (item) => {
    setError(null);
    setMessage(null);
    setPendingItem(item);
    setModalError(null);
    setPayPhase('confirm');
    setConfirmOpen(true);
  };

  const handleModalConnect = async () => {
    try {
      await connect();
    } catch (err) {
      setModalError(err?.message || 'Failed to connect Freighter wallet.');
    }
  };

  const executePay = async () => {
    const item = pendingItem;
    if (!item || !publicKey) return;

    setLoading(true);
    setAction(`pay-${item.id}`);
    setError(null);
    setMessage(null);
    setModalError(null);
    setPayPhase('simulating');
    scrollToPurchaseStatus();

    try {
      if (!connected || !publicKey) {
        throw new Error('Connect your Freighter wallet first (button top-right).');
      }

      const funded = await checkFunding();
      if (!funded) {
        setNeedsFunding(true);
        throw new Error('Fund your testnet account first, wait ~5 seconds, then retry.');
      }

      await simulateWriteCall(
        'pay',
        [
          { address: publicKey },
          { address: DEFAULT_TOKEN },
          { i128: item.price.toString() },
          { u64: item.id.toString() },
        ],
        publicKey
      );

      const result = await payOrder(
        publicKey,
        DEFAULT_TOKEN,
        item.price,
        item.id,
        publicKey,
        signTransaction,
        {
          onPhase: (phase) => setPayPhase(phase),
        }
      );

      setConfirmOpen(false);
      setPendingItem(null);
      setModalError(null);
      setPayPhase('confirm');
      setLastTxHash(result.hash);
      setMessage(`Paid for ${item.name}! Tx: ${result.hash.slice(0, 16)}…`);
      await refreshStats();
    } catch (err) {
      console.error('Payment error:', err);
      const { message: msg, needsFunding: nf } = formatStellarError(err);
      const display = msg || 'Payment failed. Check Freighter is on Testnet and try again.';
      setModalError(display);
      setError(display);
      setNeedsFunding(nf);
      setPayPhase('confirm');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const cancelPay = () => {
    if (loading) return;
    setConfirmOpen(false);
    setPendingItem(null);
    setModalError(null);
    setPayPhase('confirm');
  };

  const purchaseBlockReason = !isValidContractId(CONTRACT_ID)
    ? null
    : !connected
      ? 'Connect Freighter wallet (top-right) to purchase.'
      : checkingAccount
        ? 'Checking testnet account…'
        : needsFunding
          ? 'Fund your testnet wallet before purchasing.'
          : loading && action?.startsWith('pay-')
            ? 'Processing payment — confirm in Freighter if prompted.'
            : null;

  const initDisabled = loading;
  const payDisabled = loading;

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
        <h2>Nexus Store Dashboard</h2>
        <span className="badge-network">Stellar Testnet</span>
      </div>
      <p className="contract-id">
        Logic ID: <code>{CONTRACT_ID}</code>
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Store Revenue</span>
          <span className="stat-value">
            {typeof balance === 'number' ? `${(balance / 1_000_000).toFixed(2)} XLM` : '—'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Units Sold</span>
          <span className="stat-value">{typeof orderCount === 'number' ? orderCount : '—'}</span>
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

      <div className="init-section">
        <h3>Launch Nexus Store</h3>
        <p className="hint">Authorize store instance on-chain: <code>init(owner, name)</code></p>
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
            disabled={initDisabled}
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

      <div className="menu-section" id="purchase-section">
        <h3>Hardware Catalog — Pay via Soroban</h3>
        <p className="hint">Transaction protocol: <code>pay(customer, token, amount, order_id)</code></p>

        <div ref={purchaseStatusRef} className="purchase-status">
          {purchaseBlockReason && (
            <div className="alert alert-info" role="status">
              {purchaseBlockReason}
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
          {lastTxHash && typeof lastTxHash === 'string' && (
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
        </div>

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
                disabled={payDisabled}
                aria-busy={action === `pay-${item.id}`}
              >
                {action === `pay-${item.id}` ? (
                  <>
                    <span className="spinner" /> Transacting…
                  </>
                ) : (
                  'Purchase'
                )}
              </button>
            </article>
          ))}
        </div>
      </div>

      <PurchaseConfirmModal
        item={pendingItem}
        open={confirmOpen}
        onConfirm={executePay}
        onCancel={cancelPay}
        onConnect={handleModalConnect}
        connected={connected}
        connecting={connecting}
        confirming={loading && action?.startsWith('pay-')}
        phase={payPhase}
        error={modalError}
      />
    </section>
  );
}
