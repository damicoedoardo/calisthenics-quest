import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app import friends as friends_mod
from app.auth import AuthedUser, get_authed_user
from app.config import settings
from app.main import app
from app.party import MemoryStore
from app.routes.friends import get_friend_store
from app.routes.party import get_party_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"
SECRET = "test-secret-that-is-long-enough-000"


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


@pytest.fixture
def party(monkeypatch):
    monkeypatch.setattr(settings, "livekit_url", "wss://voice.example.com")
    monkeypatch.setattr(settings, "livekit_api_key", "key1")
    monkeypatch.setattr(settings, "livekit_api_secret", SECRET)
    f, p = friends_mod.MemoryStore(), MemoryStore()
    app.dependency_overrides[get_friend_store] = lambda: f
    app.dependency_overrides[get_party_store] = lambda: p
    for u, n in ((ANA, "Ana"), (BEN, "Ben"), (CY, "Cy")):
        as_(u).put("/me", json={"name": n})
    f.pairs[(ANA, BEN)] = True
    as_(ANA).post("/party/invite", json={"friend_id": BEN})
    pid = as_(BEN).get("/party").json()["invites"][0]["party_id"]
    as_(BEN).post("/party/join", json={"party_id": pid})
    yield pid
    app.dependency_overrides.clear()


def test_members_get_a_pass_to_their_room(party):
    for who, name in ((ANA, "Ana"), (BEN, "Ben")):
        r = as_(who).post("/party/voice").json()
        assert r["url"] == "wss://voice.example.com" and r["room"] == f"party-{party}"
        claims = jwt.decode(r["token"], SECRET, algorithms=["HS256"])
        assert claims["sub"] == who and claims["name"] == name and claims["iss"] == "key1"
        assert claims["video"]["room"] == f"party-{party}" and claims["video"]["roomJoin"]
        assert claims["video"]["canPublishSources"] == ["microphone"]


def test_no_party_no_pass(party):
    assert as_(CY).post("/party/voice").status_code == 404


def test_voice_off_until_set_up(party, monkeypatch):
    monkeypatch.setattr(settings, "livekit_api_secret", "")
    assert as_(ANA).post("/party/voice").status_code == 503
