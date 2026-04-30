import os

from .anthropic_gateway import AnthropicGateway
from .base import BaseLlmGateway
from .models import LlmGatewaySettings
from .openai_gateway import OpenAIGateway


def create_llm_gateway() -> BaseLlmGateway:
    settings = LlmGatewaySettings.model_validate(os.environ)

    if settings.provider == "anthropic":
        return AnthropicGateway(settings)

    if settings.provider == "openai":
        return OpenAIGateway(settings)

    raise ValueError(f"Unsupported LLM provider: {settings.provider}")
