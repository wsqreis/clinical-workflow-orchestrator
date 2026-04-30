from fastapi import APIRouter

from app.schemas.workflow import WorkflowEvaluationRequest, WorkflowEvaluationResponse

router = APIRouter(tags=["workflows"])


@router.post("/workflows/evaluate", response_model=WorkflowEvaluationResponse)
def evaluate_workflow(
    payload: WorkflowEvaluationRequest,
) -> WorkflowEvaluationResponse:
    recommended_actions = [
        "summarize_context",
        "flag_privacy_review" if payload.contains_sensitive_data else "queue_llm_analysis",
    ]

    return WorkflowEvaluationResponse(
        workflow_id=payload.workflow_id,
        status="accepted",
        recommended_actions=recommended_actions,
        summary=f"Workflow accepted for context length {len(payload.patient_context)}.",
    )
