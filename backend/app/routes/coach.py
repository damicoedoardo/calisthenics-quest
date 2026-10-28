"""The coach chat: POST /coach takes the player's brief and the chat so far (OpenAI style
messages), asks the model once, and returns its answer. When the answer calls tools, the phone
runs them and calls again with the results. Only signed-in players, and only so many messages a
day.
"""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import AuthedUser, get_authed_user
from app.coach import LiteLLMModel, Model, PgStore, UsageStore
from app.config import settings

router = APIRouter()

_store: UsageStore = PgStore()
_model: Model | None = None


def get_usage_store() -> UsageStore:
    return _store


def get_model() -> Model:
    global _model
    if not settings.litellm_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The coach is off")
    if _model is None:
        _model = LiteLLMModel()
    return _model


class Ask(BaseModel):
    brief: str = Field(max_length=16_000)
    messages: list[dict[str, Any]] = Field(min_length=1, max_length=120)


def _is_turn(m: dict[str, Any]) -> bool:
    """A message the player wrote, not a tool result going back."""
    return m.get("role") == "user"


@router.post("/coach")
async def ask(
    body: Ask,
    user: AuthedUser = Depends(get_authed_user),
    usage: UsageStore = Depends(get_usage_store),
    model: Model = Depends(get_model),
) -> dict[str, Any]:
    if len(json.dumps(body.messages)) > settings.max_coach_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Chat too long")
    if body.messages[-1].get("role") not in ("user", "tool"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The last message must be yours")
    turn = _is_turn(body.messages[-1])
    turns, calls = await usage.count(user.user_id, turn)
    if turns > settings.coach_turns_per_day or calls > settings.coach_calls_per_day:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "The coach rests until tomorrow")
    try:
        out = await model.ask(body.brief, body.messages, user.user_id)
    except HTTPException:
        raise
    except Exception as e:  # The model's own errors: say so plainly, keep the details in logs.
        print(f"coach: {type(e).__name__}: {e}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The coach can't answer right now")
    if out["finish_reason"] == "content_filter":
        out = {
            "message": {
                "role": "assistant",
                "content": "I can't help with that one. Back to training?",
            },
            "finish_reason": "stop",
        }
    return {**out, "left_today": max(0, settings.coach_turns_per_day - turns)}
