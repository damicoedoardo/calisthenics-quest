from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.coach import TOOLS, MemoryStore
from app.config import settings
from app.main import app
from app.routes.coach import get_model, get_usage_store

ANA = "11111111-1111-4111-8111-111111111111"


class FakeModel:
    def __init__(self, stop: str = "stop") -> None:
        self.calls: list[tuple[str, list[dict[str, Any]]]] = []
        self.stop = stop

    async def ask(self, brief: str, messages: list[dict[str, Any]], user: str) -> dict[str, Any]:
        self.calls.append((brief, messages))
        return {"message": {"role": "assistant", "content": "Hi!"}, "finish_reason": self.stop}


@pytest.fixture
def fake():
    m, s = FakeModel(), MemoryStore()
    app.dependency_overrides[get_model] = lambda: m
    app.dependency_overrides[get_usage_store] = lambda: s
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=ANA, email=None)
    yield m
    app.dependency_overrides.clear()


def say(text: str) -> dict[str, Any]:
    return {"brief": "No setup yet.", "messages": [{"role": "user", "content": text}]}


def test_passes_brief_and_chat(fake):
    r = TestClient(app).post("/coach", json=say("hello"))
    assert r.status_code == 200
    assert r.json()["message"]["content"] == "Hi!"
    assert r.json()["left_today"] == settings.coach_turns_per_day - 1
    assert fake.calls == [("No setup yet.", [{"role": "user", "content": "hello"}])]


def test_tool_results_are_not_a_turn(fake):
    c = TestClient(app)
    c.post("/coach", json=say("hello"))
    back = [{"role": "tool", "tool_call_id": "t", "content": "ok"}]
    r = c.post("/coach", json={"brief": "", "messages": back})
    assert r.json()["left_today"] == settings.coach_turns_per_day - 1


def test_so_many_a_day(fake, monkeypatch):
    monkeypatch.setattr(settings, "coach_turns_per_day", 2)
    c = TestClient(app)
    assert c.post("/coach", json=say("1")).status_code == 200
    assert c.post("/coach", json=say("2")).status_code == 200
    assert c.post("/coach", json=say("3")).status_code == 429


def test_last_message_is_the_player(fake):
    bad = {"brief": "", "messages": [{"role": "assistant", "content": "hi"}]}
    assert TestClient(app).post("/coach", json=bad).status_code == 400


def test_filtered_becomes_a_kind_line(fake):
    fake.stop = "content_filter"
    r = TestClient(app).post("/coach", json=say("x"))
    assert r.json()["finish_reason"] == "stop" and r.json()["message"]["content"]


def test_off_without_a_key(monkeypatch):
    monkeypatch.setattr(settings, "litellm_key", "")
    app.dependency_overrides[get_usage_store] = lambda: MemoryStore()
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=ANA, email=None)
    try:
        assert TestClient(app).post("/coach", json=say("hi")).status_code == 503
    finally:
        app.dependency_overrides.clear()


def test_tools_are_tight():
    def check(s: dict[str, Any]) -> None:
        if s.get("type") == "object":
            assert s["additionalProperties"] is False
            assert set(s["required"]) <= set(s["properties"])
            for v in s["properties"].values():
                check(v)
        if s.get("type") == "array":
            check(s["items"])

    names = [t["function"]["name"] for t in TOOLS]
    assert len(names) == len(set(names))
    for t in TOOLS:
        check(t["function"]["parameters"])
