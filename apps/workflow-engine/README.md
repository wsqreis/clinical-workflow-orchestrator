# Workflow Engine

Internal FastAPI service for workflow evaluation, privacy-aware policy checks, and LLM task orchestration.

## Run locally

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install .
uvicorn app.main:app --reload --port 8000
```
