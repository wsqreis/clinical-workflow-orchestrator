from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ProviderName = Literal["anthropic", "openai"]


class LlmCompletion(BaseModel):
    provider: ProviderName
    model: str
    summary: str


class LlmGatewaySettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: ProviderName = Field(default="anthropic", alias="LLM_PROVIDER")
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(
        default="claude-opus-4-7",
        alias="ANTHROPIC_MODEL",
    )
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4.1", alias="OPENAI_MODEL")
