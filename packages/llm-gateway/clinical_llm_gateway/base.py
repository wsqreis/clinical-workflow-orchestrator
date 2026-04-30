from abc import ABC, abstractmethod

from .models import LlmCompletion


class BaseLlmGateway(ABC):
    @abstractmethod
    def summarize_clinical_context(
        self,
        *,
        workflow_id: str,
        patient_context: str,
        contains_sensitive_data: bool,
    ) -> LlmCompletion:
        raise NotImplementedError
