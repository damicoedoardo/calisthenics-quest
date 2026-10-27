"""Gifts of forge materials between friends: give (POST /gifts), see what waits (GET /gifts),
take it home (POST /gifts/claim). Only between friends, and only so many a day, so friends help
each other up without one player feeding another's whole forge.
"""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import AuthedUser, get_authed_user
from app.friends import FriendStore
from app.gifts import MATS, Gift, GiftStore, PgStore
from app.routes.friends import get_friend_store

router = APIRouter()

_store: GiftStore = PgStore()

# Materials one friend can give another in a day: GIFTS.perDay in src/balance/upgrades.ts.
PER_DAY = 10


def get_gift_store() -> GiftStore:
    return _store


class Give(BaseModel):
    to: UUID
    mat: str = Field(max_length=16)
    n: int = Field(ge=1, le=PER_DAY)


async def _names(friends: FriendStore, gifts: list[Gift]) -> dict[str, str]:
    return {p.user_id: p.name for p in await friends.many(sorted({g.sender for g in gifts}))}


def _out(g: Gift, names: dict[str, str]) -> dict[str, Any]:
    return {
        "id": g.id,
        "from": g.sender,
        "from_name": names.get(g.sender, ""),
        "mat": g.mat,
        "n": g.n,
    }


@router.post("/gifts")
async def give(
    body: Give,
    user: AuthedUser = Depends(get_authed_user),
    gifts: GiftStore = Depends(get_gift_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    if body.mat not in MATS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No such material")
    to = str(body.to)
    if not any(x.other == to and x.accepted for x in await friends.links(user.user_id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only to a friend")
    left = PER_DAY - await gifts.given_today(user.user_id, to)
    if body.n > left:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"{max(0, left)} more today")
    await gifts.send(user.user_id, to, body.mat, body.n)
    return {"status": "given", "left_today": left - body.n}


@router.get("/gifts")
async def waiting(
    user: AuthedUser = Depends(get_authed_user),
    gifts: GiftStore = Depends(get_gift_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    rows = await gifts.waiting(user.user_id)
    names = await _names(friends, rows)
    return {"gifts": [_out(g, names) for g in rows]}


@router.post("/gifts/claim")
async def claim(
    user: AuthedUser = Depends(get_authed_user),
    gifts: GiftStore = Depends(get_gift_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    rows = await gifts.claim(user.user_id)
    names = await _names(friends, rows)
    return {"gifts": [_out(g, names) for g in rows]}
