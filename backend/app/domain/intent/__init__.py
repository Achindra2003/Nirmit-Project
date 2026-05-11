"""Intent execution — turns a list of structured Intents into a new RoomState.

This is the deterministic, side-effect-free counterpart to the LLM-driven
collaborator. The collaborator emits Intents; this module applies them;
/apply uses it directly.

The solver re-runs after any spatial change so the room remains valid (no
overlaps, walkways respected, Vastu zones honored).
"""
from app.domain.intent.executor import IntentExecutionError, apply_intents

__all__ = ["IntentExecutionError", "apply_intents"]
