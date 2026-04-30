from pydantic import BaseModel, Field


class WorkflowEvaluationRequest(BaseModel):
    workflow_id: str = Field(min_length=1)
    patient_context: str = Field(min_length=1)
    contains_sensitive_data: bool = True


class WorkflowEvaluationResponse(BaseModel):
    workflow_id: str
    status: str
    recommended_actions: list[str]
