import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.friends import MemoryStore as Friends
from app.gifts import MemoryStore as Gifts
from app.main import app
from app.routes.friends import get_friend_store
from app.routes.gifts import PER_DAY, get_gift_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"


@pytest.fixture
def stores():
    f, g = Friends(), Gifts()
    app.dependency_overrides[get_friend_store] = lambda: f
    app.dependency_overrides[get_gift_store] = lambda: g
    yield f, g
    app.dependency_overrides.clear()


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


def friends(a: str, b: str) -> None:
    code = as_(b).put("/me", json={"name": b[:3]}).json()["code"]
    as_(a).put("/me", json={"name": "Ana"})
    as_(a).post("/friends", json={"code": code})
    as_(b).post(f"/friends/{a}/accept")


def test_give_then_claim_once(stores):
    friends(ANA, BEN)
    r = as_(ANA).post("/gifts", json={"to": BEN, "mat": "shard", "n": 2})
    assert r.status_code == 200 and r.json()["left_today"] == PER_DAY - 2
    waiting = as_(BEN).get("/gifts").json()["gifts"]
    assert [(g["mat"], g["n"], g["from_name"]) for g in waiting] == [("shard", 2, "Ana")]
    assert len(as_(BEN).post("/gifts/claim").json()["gifts"]) == 1
    # Handed out once.
    assert as_(BEN).post("/gifts/claim").json()["gifts"] == []


def test_only_to_friends_and_real_materials(stores):
    friends(ANA, BEN)
    assert as_(ANA).post("/gifts", json={"to": CY, "mat": "shard", "n": 1}).status_code == 403
    assert as_(ANA).post("/gifts", json={"to": BEN, "mat": "gold", "n": 1}).status_code == 400


def test_so_many_a_day(stores):
    friends(ANA, BEN)
    assert (
        as_(ANA).post("/gifts", json={"to": BEN, "mat": "thread", "n": PER_DAY}).status_code == 200
    )
    assert as_(ANA).post("/gifts", json={"to": BEN, "mat": "thread", "n": 1}).status_code == 429
