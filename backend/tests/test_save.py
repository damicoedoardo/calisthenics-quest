import time

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.auth import AuthedUser, get_authed_user, get_settings
from app.config import Settings
from app.main import app
from app.routes.save import get_store
from app.saves import MemoryStore

USER = "8b0e1c6a-5a7e-4f43-9d2c-1f1b2c3d4e5f"


def save(workouts: int = 0) -> dict:
    return {"version": 3, "sessions": [{"date": "2026-10-27"}] * workouts, "profile": {}}


@pytest.fixture
def client():
    store = MemoryStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=USER, email=None)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_no_save_yet(client):
    assert client.get("/save").status_code == 404


def test_first_upload_then_read_back(client):
    r = client.put("/save", json={"data": save(2), "base_rev": None})
    assert r.status_code == 200
    assert r.json()["rev"] == 1 and r.json()["workouts"] == 2 and "data" not in r.json()
    got = client.get("/save").json()
    assert got["rev"] == 1 and got["data"] == save(2)


def test_write_on_the_rev_you_saw(client):
    client.put("/save", json={"data": save(1), "base_rev": None})
    r = client.put("/save", json={"data": save(2), "base_rev": 1})
    assert r.status_code == 200 and r.json()["rev"] == 2


def test_stale_phone_never_overwrites(client):
    client.put("/save", json={"data": save(1), "base_rev": None})
    client.put("/save", json={"data": save(5), "base_rev": 1})  # another phone moves on
    r = client.put("/save", json={"data": save(2), "base_rev": 1})
    assert r.status_code == 409
    assert r.json()["current"]["workouts"] == 5 and r.json()["current"]["rev"] == 2
    # A second first upload clashes too.
    assert client.put("/save", json={"data": save(9), "base_rev": None}).status_code == 409
    # Keeping this phone's save: send it again on the cloud's rev.
    assert client.put("/save", json={"data": save(2), "base_rev": 2}).json()["rev"] == 3


def test_rejects_what_is_not_a_save(client):
    assert client.put("/save", json={"data": {"hello": 1}}).status_code == 422
    assert client.put("/save", json={"data": {"version": "3", "sessions": []}}).status_code == 422
    assert client.put("/save", content=b"not json").status_code == 422


def test_rejects_a_huge_save(client):
    big = save() | {"pad": "x" * 2_100_000}
    assert client.put("/save", json={"data": big}).status_code == 413


def test_delete(client):
    client.put("/save", json={"data": save(1)})
    assert client.delete("/save").status_code == 204
    assert client.get("/save").status_code == 404


def test_needs_a_login():
    app.dependency_overrides[get_store] = lambda: MemoryStore()
    try:
        c = TestClient(app)
        assert c.get("/save").status_code == 401
        assert c.get("/save", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_checks_the_token_signature():
    secret = "test-secret"
    app.dependency_overrides[get_store] = lambda: MemoryStore()
    app.dependency_overrides[get_settings] = lambda: Settings(
        supabase_jwt_secret=secret, supabase_allow_legacy_hs256=True
    )
    claims = {"sub": USER, "aud": "authenticated", "exp": int(time.time()) + 60}
    try:
        c = TestClient(app)
        good = jwt.encode(claims, secret, algorithm="HS256")
        bad = jwt.encode(claims, "wrong", algorithm="HS256")
        expired = jwt.encode(claims | {"exp": int(time.time()) - 60}, secret, algorithm="HS256")
        assert c.get("/save", headers={"Authorization": f"Bearer {good}"}).status_code == 404
        assert c.get("/save", headers={"Authorization": f"Bearer {bad}"}).status_code == 401
        assert c.get("/save", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    finally:
        app.dependency_overrides.clear()
