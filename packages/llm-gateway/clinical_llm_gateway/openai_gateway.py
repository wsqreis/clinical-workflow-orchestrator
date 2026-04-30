from openai import OpenAI

from .base import BaseLlmGateway
from .models import LlmCompletion, LlmGatewaySettings

_SYSTEM_PROMPT = """You summarize clinical workflow context for internal orchestration.
Return a concise, provider-safe summary that preserves clinically relevant details,
notes privacy sensitivity, and avoids fabricated facts."""


class OpenAIGateway(BaseLlmGateway):
    def __init__(self, settings: LlmGatewaySettings) -> None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for the OpenAI provider.")

        self._settings = settings
        self._client = OpenAI(api_key=settings.openai_api_key)

    def summarize_clinical_context(
        self,
        *,
        workflow_id: str,
        patient_context: str,
        contains_sensitive_data: bool,
    ) -> LlmCompletion:
        response = self._client.responses.create(
            model=self._settings.openai_model,
            input=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Summarize this workflow input for downstream orchestration. "
                        f"Workflow ID: {workflow_id}. "
                        f"Contains sensitive data: {contains_sensitive_data}.\n\n"
                        f"Patient context:\n{patient_context}"
                    ),
                },
            ],
        )

        summary = (response.output_text or "").strip()

        return LlmCompletion(
            provider="openai",
            model=response.model,
            summary=summary,
        )
