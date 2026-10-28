"""Parties: invite a friend, join or decline, ready up, pick the zone, start (GET/POST /party...).

The app looks at GET /party every few seconds while its lobby is open, and the heartbeat
(PUT /me) says whether an invite is waiting. A start is a seed and a time: every phone that sees
a start it hasn't played walks in with the same zone and seed.
"""

import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app import voice
from app.auth import AuthedUser, get_authed_user
from app.config import settings
from app.friends import FriendStore
from app.party import MAX_PARTY, Party, PartyStore, PgStore
from app.routes.friends import card_json, get_friend_store

router = APIRouter()

_store: PartyStore = PgStore()


def get_party_store() -> PartyStore:
    return _store


class InviteBody(BaseModel):
    friend_id: UUID


class PartyRef(BaseModel):
    party_id: UUID


class ReadyBody(BaseModel):
    ready: bool


class ZoneBody(BaseModel):
    zone: int = Field(ge=0, le=99)


async def _view(user_id: str, parties: PartyStore, friends: FriendStore) -> dict[str, Any]:
    now = datetime.now(UTC)
    party = await parties.of(user_id)
    invites = await parties.invites_to(user_id)
    ids = {i.from_id for i in invites}
    if party:
        ids |= {m.user_id for m in party.members} | set(party.invited)
    cards = {p.user_id: card_json(p, now) for p in await friends.many(sorted(ids))}
    out: dict[str, Any] = {"party": None, "invites": []}
    if party:
        out["party"] = {
            "id": party.id,
            "leader": party.leader,
            "zone": party.zone,
            "seed": party.seed,
            "started_at": party.started_at.isoformat() if party.started_at else None,
            "members": [
                {**cards[m.user_id], "ready": m.ready, "leader": m.user_id == party.leader}
                for m in party.members
                if m.user_id in cards
            ],
            "invited": [cards[i] for i in party.invited if i in cards],
        }
    out["invites"] = [
        {"party_id": i.party_id, "from": cards[i.from_id]} for i in invites if i.from_id in cards
    ]
    return out


async def _led(user: AuthedUser, parties: PartyStore) -> Party:
    party = await parties.of(user.user_id)
    if not party:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You're not in a party")
    if party.leader != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the party's leader can do that")
    return party


@router.get("/party")
async def get_party(
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    return await _view(user.user_id, parties, friends)


@router.post("/party/invite")
async def invite(
    body: InviteBody,
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    to = str(body.friend_id)
    links = await friends.links(user.user_id)
    if not any(x.other == to and x.accepted for x in links):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only invite friends")
    party = await parties.of(user.user_id) or await parties.create(user.user_id)
    if any(m.user_id == to for m in party.members):
        return await _view(user.user_id, parties, friends)
    if len(party.members) + len(party.invited) >= MAX_PARTY:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"A party is up to {MAX_PARTY} heroes")
    await parties.invite(party.id, to, user.user_id)
    return await _view(user.user_id, parties, friends)


@router.post("/party/join")
async def join(
    body: PartyRef,
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    pid = str(body.party_id)
    if not any(i.party_id == pid for i in await parties.invites_to(user.user_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That invite is gone")
    party = await parties.get(pid)
    if not party or len(party.members) >= MAX_PARTY:
        await parties.drop_invite(pid, user.user_id)
        raise HTTPException(status.HTTP_409_CONFLICT, "That party is full or gone")
    await parties.leave(user.user_id)
    await parties.join(pid, user.user_id)
    await parties.drop_invite(pid, user.user_id)
    return await _view(user.user_id, parties, friends)


@router.post("/party/decline")
async def decline(
    body: PartyRef,
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await parties.drop_invite(str(body.party_id), user.user_id)
    return await _view(user.user_id, parties, friends)


@router.post("/party/leave")
async def leave(
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await parties.leave(user.user_id)
    return await _view(user.user_id, parties, friends)


@router.put("/party/ready")
async def ready(
    body: ReadyBody,
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await parties.ready(user.user_id, body.ready)
    return await _view(user.user_id, parties, friends)


@router.put("/party/zone")
async def zone(
    body: ZoneBody,
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    party = await _led(user, parties)
    await parties.set_zone(party.id, body.zone)
    return await _view(user.user_id, parties, friends)


@router.post("/party/start")
async def start(
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    party = await _led(user, parties)
    others = [m for m in party.members if m.user_id != party.leader]
    if not others:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite a friend first")
    if not all(m.ready for m in others):
        raise HTTPException(status.HTTP_409_CONFLICT, "Not everyone is ready")
    await parties.start(party.id, secrets.randbelow(2**31))
    return await _view(user.user_id, parties, friends)


@router.post("/party/voice")
async def voice_pass(
    user: AuthedUser = Depends(get_authed_user),
    parties: PartyStore = Depends(get_party_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, str]:
    """A pass to the party's voice room, for its members only."""
    if not (settings.livekit_url and settings.livekit_api_key and settings.livekit_api_secret):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Voice isn't set up yet")
    party = await parties.of(user.user_id)
    if not party:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You're not in a party")
    me = await friends.many([user.user_id])
    token = voice.voice_pass(
        key=settings.livekit_api_key,
        secret=settings.livekit_api_secret,
        room=voice.room_of(party.id),
        user_id=user.user_id,
        name=(me[0].name if me else "") or "A hero",
        seconds=settings.voice_pass_seconds,
    )
    return {"url": settings.livekit_url, "token": token, "room": voice.room_of(party.id)}
