"""Friends: your card (PUT /me), your friends and asks (GET /friends), add by code, accept, remove.

PUT /me is also the heartbeat: the app sends it every 30 s while it is open, so a friend seen in
the last ONLINE_FOR seconds shows as online. There is no search by name: a friend is added only
with their code, which they share themselves.
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.auth import AuthedUser, get_authed_user
from app.friends import FriendStore, PgStore, Profile, clean_code

router = APIRouter()

_store: FriendStore = PgStore()

# A little over two heartbeats, so one late beat doesn't flicker a friend offline.
ONLINE_FOR = timedelta(seconds=75)
MAX_FRIENDS = 100


def get_friend_store() -> FriendStore:
    return _store


class Card(BaseModel):
    name: str | None = Field(default=None, max_length=24)
    class_id: str | None = Field(default=None, max_length=16)
    level: int | None = Field(default=None, ge=1, le=9999)
    look: dict[str, Any] | None = None
    trained_at: datetime | None = None
    playing: str | None = Field(default=None, max_length=40)
    training: str | None = Field(default=None, max_length=40)


class AddFriend(BaseModel):
    code: str = Field(max_length=16)


def card_json(p: Profile, now: datetime) -> dict[str, Any]:
    return {
        "id": p.user_id,
        "name": p.name,
        "class_id": p.class_id,
        "level": p.level,
        "look": p.look,
        "trained_at": p.trained_at.isoformat() if p.trained_at else None,
        "online": now - p.seen_at < ONLINE_FOR,
        "playing": p.playing if now - p.seen_at < ONLINE_FOR else None,
        "training": p.training if now - p.seen_at < ONLINE_FOR else None,
        "seen_at": p.seen_at.isoformat(),
    }


async def _mine(user: AuthedUser, store: FriendStore) -> Profile:
    return await store.get(user.user_id) or await store.touch(user.user_id, {})


@router.put("/me")
async def put_me(
    card: Card,
    user: AuthedUser = Depends(get_authed_user),
    store: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    fields = card.model_dump(exclude_unset=True)
    if isinstance(fields.get("name"), str):
        fields["name"] = fields["name"].strip()
    p = await store.touch(user.user_id, fields)
    return {"code": p.code, "name": p.name}


@router.get("/friends")
async def get_friends(
    user: AuthedUser = Depends(get_authed_user), store: FriendStore = Depends(get_friend_store)
) -> dict[str, Any]:
    me = await _mine(user, store)
    links = await store.links(user.user_id)
    cards = {p.user_id: p for p in await store.many([link.other for link in links])}
    now = datetime.now(UTC)
    out: dict[str, Any] = {
        "me": {"code": me.code, "name": me.name},
        "friends": [],
        "asks_in": [],
        "asks_out": [],
    }
    for link in links:
        p = cards.get(link.other)
        if not p:
            continue
        key = "friends" if link.accepted else "asks_out" if link.mine else "asks_in"
        out[key].append(card_json(p, now))
    # Who is training or playing first, then who is online, then by name.
    out["friends"].sort(
        key=lambda c: (not (c["training"] or c["playing"]), not c["online"], c["name"].lower())
    )
    return out


@router.post("/friends")
async def add_friend(
    body: AddFriend,
    user: AuthedUser = Depends(get_authed_user),
    store: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await _mine(user, store)
    them = await store.by_code(clean_code(body.code))
    if not them:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No hero has that code")
    if them.user_id == user.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That's your own code")
    links = await store.links(user.user_id)
    if len(links) >= MAX_FRIENDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Too many friends and asks")
    link = next((x for x in links if x.other == them.user_id), None)
    if link and not link.accepted and not link.mine:
        # They asked first: adding them back is a yes.
        await store.accept(them.user_id, user.user_id)
        return {"status": "friends", "name": them.name}
    if link:
        return {"status": "friends" if link.accepted else "asked", "name": them.name}
    await store.ask(user.user_id, them.user_id)
    return {"status": "asked", "name": them.name}


@router.post("/friends/{friend_id}/accept")
async def accept_friend(
    friend_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    store: FriendStore = Depends(get_friend_store),
) -> dict[str, str]:
    link = next((x for x in await store.links(user.user_id) if x.other == str(friend_id)), None)
    if not link or link.mine:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No ask from them")
    await store.accept(str(friend_id), user.user_id)
    return {"status": "friends"}


@router.delete("/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    friend_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    store: FriendStore = Depends(get_friend_store),
) -> Response:
    await store.unlink(user.user_id, str(friend_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
