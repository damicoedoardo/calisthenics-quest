from jose import jwt

from app.config import settings
from tests.test_voice import ANA, BEN, CY, as_, party  # noqa: F401  (the fixture)

PLAY_SECRET = "play-secret-that-is-long-enough-0000"


def test_members_get_a_pass_once_the_run_started(party, monkeypatch):  # noqa: F811
    monkeypatch.setattr(settings, "play_url", "wss://api.example.com/play")
    monkeypatch.setattr(settings, "play_secret", PLAY_SECRET)
    assert as_(BEN).post("/party/play").status_code == 409
    as_(BEN).put("/party/ready", json={"ready": True})
    assert as_(ANA).post("/party/start").status_code == 200
    r = as_(BEN).post("/party/play")
    assert r.status_code == 200
    body = r.json()
    assert body["url"] == "wss://api.example.com/play"
    claims = jwt.decode(body["token"], PLAY_SECRET, algorithms=["HS256"])
    assert claims["sub"] == BEN
    assert claims["party"] == party
    assert claims["users"] == [ANA, BEN]
    assert isinstance(claims["seed"], int)


def test_no_party_no_pass(party, monkeypatch):  # noqa: F811
    monkeypatch.setattr(settings, "play_url", "wss://api.example.com/play")
    monkeypatch.setattr(settings, "play_secret", PLAY_SECRET)
    assert as_(CY).post("/party/play").status_code == 404


def test_off_until_set_up(party):  # noqa: F811
    assert as_(ANA).post("/party/play").status_code == 503
