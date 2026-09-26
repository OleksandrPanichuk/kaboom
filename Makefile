
.PHONY: build test test-integration test-down logs migrate sh up up-db run-all add drop services down reset check generate gen db-generate db-migrate seed db-studio db-development db-shell restart redis-cache-cli redis-queue-cli redis-sessions-cli

OPTIONAL_SERVICES := bull_board drizzle_studio

ifeq (gen,$(firstword $(MAKECMDGOALS)))
GEN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(GEN_ARGS):;@:)
endif
ALL_PROFILES := $(shell echo '$(OPTIONAL_SERVICES)' | tr ' ' ',')

DB_URL ?= postgres://postgres:postgres@localhost:5432/postgres

build:
	docker compose build

TEST_COMPOSE = docker compose -f docker-compose.test.yml

test:
	@$(TEST_COMPOSE) up -d --wait db_test
	@bun run test

test-integration:
	@$(TEST_COMPOSE) --profile integration up -d --wait
	@TEST_SESSIONS_REDIS_URL=redis://localhost:6480 \
	 TEST_CACHE_REDIS_URL=redis://localhost:6481 \
	 TEST_RATE_LIMIT_REDIS_URL=redis://localhost:6480 \
	 TEST_JOBS_REDIS_URL=redis://localhost:6479 \
	 TEST_SMTP_URL=smtp://localhost:1125 \
	 TEST_MAILPIT_URL=http://localhost:8125 \
	 TEST_S3_ENDPOINT=http://localhost:9100 \
	 TEST_S3_BUCKET=test-bucket \
	 TEST_S3_ACCESS_KEY_ID=storageadmin \
	 TEST_S3_SECRET_ACCESS_KEY=storageadmin \
	 bun run test

test-down:
	@$(TEST_COMPOSE) --profile integration down -v

logs:
	docker compose logs -f

migrate:
	docker compose exec api bun src/db/migrate.ts

sh:
	docker compose exec api sh

up:
	docker compose up

run-all:
	COMPOSE_PROFILES="$(ALL_PROFILES)" docker compose up

add:
ifndef s
	$(error usage: make add s=<service>, one of: $(OPTIONAL_SERVICES))
endif
	@echo '$(OPTIONAL_SERVICES)' | tr ' ' '\n' | grep -qx '$(s)' \
		|| { echo "unknown service '$(s)'; expected one of: $(OPTIONAL_SERVICES)"; exit 1; }
	@project=$$(docker compose config --format json | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -1); \
	running=$$(docker ps --filter "label=com.docker.compose.project=$$project" \
		--format '{{.Label "com.docker.compose.service"}}'); \
	profiles=$$(printf '%s\n%s\n' "$$running" '$(s)' \
		| grep -Fx $(foreach svc,$(OPTIONAL_SERVICES),-e $(svc)) \
		| sort -u | paste -sd, -); \
	echo "starting $(s) (profiles: $$profiles)"; \
	COMPOSE_PROFILES="$$profiles" docker compose up -d --wait $(s)

drop:
ifndef s
	$(error usage: make drop s=<service>, one of: $(OPTIONAL_SERVICES))
endif
	docker compose stop $(s)
	docker compose rm -f $(s)

services:
	@project=$$(docker compose config --format json | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -1); \
	docker ps --filter "label=com.docker.compose.project=$$project" \
		--format '{{.Label "com.docker.compose.service"}}' | sort

up-db:
	docker compose up -d --wait db

down:
	COMPOSE_PROFILES="$(ALL_PROFILES)" docker compose down --remove-orphans

reset:
	COMPOSE_PROFILES="$(ALL_PROFILES)" docker compose down -v --remove-orphans
	docker compose up -d --wait

check:
	bun run lint
	bun run check-types
	bun run test

gen:
	@bun run gen $(GEN_ARGS) $(ARGS)

generate:
	bun run generate

db-generate:
	bun run --cwd apps/api db:generate

db-migrate:
	DATABASE_URL="${DB_URL}" bun run --cwd apps/api db:migrate

seed:
	DATABASE_URL="${DB_URL}" bun run --cwd apps/api db:seed

db-studio:
	bun run --cwd apps/api db:studio

db-development:
	@docker compose up -d --wait db
	@if command -v pgcli >/dev/null 2>&1; then \
		pgcli "$(DB_URL)"; \
	else \
		echo "pgcli not found, falling back to psql (install it with: brew install pgcli)"; \
		docker compose exec -it db psql -U postgres -d postgres; \
	fi

db-shell:
	docker compose exec -it db bash

restart:
ifndef s
	$(error usage: make restart s=<service>, e.g. make restart s=api)
endif
	@project=$$(docker compose config --format json | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -1); \
	running=$$(docker ps --filter "label=com.docker.compose.project=$$project" \
		--format '{{.Label "com.docker.compose.service"}}'); \
	profiles=$$(printf '%s\n%s\n' "$$running" '$(s)' \
		| grep -Fx $(foreach svc,$(OPTIONAL_SERVICES),-e $(svc)) \
		| sort -u | paste -sd, -); \
	COMPOSE_PROFILES="$$profiles" docker compose restart $(s)

redis-cache-cli:
	docker compose exec -it cache redis-cli

redis-queue-cli:
	docker compose exec -it queue_redis redis-cli

redis-sessions-cli:
	docker compose exec -it sessions redis-cli
