# Architecture Notes

## Inter-Contract Communication

`RestaurantContract::pay` delegates token movement to the Stellar Asset Contract (SAC) via `token::Client::transfer`. This is canonical Soroban inter-contract invocation.

## Event Model

| Event | Topics | Payload |
|-------|--------|---------|
| `InitializedEvent` | owner | name |
| `PaymentEvent` | customer | amount, order_id |

Frontend polls `getEvents` every 5s filtered by contract ID.

## Frontend Layers

```
Components → hooks/context → soroban.js → @stellar/stellar-sdk → Soroban RPC
                ↓
           contract.js (ABI mapping)
```

## Security

- All state-changing calls require Freighter signature
- `customer.require_auth()` and `owner.require_auth()` on-chain
- Network passphrase enforced in wallet + SDK
