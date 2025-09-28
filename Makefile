.PHONY: dev seed simulate test install clean

install:
	pnpm install

dev:
	pnpm dev

seed:
	pnpm seed

simulate:
	pnpm simulate

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck

build:
	pnpm build

clean:
	pnpm clean

# Docker commands for AI service
ai-build:
	docker build -t toursafe-ai ./apps/ai

ai-run:
	docker run -p 8000:8000 toursafe-ai

# Database commands
db-migrate:
	cd supabase && supabase db reset

db-status:
	cd supabase && supabase status
