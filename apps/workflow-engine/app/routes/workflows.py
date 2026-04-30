from fastapi import APIRouter

from clinical_llm_gateway import create_llm_gateway

from app.schemas.workflow import WorkflowEvaluationRequest, WorkflowEvaluationResponse

router = APIRouter(tags=["workflows"])
llm_gateway = create_llm_gateway()


@router.post("/workflows/evaluate", response_model=WorkflowEvaluationResponse)
def evaluate_workflow(
    payload: WorkflowEvaluationRequest,
) -> WorkflowEvaluationResponse:
    recommended_actions = [
        "summarize_context",
        "flag_privacy_review" if payload.contains_sensitive_data else "queue_llm_analysis",
    ]
    completion = llm_gateway.summarize_clinical_context(
        workflow_id=payload.workflow_id,
        patient_context=payload.patient_context,
        contains_sensitive_data=payload.contains_sensitive_data,
    )

    return WorkflowEvaluationResponse(
        workflow_id=payload.workflow_id,
        status="accepted",
        recommended_actions=recommended_actions,
        summary=completion.summary,
    )
