# Clinical Workflow Orchestrator

Backend platform for privacy-aware clinical workflow automation with a TypeScript API gateway, Python workflow engine, PostgreSQL persistence, and LLM provider abstractions.

## Planned architecture

- `apps/api-gateway`: public HTTP API and persistence boundary
- `apps/workflow-engine`: internal workflow and policy service
- `packages/llm-gateway`: provider abstractions for model access
- `packages/shared-types`: shared contracts between services
- `db/migrations`: database schema changes
- `tests/integration`: end-to-end integration coverage

## LLM provider configuration

The workflow engine loads its summarization provider from environment variables.

- `LLM_PROVIDER=anthropic|openai`
- `ANTHROPIC_API_KEY` and optional `ANTHROPIC_MODEL` (default `claude-opus-4-7`)
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` (default `gpt-4.1`)

The Anthropic adapter uses prompt caching on the stable system prompt and calls Claude with adaptive thinking enabled.

## Local services

- API gateway: `http://localhost:3000/api`
- API docs: `http://localhost:3000/api/docs`
- Workflow engine: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Current validation endpoints

- `GET /api/health`
- `POST /api/workflows`
- `GET /api/audit/workflows/:externalId`
- `GET /health`
- `POST /internal/workflows/evaluate`

## Privacy behavior

- Sensitive workflow context is scanned for basic direct identifiers before it is sent to an LLM provider.
- Workflow records store retention expiry metadata, privacy review flags, and redaction counts.
- Audit records expose workflow creation metadata and privacy-related orchestration decisions.

## Milestones

1. Project scaffold
2. API gateway baseline
3. Workflow engine baseline
4. Database foundation
5. Workflow intake vertical slice
6. LLM gateway MVP
7. Privacy and audit controls
8. Async processing and CI hardening
