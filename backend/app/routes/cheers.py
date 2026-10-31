"""Cheers between friends: send one (POST /cheers), pick up what friends sent you
(POST /cheers/take). Only between friends, and only so many a day, so a cheer stays a nice
surprise and never turns into spam.
"""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import AuthedUser, get_authed_user
from app.cheers import Cheer, CheerStore, PgStore
from app.friends import FriendStore
from app.routes.friends import get_friend_store

router = APIRouter()

_store: CheerStore = PgStore()

# Cheers one friend can send another in a day: CHEER_LIMIT.perDay in src/lib/cheers.ts.
PER_DAY = 20
# The longest cheer: CHEER_LIMIT.length in src/lib/cheers.ts.
LENGTH = 80


def get_cheer_store() -> CheerStore:
    return _store


class Send(BaseModel):
    to: UUID
    text: str = Field(min_length=1, max_length=LENGTH)


@router.post("/cheers")
async def send(
    body: Send,
    user: AuthedUser = Depends(get_authed_user),
    cheers: CheerStore = Depends(get_cheer_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    text = " ".join(body.text.split())
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Say something first")
    to = str(body.to)
    if not any(x.other == to and x.accepted for x in await friends.links(user.user_id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only to a friend")
    left = PER_DAY - await cheers.sent_today(user.user_id, to)
    if left <= 0:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That's all the cheers for today")
    await cheers.send(user.user_id, to, text)
    return {"status": "sent", "left_today": left - 1}


@router.post("/cheers/take")
async def take(
    user: AuthedUser = Depends(get_authed_user),
    cheers: CheerStore = Depends(get_cheer_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    rows = await cheers.take(user.user_id)
    names = {p.user_id: p.name for p in await friends.many(sorted({c.sender for c in rows}))}

    def out(c: Cheer) -> dict[str, Any]:
        return {
            "id": c.id,
            "from": c.sender,
            "from_name": names.get(c.sender, ""),
            "text": c.text,
            "at": c.created_at.isoformat(),
        }

    return {"cheers": [out(c) for c in rows]}
