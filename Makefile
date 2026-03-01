# -----------------------------------------------------------------------------
# Colors
# -----------------------------------------------------------------------------

BLUE:=$(shell echo "\033[0;36m")
GREEN:=$(shell echo "\033[0;32m")
YELLOW:=$(shell echo "\033[0;33m")
RED:=$(shell echo "\033[0;31m")
END:=$(shell echo "\033[0m")

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------

define log_info
	@echo "\n$(BLUE) [INFO] *** $(1) ***$(END)\n"
endef

define log_warning
	@echo "\n$(YELLOW) [WARNING] *** $(1) ***$(END)\n"
endef

define log_error
	@echo "\n$(RED) [ERROR] *** $(1) ***$(END)\n"
endef

define log_success
	@echo "\n$(GREEN) [SUCCESS] *** $(1) ***$(END)\n"
endef


# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

ENV_LOCAL=local
ENV_DEVELOPMENT=development
ENV_PRODUCTION=production

# -----------------------------------------------------------------------------
# Targets
# -----------------------------------------------------------------------------

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: update-env
update-env: ## Update environment variables
	$(call log_info,Updating environment variables...)
	./config/helpers/setup_env.sh
	$(call log_success,Environment variables updated! 🎉)

.PHONY: setup
setup: ## Install dependencies, setup environment and husky hooks
	@make update-env
	$(call log_info,Installing dependencies...)
	pnpm install
	$(call log_info,Setting up Husky...)
	pnpm prepare
	$(call log_success,Setup complete! 🎉)

.PHONY: setup-local
setup-local: ## Setup local environment
	@make setup
	$(call log_info,Setting up direnv...)
	@echo "$(ENV_LOCAL)" > ./config/.env.current
	@direnv allow
	$(call log_success,Local environment setup complete! 🎉)

.PHONY: setup-development
setup-development: ## Setup development environment
	@make setup
	$(call log_info,Setting up direnv...)
	@echo "$(ENV_DEVELOPMENT)" > ./config/.env.current
	@direnv allow
	$(call log_success,Development environment setup complete! 🎉)

.PHONY: setup-production
setup-production: ## Setup production environment
	@make setup
	$(call log_info,Setting up direnv...)
	@echo "$(ENV_PRODUCTION)" > ./config/.env.current
	@direnv allow
	$(call log_success,Production environment setup complete! 🎉)

.PHONY: lint
lint: ## Run ESLint
	pnpm lint

.PHONY: lint-fix
lint-fix: ## Run ESLint fix
	pnpm lint:fix

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	pnpm typecheck

.PHONY: format
format: ## Run Prettier
	pnpm format

.PHONY: format-fix
format-fix: ## Run Prettier fix
	pnpm format:fix

.PHONY: clean
clean: ## Clean the project
	pnpm clean

.PHONY: test
test: ## Run tests
	pnpm test
