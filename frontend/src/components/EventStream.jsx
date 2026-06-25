import { useEventStream } from '../hooks/useEventStream.js';

export default function EventStream() {
  const { events, loading, error, refresh } = useEventStream(true);

  return (
    <section className="panel event-panel">
      <div className="panel-header">
        <h2>Live Event Stream</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="hint">
        Real-time Soroban contract events via RPC polling (PaymentEvent, InitializedEvent)
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {events.length === 0 && !loading && !error && (
        <p className="empty-state">No events yet. Initialize or pay to emit events.</p>
      )}

      <ul className="event-list">
        {events.map((evt) => (
          <li key={evt.id} className="event-item">
            <div className="event-meta">
              <span className="event-ledger">Ledger {evt.ledger}</span>
              {evt.txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${evt.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-tx"
                >
                  {evt.txHash.slice(0, 12)}…
                </a>
              )}
            </div>
            <pre className="event-data">
              {JSON.stringify(
                { topics: evt.topics, value: evt.value },
                null,
                2
              )}
            </pre>
          </li>
        ))}
      </ul>
    </section>
  );
}
