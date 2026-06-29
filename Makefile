PY := backend/.venv/bin

.PHONY: help dev dev-sqlite db web test up down setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-12s %s\n", $$1, $$2}'

db: ## Start only Postgres (Docker) and wait until it's healthy
	docker compose up -d --wait db

dev: db ## Start Postgres (waits for healthy) then run the backend with reload
	cd backend && $(abspath $(PY))/uvicorn app.main:app --reload

dev-sqlite: ## Run the backend on a local SQLite file — no Docker, no Postgres
	cd backend && DATABASE_URL="sqlite:///./dev.db" $(abspath $(PY))/uvicorn app.main:app --reload

web: ## Run the Angular dev server (http://localhost:4200)
	cd frontend && npm start

test: ## Run the backend test suite
	cd backend && $(abspath $(PY))/pytest

up: ## Build and run the full stack in Docker (http://localhost)
	docker compose up --build

down: ## Stop all Docker containers (keeps the database volume)
	docker compose down

setup: ## One-time: create the backend venv and install all dependencies
	python3.12 -m venv backend/.venv
	$(PY)/pip install -r backend/requirements-dev.txt
	cd frontend && npm install
	npm install
