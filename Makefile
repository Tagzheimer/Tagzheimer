# Tagzheimer Makefile
# Common commands for development + deployment.
#
# Uses Bun for backend + frontend (10-30× faster installs, smaller Docker images).
# Uses npm for the mobile app (Expo has rough edges with Bun).

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Colors
COLOR_RESET = \033[0m
COLOR_CMD   = \033[1;36m
COLOR_DESC  = \033[0;37m

.PHONY: help

help:  ## Show this help
	@echo ""
	@echo "Tagzheimer — available commands (uses Bun for backend + frontend, npm for mobile):"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk \
	  'BEGIN { FS = ":.*?## " } { printf "  $(COLOR_CMD)%-20s$(COLOR_RESET) $(COLOR_DESC)%s$(COLOR_RESET)\n", $$1, $$2 }'
	@echo ""

# === Development ===

.PHONY: dev
dev:  ## Start backend + frontend in demo mode (Bun)
	@echo "Starting Tagzheimer dev stack..."
	@(cd backend  && DEMO_MODE=true PORT=5000 bun run server.js) &
	@(cd frontend && bun run dev) &
	@wait

.PHONY: dev-backend
dev-backend:  ## Start only the backend (demo mode, Bun)
	cd backend && DEMO_MODE=true PORT=5000 bun run server.js

.PHONY: dev-frontend
dev-frontend:  ## Start only the frontend (Bun)
	cd frontend && bun run dev

.PHONY: dev-mobile
dev-mobile:  ## Start the Expo dev server for the Android tracker app (npm + expo)
	cd mobile && npx expo start

# === Install ===

.PHONY: install
install:  ## Install dependencies (Bun for backend+frontend, npm for mobile)
	@echo "Installing backend deps (Bun)..."
	@(cd backend  && bun install --frozen-lockfile) && \
	 (cd frontend && bun install --frozen-lockfile) && \
	 (echo "Installing mobile deps (npm, --legacy-peer-deps)..." && \
	  cd mobile && npm install --no-audit --no-fund --legacy-peer-deps)
	@echo "✓ All dependencies installed"

.PHONY: install-backend
install-backend:  ## Install backend deps (Bun)
	cd backend && bun install --frozen-lockfile

.PHONY: install-frontend
install-frontend:  ## Install frontend deps (Bun)
	cd frontend && bun install --frozen-lockfile

.PHONY: install-mobile
install-mobile:  ## Install mobile app deps (npm, --legacy-peer-deps)
	cd mobile && npm install --no-audit --no-fund --legacy-peer-deps

# === Tests ===

.PHONY: test
test:  ## Run all test suites
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@$(MAKE) test-mobile

.PHONY: test-backend
test-backend:  ## Test the backend endpoints (Bun runtime, demo mode)
	bash /home/z/my-project/scripts/test_backend.sh

.PHONY: test-frontend
test-frontend:  ## Verify the frontend builds (Bun)
	cd frontend && bun run build

.PHONY: test-mobile
test-mobile:  ## TypeScript-check the mobile app (npm)
	cd mobile && npx tsc --noEmit

.PHONY: test-mobile-bundle
test-mobile-bundle:  ## Verify the mobile app bundles for Android
	cd mobile && npx expo export --platform android

# === Docker ===

.PHONY: docker-up
docker-up:  ## Start the full stack via docker-compose (Mongo + backend + frontend)
	docker compose up -d --build
	@echo ""
	@echo "✓ Stack running:"
	@echo "  Frontend: http://localhost:8080"
	@echo "  Backend:  http://localhost:5000/api/health"
	@echo "  Mongo:    mongodb://localhost:27017"

.PHONY: docker-down
docker-down:  ## Stop the docker-compose stack
	docker compose down

.PHONY: docker-logs
docker-logs:  ## Tail docker-compose logs
	docker compose logs -f

.PHONY: docker-clean
docker-clean:  ## Stop stack and wipe volumes (DESTROYS data)
	docker compose down -v

# === Deploy ===

.PHONY: deploy
deploy:  ## Deploy via the deploy.sh script (interactive)
	bash deploy.sh

# === Cleanup ===

.PHONY: clean
clean:  ## Remove node_modules + build artifacts
	rm -rf backend/node_modules frontend/node_modules mobile/node_modules
	rm -rf frontend/dist mobile/dist mobile/.expo
	@echo "✓ Cleaned"
