.PHONY: install dev-backend dev-frontend test lint clean

install:
	cd backend && .venv/bin/pip install -e ".[dev]"
	cd frontend && npm install

dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/pytest

lint:
	cd backend && .venv/bin/ruff check . && .venv/bin/mypy app
	cd frontend && npm run lint && npm run typecheck
