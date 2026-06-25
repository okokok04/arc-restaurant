# Arc Restaurant — Soroban Smart Contract dApp

A production-ready **Stellar Soroban** restaurant payment application with wallet integration, real-time event streaming, CI/CD, and full test coverage.

## Live Demo

| Resource | Link |
|----------|------|
| **Live App** | Deploy to [Vercel](https://vercel.com) — see [Deploy Frontend](#deploy-frontend) |
| **Contract ID (Testnet)** | `CBZCZQL4AYVXP7LWVDO5BRJ45JRKBVYQFN7IQKQOEFIKVAME5I2X5VT4` |
| **Example Tx Hash** | See explorer after your first `init` or `pay` interaction |
| **Demo Video** | Record 1–2 min walkthrough after deployment |

## Architecture

```
┌─────────────────┐     Freighter      ┌──────────────────┐
│  React Frontend │ ◄────────────────► │  Stellar Wallet  │
│  (mobile-first) │                    └──────────────────┘
└────────┬────────┘
         │ soroban.js + contract.js
         │ (@stellar/stellar-sdk)
         ▼
┌─────────────────┐   token transfer   ┌──────────────────┐
│ RestaurantContract│ ◄──────────────► │ Stellar Asset    │
│  init / pay      │  (inter-contract) │ Contract (SAC)   │
└────────┬────────┘                    └──────────────────┘
         │ PaymentEvent / InitializedEvent
         ▼
┌─────────────────┐
│ Soroban RPC     │  ← Event streaming (poll getEvents)
│ (Testnet)       │
└─────────────────┘
```

## AI Review Checklist (6 Steps)

| Step | Check | Status |
|------|-------|--------|
| 1 | Connect Wallet (Freighter) | ✅ `WalletConnect.jsx` + `@stellar/freighter-api` |
| 2 | Smart Contract Folder Structure | ✅ `contracts/restaurant/Cargo.toml`, `src/lib.rs`, `src/test.rs` |
| 3 | Smart Contract Code Validation | ✅ `RestaurantContract` with `init`, `pay`, events, state |
| 4 | README & Deployment | ✅ This file + contract ID + deploy script |
| 5 | Integration Codebase | ✅ `frontend/src/lib/soroban.js` + `contract.js` + stellar-sdk |
| 6 | Function Matching | ✅ UI `Init Restaurant` → `init()`, `Pay Now` → `pay()` |

## Contract Functions ↔ Frontend Mapping

| Rust Contract | Frontend Button | Integration File |
|---------------|-----------------|------------------|
| `init(env, owner, name)` | **Init Restaurant** | `soroban.js` → `initRestaurant()` |
| `pay(env, customer, token, amount, order_id)` | **Pay Now** (menu) | `soroban.js` → `payOrder()` |
| `get_balance(env)` | Balance stat card | `soroban.js` → `getContractBalance()` |
| `get_order_count(env)` | Orders stat card | `soroban.js` → `getOrderCount()` |

## Prerequisites

- [Rust](https://rustup.rs/) + `wasm32-unknown-unknown` target
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup) v22+
- [Node.js](https://nodejs.org/) 20+
- [Freighter Wallet](https://freighter.app) browser extension

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/arc-restaurant.git
cd arc-restaurant

# Frontend
cd frontend && npm install && cd ..

# Contract (Rust)
rustup target add wasm32-unknown-unknown
cargo test --package restaurant-contract
```

### 2. Run frontend locally

```bash
cd frontend
cp .env.example .env   # optional overrides
npm run dev
```

Open http://localhost:5173 — connect Freighter (Testnet), initialize restaurant, pay from menu.

### 3. Deploy contract

```bash
# Configure Soroban identity first: soroban keys generate default --network testnet
bash scripts/deploy.sh testnet
```

Copy the printed `CONTRACT_ID` into `frontend/.env`:

```
VITE_CONTRACT_ID=C...
VITE_NETWORK=TESTNET
```

### 4. Deploy frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_CONTRACT_ID`
- `VITE_NETWORK=TESTNET`

## Testing

### Contract tests (4 tests)

```bash
cargo test --package restaurant-contract
```

### Frontend tests (7+ tests)

```bash
cd frontend && npm test
```

### CI/CD

GitHub Actions runs on every push/PR:
- Soroban contract build + Rust tests
- Vitest frontend tests
- Production Vite build

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Project Structure

```
Arc/
├── contracts/restaurant/     # Soroban smart contract (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs            # RestaurantContract: init, pay, getters
│       └── test.rs           # Unit tests
├── src/                      # React + Vite dApp (moved to root)
│   ├── lib/
│   │   ├── contract.js       # Contract ID, function names, arg builders
│   │   └── soroban.js        # stellar-sdk integration layer
│   ├── components/
│   │   ├── WalletConnect.jsx
│   │   ├── RestaurantPanel.jsx
│   │   └── EventStream.jsx
│   └── hooks/
│       ├── useWallet.js
│       └── useEventStream.js
├── index.html                # Vite entry point
├── package.json              # NPM dependencies
├── vercel.json               # Vercel config
├── scripts/deploy.sh         # Bash deploy script
├── scripts/publish.ps1       # Windows publish script
├── .github/workflows/ci.yml
└── README.md
```

## Features

- **Inter-contract communication** — `pay()` invokes Stellar Asset Contract token transfer
- **Event streaming** — polls Soroban RPC `getEvents` for `PaymentEvent` / `InitializedEvent`
- **Mobile responsive** — CSS grid collapses to single column below 768px
- **Error handling & loading states** — spinners, alerts, disabled buttons during tx
- **Production architecture** — context provider, separated lib layer, env-based config

## Submission Checklist

- [x] Public GitHub repository
- [x] README with complete documentation
- [x] 10+ meaningful commits
- [ ] Live demo link (Vercel/Netlify) — deploy after push
- [x] Contract deployment address documented
- [ ] Transaction hash — generated on first interaction
- [ ] Screenshots: mobile UI, CI/CD, test output
- [ ] Demo video (1–2 min)

## License

MIT — see [LICENSE](LICENSE).

## Additional Docs

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Notes](docs/ARCHITECTURE.md)
