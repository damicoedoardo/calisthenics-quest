import base64

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.friends import MemoryStore as Friends
from app.main import app
from app.routes.friends import ABOUT, PHOTO_BYTES, get_friend_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"

JPEG = base64.b64encode(b"\xff\xd8\xff\xe0" + b"x" * 100).decode()


@pytest.fixture
def store():
    f = Friends()
    app.dependency_overrides[get_friend_store] = lambda: f
    yield f
    app.dependency_overrides.clear()


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


def befriend(a: str, b: str, accept: bool = True) -> None:
    as_(a).put("/me", json={"name": "A"})
    code = as_(b).put("/me", json={"name": "B"}).json()["code"]
    as_(a).post("/friends", json={"code": code})
    if accept:
        as_(b).post(f"/friends/{a}/accept")


def test_profile_reaches_friends_only(store):
    befriend(ANA, BEN)
    befriend(CY, ANA, accept=False)
    out = as_(ANA).put("/me/profile", json={"place": "  Milan ", "about": "Back  at it"}).json()
    assert out == {"place": "Milan", "about": "Back at it", "photo": None}
    assert as_(ANA).get("/friends").json()["me"]["place"] == "Milan"
    [ana] = as_(BEN).get("/friends").json()["friends"]
    assert (ana["place"], ana["about"], ana["photo"]) == ("Milan", "Back at it", None)
    # Cy asked but Ana never said yes: Cy sees her card, not her profile.
    [card] = as_(CY).get("/friends").json()["asks_out"]
    assert "place" not in card and "about" not in card


def test_photo_friends_only(store):
    befriend(ANA, BEN)
    as_(CY).put("/me", json={"name": "Cy"})
    assert as_(ANA).get(f"/profiles/{ANA}/photo").status_code == 404
    out = as_(ANA).put("/me/photo", json={"photo": JPEG}).json()
    assert out["photo"]
    assert as_(BEN).get("/friends").json()["friends"][0]["photo"] == out["photo"]
    for who in (ANA, BEN):
        r = as_(who).get(f"/profiles/{ANA}/photo")
        assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert as_(CY).get(f"/profiles/{ANA}/photo").status_code == 404
    # Unfriended: gone.
    as_(BEN).delete(f"/friends/{ANA}")
    assert as_(BEN).get(f"/profiles/{ANA}/photo").status_code == 404
    assert as_(ANA).delete("/me/photo").json()["photo"] is None
    assert as_(ANA).get(f"/profiles/{ANA}/photo").status_code == 404


def test_limits(store):
    assert as_(ANA).put("/me/profile", json={"about": "x" * (ABOUT + 1)}).status_code == 422
    png = base64.b64encode(b"\x89PNG" + b"x" * 100).decode()
    assert as_(ANA).put("/me/photo", json={"photo": png}).status_code == 400
    big = base64.b64encode(b"\xff\xd8" + b"x" * PHOTO_BYTES).decode()
    assert as_(ANA).put("/me/photo", json={"photo": big}).status_code in (400, 422)
