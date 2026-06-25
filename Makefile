.PHONY: test test-contract test-frontend build dev

test: test-contract test-frontend

test-contract:
	cargo test --package restaurant-contract

test-frontend:
	cd frontend && npm test

build:
	cd frontend && npm run build

dev:
	cd frontend && npm run dev
