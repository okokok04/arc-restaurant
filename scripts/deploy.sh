#!/usr/bin/env bash
set -euo pipefail

NETWORK="${1:-testnet}"
CONTRACT_NAME="restaurant"

echo "==> Building Soroban contract..."
cd contracts/restaurant
soroban contract build

WASM_PATH="../../target/wasm32-unknown-unknown/release/restaurant_contract.wasm"

echo "==> Deploying to ${NETWORK}..."
DEPLOY_OUTPUT=$(soroban contract deploy \
  --wasm "$WASM_PATH" \
  --source-account default \
  --network "$NETWORK")

CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | tail -1)
echo "Contract ID: $CONTRACT_ID"

echo "==> Initializing contract..."
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source-account default \
  --network "$NETWORK" \
  -- init \
  --owner "$(soroban keys address default)" \
  --name "Arc Bistro"

echo ""
echo "Deployment complete!"
echo "CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Update frontend/.env:"
echo "VITE_CONTRACT_ID=$CONTRACT_ID"
