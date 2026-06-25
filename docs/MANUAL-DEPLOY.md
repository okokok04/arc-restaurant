# Deploy contract manually (Stellar Testnet)

The README contract ID `CBZCZQL4...` does **not** include `init`/`pay` from this repo.
Deploy your own copy, then set `VITE_CONTRACT_ID` on Vercel.

## Option A — GitHub Actions (recommended)

1. Open https://github.com/okokok04/arc-restaurant/actions/workflows/deploy-contract.yml
2. Click **Run workflow**
3. When green, copy **Contract ID** from job summary
4. Vercel → Project → Settings → Environment Variables:
   - `VITE_CONTRACT_ID` = new contract ID
   - `VITE_NETWORK` = `TESTNET`
5. Redeploy Vercel

## Option B — Stellar Laboratory

1. Build WASM locally (requires Rust):
   ```bash
   cargo build --target wasm32-unknown-unknown --release --package restaurant-contract
   ```
   Or install Soroban CLI and run `soroban contract build`.

2. Open https://laboratory.stellar.org/#smart-contracts?network=test
3. Upload `target/wasm32-unknown-unknown/release/restaurant_contract.wasm`
4. Deploy → copy Contract ID
5. Invoke `init` with your Freighter public key + name `"Arc Bistro"`

## After deploy

- **Init** may already be done by CI — if you see "already initialized", skip to **Pay**
- Fund Freighter on **Testnet** before transactions
- Update live app env and hard refresh
