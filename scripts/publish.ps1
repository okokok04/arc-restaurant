# Publish Arc Nexus to GitHub + Vercel
# Usage: .\scripts\publish.ps1 -GitHubUser YOUR_USERNAME

param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubUser,

    [string]$RepoName = "arc-restaurant",
    [string]$ContractId = "CBZCZQL4AYVXP7LWVDO5BRJ45JRKBVYQFN7IQKQOEFIKVAME5I2X5VT4"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

Set-Location $Root

Write-Host "`n==> Checking GitHub auth..." -ForegroundColor Cyan
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Opening GitHub login..." -ForegroundColor Yellow
    gh auth login -h github.com -p https -w
}

Write-Host "`n==> Running tests..." -ForegroundColor Cyan
cargo test --package restaurant-contract
Set-Location frontend
npm test
Set-Location $Root

Write-Host "`n==> Creating GitHub repo and pushing..." -ForegroundColor Cyan
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    gh repo create "$GitHubUser/$RepoName" --public --source=. --remote=origin --push
} else {
    git push -u origin master
}

Write-Host "`n==> Deploying to Vercel..." -ForegroundColor Cyan
Set-Location frontend

if (-not (Test-Path ".env")) {
    @"
VITE_NETWORK=TESTNET
VITE_CONTRACT_ID=$ContractId
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
"@ | Set-Content .env
}

npx vercel --prod --yes `
    --env "VITE_NETWORK=TESTNET" `
    --env "VITE_CONTRACT_ID=$ContractId" `
    --env "VITE_RPC_URL=https://soroban-testnet.stellar.org" `
    --env "VITE_HORIZON_URL=https://horizon-testnet.stellar.org"

Write-Host "`n==> Done! Check output above for live URL." -ForegroundColor Green
