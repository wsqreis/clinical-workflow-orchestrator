from fastapi import APIRouter

from clinical_llm_gateway import create_llm_gateway

from app.privacy.deidentification import DeidentificationService
from app.schemas.workflow import WorkflowEvaluationRequest, WorkflowEvaluationResponse

router = APIRouter(tags=["workflows"])
llm_gateway = create_llm_gateway()
deidentification_service = DeidentificationService()


@router.post("/workflows/evaluate", response_model=WorkflowEvaluationResponse)
def evaluate_workflow(
    payload: WorkflowEvaluationRequest,
) -> WorkflowEvaluationResponse:
    deidentified = deidentification_service.sanitize(payload.patient_context)
    privacy_review_required = payload.contains_sensitive_data or deidentified.redaction_count > 0
    recommended_actions = [
        "summarize_context",
        "flag_privacy_review" if privacy_review_required else "queue_llm_analysis",
    ]
    completion = llm_gateway.summarize_clinical_context(
        workflow_id=payload.workflow_id,
        patient_context=deidentified.sanitized_text,
        contains_sensitive_data=privacy_review_required,
    )

    return WorkflowEvaluationResponse(
        workflow_id=payload.workflow_id,
        status="accepted",
        recommended_actions=recommended_actions,
        summary=completion.summary,
        redaction_count=deidentified.redaction_count,
        privacy_review_required=privacy_review_required,
    )
