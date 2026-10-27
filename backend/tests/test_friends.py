from dataclasses import replace
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.friends import MemoryStore
from app.main import app
from app.routes.friends import get_friend_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def store():
    s = MemoryStore()
    app.dependency_overrides[get_friend_store] = lambda: s
    yield s
    app.dependency_overrides.clear()


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


def code_of(user: str) -> str:
    return as_(user).put("/me", json={"name": user[:3]}).json()["code"]


def test_card_gets_a_code_and_a_name(store):
    r = as_(ANA).put("/me", json={"name": "  Ana ", "class_id": "warrior", "level": 4})
    assert r.status_code == 200
    assert r.json()["name"] == "Ana" and len(r.json()["code"]) == 6
    # Same code next time; only the fields sent change.
    again = as_(ANA).put("/me", json={"playing": "The Ember Road"}).json()
    assert again["code"] == r.json()["code"] and again["name"] == "Ana"


def test_ask_then_accept(store):
    ben = code_of(BEN)
    code_of(ANA)
    # Typed loosely: lowercase, with a dash.
    r = as_(ANA).post("/friends", json={"code": f"{ben[:3].lower()}-{ben[3:]}"})
    assert r.json()["status"] == "asked"
    assert [c["id"] for c in as_(ANA).get("/friends").json()["asks_out"]] == [BEN]
    assert [c["id"] for c in as_(BEN).get("/friends").json()["asks_in"]] == [ANA]
    assert as_(BEN).post(f"/friends/{ANA}/accept").json()["status"] == "friends"
    ana = as_(ANA).get("/friends").json()
    assert [c["id"] for c in ana["friends"]] == [BEN] and ana["asks_out"] == []
    assert ana["friends"][0]["online"] is True


def test_adding_back_is_a_yes(store):
    ana, ben = code_of(ANA), code_of(BEN)
    as_(ANA).post("/friends", json={"code": ben})
    assert as_(BEN).post("/friends", json={"code": ana}).json()["status"] == "friends"


def test_only_the_asked_can_accept(store):
    code_of(ANA)
    ben = code_of(BEN)
    as_(ANA).post("/friends", json={"code": ben})
    assert as_(ANA).post(f"/friends/{BEN}/accept").status_code == 404


def test_unknown_and_own_codes(store):
    mine = code_of(ANA)
    assert as_(ANA).post("/friends", json={"code": "ZZZZZZ"}).status_code == 404
    assert as_(ANA).post("/friends", json={"code": mine}).status_code == 400


def test_remove(store):
    code_of(ANA)
    ben = code_of(BEN)
    as_(ANA).post("/friends", json={"code": ben})
    as_(BEN).post(f"/friends/{ANA}/accept")
    assert as_(BEN).delete(f"/friends/{ANA}").status_code == 204
    assert as_(ANA).get("/friends").json()["friends"] == []


def test_playing_shows_only_while_online(store):
    code_of(ANA)
    ben = code_of(BEN)
    as_(ANA).post("/friends", json={"code": ben})
    as_(BEN).post(f"/friends/{ANA}/accept")
    as_(BEN).put("/me", json={"playing": "The Ember Road"})
    assert as_(ANA).get("/friends").json()["friends"][0]["playing"] == "The Ember Road"
    store.cards[BEN] = replace(
        store.cards[BEN], seen_at=store.cards[BEN].seen_at - timedelta(minutes=5)
    )
    f = as_(ANA).get("/friends").json()["friends"][0]
    assert f["online"] is False and f["playing"] is None
