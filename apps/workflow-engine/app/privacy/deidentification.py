import re

_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]"),
    (re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b\+?\d[\d\s().-]{7,}\d\b"), "[REDACTED_PHONE]"),
]


class DeidentificationResult:
    def __init__(self, sanitized_text: str, redaction_count: int) -> None:
        self.sanitized_text = sanitized_text
        self.redaction_count = redaction_count


class DeidentificationService:
    def sanitize(self, patient_context: str) -> DeidentificationResult:
        sanitized_text = patient_context
        redaction_count = 0

        for pattern, replacement in _PATTERNS:
            sanitized_text, replacements = pattern.subn(replacement, sanitized_text)
            redaction_count += replacements

        return DeidentificationResult(
            sanitized_text=sanitized_text,
            redaction_count=redaction_count,
        )
