import pytest
from fastapi.testclient import TestClient

from app import friends as friends_mod
from app.auth import AuthedUser, get_authed_user
from app.main import app
from app.party import MemoryStore
from app.routes.friends import get_friend_store
from app.routes.party import get_party_store

ANA = "11111111-1111-4111-8111-111111111111"
BEN = "22222222-2222-4222-8222-222222222222"
CY = "33333333-3333-4333-8333-333333333333"


def as_(user: str) -> TestClient:
    app.dependency_overrides[get_authed_user] = lambda: AuthedUser(user_id=user, email=None)
    return TestClient(app)


@pytest.fixture
def stores():
    f, p = friends_mod.MemoryStore(), MemoryStore()
    app.dependency_overrides[get_friend_store] = lambda: f
    app.dependency_overrides[get_party_store] = lambda: p
    # Ana is friends with Ben and Cy.
    for u in (ANA, BEN, CY):
        as_(u).put("/me", json={"name": u[:2]})
    for u in (BEN, CY):
        f.pairs[(ANA, u)] = True
    yield f, p
    app.dependency_overrides.clear()


def test_invite_join_ready_start(stores):
    r = as_(ANA).post("/party/invite", json={"friend_id": BEN}).json()
    assert r["party"]["leader"] == ANA and [c["id"] for c in r["party"]["invited"]] == [BEN]
    inv = as_(BEN).get("/party").json()["invites"]
    assert inv[0]["from"]["id"] == ANA
    pid = inv[0]["party_id"]
    party = as_(BEN).post("/party/join", json={"party_id": pid}).json()["party"]
    assert [m["id"] for m in party["members"]] == [ANA, BEN] and party["invited"] == []
    # Not ready yet: no start.
    assert as_(ANA).post("/party/start").status_code == 409
    as_(BEN).put("/party/ready", json={"ready": True})
    started = as_(ANA).post("/party/start").json()["party"]
    assert started["started_at"] and isinstance(started["seed"], int)
    # Back in the lobby, ready flags cleared for the next run.
    assert not any(m["ready"] for m in started["members"])


def test_only_friends_and_only_the_leader(stores):
    assert as_(BEN).post("/party/invite", json={"friend_id": CY}).status_code == 403
    as_(ANA).post("/party/invite", json={"friend_id": BEN})
    pid = as_(BEN).get("/party").json()["invites"][0]["party_id"]
    as_(BEN).post("/party/join", json={"party_id": pid})
    assert as_(BEN).put("/party/zone", json={"zone": 2}).status_code == 403
    assert as_(ANA).put("/party/zone", json={"zone": 2}).json()["party"]["zone"] == 2


def test_no_join_without_invite(stores):
    as_(ANA).post("/party/invite", json={"friend_id": BEN})
    pid = as_(BEN).get("/party").json()["invites"][0]["party_id"]
    assert as_(CY).post("/party/join", json={"party_id": pid}).status_code == 404


def test_leader_leaves_next_leads_last_out_ends_it(stores):
    as_(ANA).post("/party/invite", json={"friend_id": BEN})
    pid = as_(BEN).get("/party").json()["invites"][0]["party_id"]
    as_(BEN).post("/party/join", json={"party_id": pid})
    assert as_(ANA).post("/party/leave").json()["party"] is None
    assert as_(BEN).get("/party").json()["party"]["leader"] == BEN
    as_(BEN).post("/party/leave")
    _, p = stores
    assert p.parties == {}


def test_decline(stores):
    as_(ANA).post("/party/invite", json={"friend_id": BEN})
    pid = as_(BEN).get("/party").json()["invites"][0]["party_id"]
    assert as_(BEN).post("/party/decline", json={"party_id": pid}).json()["invites"] == []
    assert as_(ANA).get("/party").json()["party"]["invited"] == []
