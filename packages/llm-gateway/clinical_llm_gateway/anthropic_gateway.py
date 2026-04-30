import anthropic

from .base import BaseLlmGateway
from .models import LlmCompletion, LlmGatewaySettings

_SYSTEM_PROMPT = """You summarize clinical workflow context for internal orchestration.
Return a concise, provider-safe summary that preserves clinically relevant details,
notes privacy sensitivity, and avoids fabricated facts."""


class AnthropicGateway(BaseLlmGateway):
    def __init__(self, settings: LlmGatewaySettings) -> None:
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for the Anthropic provider.")

        self._settings = settings
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def summarize_clinical_context(
        self,
        *,
        workflow_id: str,
        patient_context: str,
        contains_sensitive_data: bool,
    ) -> LlmCompletion:
        response = self._client.messages.create(
            model=self._settings.anthropic_model,
            max_tokens=1024,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize this workflow input for downstream orchestration. "
                        f"Workflow ID: {workflow_id}. "
                        f"Contains sensitive data: {contains_sensitive_data}.\n\n"
                        f"Patient context:\n{patient_context}"
                    ),
                }
            ],
        )

        summary = "\n".join(
            block.text for block in response.content if block.type == "text"
        ).strip()

        return LlmCompletion(
            provider="anthropic",
            model=response.model,
            summary=summary,
        )
