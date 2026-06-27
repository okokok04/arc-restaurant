import { createPortal } from 'react-dom';

const PHASE_LABELS = {
  confirm: null,
  simulating: 'Simulating transaction on testnet…',
  preparing: 'Preparing transaction…',
  'awaiting-signature': 'Freighter popup should open now — click Approve to pay.',
  submitting: 'Submitting signed transaction…',
  confirming: 'Waiting for ledger confirmation…',
};

export default function PurchaseConfirmModal({
  item,
  open,
  onConfirm,
  onCancel,
  onConnect,
  confirming,
  connecting,
  connected,
  phase,
  error,
}) {
  if (!open || !item) return null;

  const phaseLabel = PHASE_LABELS[phase] || null;
  const needsWallet = !connected;

  const content = (
    <div className="modal-overlay" role="presentation" onClick={confirming ? undefined : onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="purchase-confirm-title">Confirm Purchase</h3>
        <p className="modal-item-name">
          {item.emoji} {item.name}
        </p>
        <p className="modal-price">{(item.price / 1_000_000).toFixed(2)} XLM</p>

        {needsWallet && (
          <div className="alert alert-info modal-phase" role="status">
            Connect your Freighter wallet first (Testnet), then confirm payment.
          </div>
        )}

        {!needsWallet && !confirming && !error && (
          <p className="hint">
            Step 1: Confirm here. Step 2: Approve in Freighter wallet popup.
          </p>
        )}

        {confirming && phaseLabel && (
          <div className="alert alert-info modal-phase" role="status">
            {phase === 'awaiting-signature' && <span className="spinner" />}
            {phaseLabel}
          </div>
        )}

        {error && (
          <div className="alert alert-error modal-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={confirming}>
            {error ? 'Close' : 'Cancel'}
          </button>

          {needsWallet ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onConnect}
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
          ) : !error ? (
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={confirming}>
              {confirming ? (
                <>
                  <span className="spinner" /> Processing…
                </>
              ) : (
                'Confirm & Pay'
              )}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={confirming}>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
