import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.cheers import MemoryStore as Cheers
from app.friends import MemoryStore as Friends
from app.main import app
from app.routes.cheers import PER_DAY, get_cheer_store
from app.routes.friends import get_friend_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"


@pytest.fixture
def stores():
    f, c = Friends(), Cheers()
    app.dependency_overrides[get_friend_store] = lambda: f
    app.dependency_overrides[get_cheer_store] = lambda: c
    yield f, c
    app.dependency_overrides.clear()


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


def friends(a: str, b: str) -> None:
    code = as_(b).put("/me", json={"name": "Ben"}).json()["code"]
    as_(a).put("/me", json={"name": "Ana"})
    as_(a).post("/friends", json={"code": code})
    as_(b).post(f"/friends/{a}/accept")


def test_send_then_seen_once(stores):
    friends(ANA, BEN)
    r = as_(ANA).post("/cheers", json={"to": BEN, "text": "  One   more set!  "})
    assert r.status_code == 200 and r.json()["left_today"] == PER_DAY - 1
    got = as_(BEN).post("/cheers/take").json()["cheers"]
    assert [(c["from"], c["from_name"], c["text"]) for c in got] == [(ANA, "Ana", "One more set!")]
    assert as_(BEN).post("/cheers/take").json()["cheers"] == []


def test_only_to_friends_and_not_empty(stores):
    friends(ANA, BEN)
    assert as_(ANA).post("/cheers", json={"to": CY, "text": "Go"}).status_code == 403
    assert as_(ANA).post("/cheers", json={"to": BEN, "text": "   "}).status_code == 400
    assert as_(ANA).post("/cheers", json={"to": BEN, "text": "x" * 81}).status_code == 422


def test_so_many_a_day(stores):
    friends(ANA, BEN)
    for _ in range(PER_DAY):
        assert as_(ANA).post("/cheers", json={"to": BEN, "text": "Go"}).status_code == 200
    assert as_(ANA).post("/cheers", json={"to": BEN, "text": "Go"}).status_code == 429


def test_training_shows_while_online(stores):
    friends(ANA, BEN)
    as_(BEN).put("/me", json={"training": "Push day"})
    ben = next(f for f in as_(ANA).get("/friends").json()["friends"] if f["id"] == BEN)
    assert ben["training"] == "Push day"
    as_(BEN).put("/me", json={"training": None})
    ben = next(f for f in as_(ANA).get("/friends").json()["friends"] if f["id"] == BEN)
    assert ben["training"] is None
