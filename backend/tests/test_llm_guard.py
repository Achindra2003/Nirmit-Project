from app.llm.guard import LlmQuotaGate, is_rate_limit_error, safe_llm_invoke


def test_rate_limit_detection():
    class RateLimitError(Exception):
        pass

    assert is_rate_limit_error(RateLimitError("429 rate_limit_exceeded"))


def test_quota_gate_trips_and_blocks():
    LlmQuotaGate.reset()
    LlmQuotaGate.trip(Exception("429 rate limit — try again in 2m30.5s"))
    assert LlmQuotaGate.is_open()

    class FakeLlm:
        def invoke(self, _msgs):
            raise AssertionError("should not call LLM while gate is open")

    assert safe_llm_invoke(FakeLlm(), [], context="test") is None
    LlmQuotaGate.reset()
