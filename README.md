# Clinical Workflow Orchestrator

Clinical Workflow Orchestrator is a monorepo for local clinical workflow intake, evaluation, and audit flows. It combines a NestJS API gateway, a FastAPI workflow engine, PostgreSQL persistence, Redis-backed queueing, and a Python LLM provider package.

## Current architecture

- `apps/api-gateway`: public NestJS API for workflow intake, status lookups, audit access, and queue orchestration
- `apps/workflow-engine`: internal FastAPI service for workflow evaluation and context sanitization
- `packages/llm-gateway`: Python provider abstraction package for Anthropic and OpenAI summarization
- `db/migrations`: PostgreSQL schema for workflow requests, runs, model responses, and audit events
- `docker-compose.yml`: local stack for the API gateway, workflow engine, PostgreSQL, and Redis

## Request flow

1. The API gateway accepts workflow intake requests at `POST /api/workflows`.
2. The gateway persists workflow metadata and enqueues background work through Redis/BullMQ.
3. The workflow engine evaluates clinical context through `POST /internal/workflows/evaluate`.
4. The workflow engine sanitizes supported identifiers before sending context to the configured LLM provider.
5. Audit and workflow status endpoints expose orchestration state from PostgreSQL.

## LLM provider configuration

The workflow engine selects its summarization provider from environment variables.

- `LLM_PROVIDER=anthropic|openai`
- `ANTHROPIC_API_KEY` and optional `ANTHROPIC_MODEL` (default `claude-opus-4-7`)
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` (default `gpt-4.1`)

The provider adapters validate credentials when the evaluation endpoint is called. Health endpoints stay available without LLM credentials, but LLM-backed evaluation requires a matching API key for the selected provider.

The Anthropic adapter uses prompt caching on the stable system prompt and calls Claude with adaptive thinking enabled.

## Local development with Docker

Start the full stack from the repository root:

```bash
docker compose up --build
```

Local services:

- API gateway: `http://localhost:3000/api`
- API docs: `http://localhost:3000/api/docs`
- Workflow engine: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Expected behavior:

- `GET /api/health` and `GET /health` should succeed without LLM credentials.
- `POST /internal/workflows/evaluate` requires credentials for the configured provider.
- If credentials are missing, the workflow engine should return a controlled service error instead of failing to start.

## Current endpoints

- `GET /api/health`
- `POST /api/workflows`
- `GET /api/workflows/:id`
- `GET /api/audit/workflows/:externalId`
- `GET /health`
- `POST /internal/workflows/evaluate`

## Privacy behavior

Current sanitization covers these identifier patterns before provider submission:

- Social Security numbers
- email addresses
- phone numbers

The workflow engine also tracks redaction counts and sets `privacy_review_required` when the request is already marked sensitive or when sanitization performs at least one redaction. The database schema stores retention expiry, privacy review state, model responses, and audit events for each workflow.
