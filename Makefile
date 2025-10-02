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

# Python script commands (scripts/ directory)
py-install:
	cd scripts && pip install -r requirements.txt

py-seed:
	cd scripts && python seed.py

py-simulate:
	cd scripts && python simulate_tourist.py

py-simulate-incidents:
	cd scripts && python simulate_incidents.py

py-test-vc:
	cd scripts && python test_vc.py

py-demo:
	cd scripts && python demo_runner.py

# Combined commands for easy demo setup
demo-setup: py-install py-seed

demo-run: py-demo