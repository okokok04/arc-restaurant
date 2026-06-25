# Deployment Guide

## Contract (Soroban Testnet)

1. Install Soroban CLI v22+
2. Generate identity: `soroban keys generate default --network testnet`
3. Fund account via [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
4. Run: `bash scripts/deploy.sh testnet`
5. Save the printed `CONTRACT_ID`

## Frontend (Vercel)

1. Push repo to GitHub
2. Import project in Vercel, set root to `frontend`
3. Add env vars from `frontend/.env.example`
4. Deploy — your live demo URL is ready for submission

## Verify AI Review Steps

After deploy, confirm:
- Freighter connects on live URL (Step 1)
- `soroban.js` / `contract.js` present in repo (Step 5)
- Init + Pay buttons work on testnet (Step 6)
