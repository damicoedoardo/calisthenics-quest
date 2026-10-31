import base64

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthedUser, get_authed_user
from app.cheers import MemoryStore as Cheers
from app.feed import MemoryStore as Feed
from app.friends import MemoryStore as Friends
from app.main import app
from app.routes.cheers import get_cheer_store
from app.routes.feed import PER_DAY, PHOTO_BYTES, get_feed_store
from app.routes.friends import get_friend_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"

WORKOUT = {"title": "Push day", "minutes": 38, "sets": 12, "exercises": ["Push-up", "Dip"]}
JPEG = base64.b64encode(b"\xff\xd8\xff\xe0" + b"x" * 100).decode()


@pytest.fixture
def stores():
    f, c, d = Friends(), Cheers(), Feed()
    app.dependency_overrides[get_friend_store] = lambda: f
    app.dependency_overrides[get_cheer_store] = lambda: c
    app.dependency_overrides[get_feed_store] = lambda: d
    yield f, c, d
    app.dependency_overrides.clear()


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


def friends(a: str, b: str) -> None:
    as_(a).put("/me", json={"name": "Ana"})
    code = as_(b).put("/me", json={"name": "Ben"}).json()["code"]
    as_(a).post("/friends", json={"code": code})
    as_(b).post(f"/friends/{a}/accept")


def test_share_and_friends_see_it(stores):
    friends(ANA, BEN)
    as_(CY).put("/me", json={"name": "Cy"})
    post = as_(ANA).post("/feed", json={"workout": WORKOUT, "text": " Felt  great ", "photo": JPEG})
    assert post.status_code == 200
    p = post.json()
    assert p["text"] == "Felt great" and p["photo"] and p["mine"]
    seen = as_(BEN).get("/feed").json()["posts"]
    assert [(x["id"], x["author"]["name"], x["mine"]) for x in seen] == [(p["id"], "Ana", False)]
    # Not a friend: no feed, no photo.
    assert as_(CY).get("/feed").json()["posts"] == []
    assert as_(CY).get(f"/feed/{p['id']}/photo").status_code == 404
    photo = as_(BEN).get(f"/feed/{p['id']}/photo")
    assert photo.status_code == 200 and photo.headers["content-type"] == "image/jpeg"


def test_flames_and_comments(stores):
    friends(ANA, BEN)
    pid = as_(ANA).post("/feed", json={"workout": WORKOUT}).json()["id"]
    assert as_(BEN).post(f"/feed/{pid}/flame").json() == {"flamed": True, "flames": 1}
    assert as_(BEN).post(f"/feed/{pid}/flame").json() == {"flamed": False, "flames": 0}
    out = as_(BEN).post(f"/feed/{pid}/comments", json={"text": "Beast!"}).json()
    [c] = out["comments"]
    assert (c["name"], c["text"]) == ("Ben", "Beast!")
    assert as_(CY).post(f"/feed/{pid}/comments", json={"text": "hi"}).status_code == 404
    # Ana can take a comment off her own post; Cy can't touch it.
    assert as_(CY).delete(f"/feed/comments/{c['id']}").status_code == 404
    assert as_(ANA).delete(f"/feed/comments/{c['id']}").status_code == 204
    assert as_(ANA).get("/feed").json()["posts"][0]["comments"] == []


def test_only_the_author_deletes(stores):
    friends(ANA, BEN)
    pid = as_(ANA).post("/feed", json={"workout": WORKOUT}).json()["id"]
    assert as_(BEN).delete(f"/feed/{pid}").status_code == 404
    assert as_(ANA).delete(f"/feed/{pid}").status_code == 204
    assert as_(BEN).get("/feed").json()["posts"] == []


def test_cheers_during_the_workout_show(stores):
    friends(ANA, BEN)
    as_(BEN).post("/cheers", json={"to": ANA, "text": "Go!"})
    p = as_(ANA).post("/feed", json={"workout": WORKOUT}).json()
    assert p["cheered_by"] == ["Ben"]


def test_bad_photos_and_limits(stores):
    friends(ANA, BEN)
    png = base64.b64encode(b"\x89PNG" + b"x" * 10).decode()
    assert as_(ANA).post("/feed", json={"workout": WORKOUT, "photo": png}).status_code == 400
    big = base64.b64encode(b"\xff\xd8" + b"x" * PHOTO_BYTES).decode()
    assert as_(ANA).post("/feed", json={"workout": WORKOUT, "photo": big}).status_code in (400, 422)
    for _ in range(PER_DAY):
        assert as_(ANA).post("/feed", json={"workout": WORKOUT}).status_code == 200
    assert as_(ANA).post("/feed", json={"workout": WORKOUT}).status_code == 429
