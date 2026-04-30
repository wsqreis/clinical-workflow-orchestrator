from fastapi import FastAPI

from app.routes.health import router as health_router
from app.routes.workflows import router as workflows_router

app = FastAPI(
    title="Clinical Workflow Orchestrator Workflow Engine",
    version="0.1.0",
    description="Internal service for workflow and policy execution.",
)

app.include_router(health_router)
app.include_router(workflows_router, prefix="/internal")
