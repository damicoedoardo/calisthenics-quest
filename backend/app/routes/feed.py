"""The feed: share a finished workout (POST /feed), see yours and your friends' (GET /feed), a
photo (GET /feed/{id}/photo), give a flame (POST /feed/{id}/flame), comment
(POST /feed/{id}/comments), and take your own things down (DELETE). Only you and your friends see
a post, its photo and its comments.
"""

import base64
import binascii
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.auth import AuthedUser, get_authed_user
from app.cheers import CheerStore
from app.feed import Comment, FeedStore, PgStore, Post
from app.friends import FriendStore
from app.routes.cheers import get_cheer_store
from app.routes.friends import card_json, get_friend_store

router = APIRouter()

_store: FeedStore = PgStore()

# The limits, the same as FEED_LIMIT in src/lib/feed.ts: keep the two the same.
TEXT = 280
COMMENT = 200
PHOTO_BYTES = 600_000
PER_DAY = 5
# Posts per page of the feed.
PAGE = 20


def get_feed_store() -> FeedStore:
    return _store


class Workout(BaseModel):
    title: str = Field(max_length=40)
    minutes: int = Field(ge=0, le=600)
    sets: int = Field(ge=0, le=500)
    exercises: list[str] = Field(max_length=12)
    mini: bool = False
    started_at: datetime | None = None


class NewPost(BaseModel):
    workout: Workout
    text: str = Field(default="", max_length=TEXT)
    # A JPEG, base64, already made small on the phone.
    photo: str | None = Field(default=None, max_length=PHOTO_BYTES * 4 // 3 + 8)


class NewComment(BaseModel):
    text: str = Field(min_length=1, max_length=COMMENT)


def _line(text: str) -> str:
    return " ".join(text.split())


async def _circle(user_id: str, friends: FriendStore) -> list[str]:
    """You and your friends: whose posts you see."""
    return [user_id, *(x.other for x in await friends.links(user_id) if x.accepted)]


async def _seen(post_id: UUID, user: AuthedUser, feed: FeedStore, friends: FriendStore) -> Post:
    """The post, when it is yours or a friend's; 404 otherwise (as if it weren't there)."""
    p = await feed.get(str(post_id))
    if not p or p.author not in await _circle(user.user_id, friends):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such post")
    return p


async def _out(posts: list[Post], me: str, friends: FriendStore) -> list[dict[str, Any]]:
    ids = {p.author for p in posts} | {c.author for p in posts for c in p.comments}
    ids |= {x for p in posts for x in p.cheered_by}
    cards = {c.user_id: c for c in await friends.many(sorted(ids))}
    now = datetime.now(UTC)

    def name(uid: str) -> str:
        c = cards.get(uid)
        return c.name if c else ""

    def comment(c: Comment) -> dict[str, Any]:
        return {
            "id": c.id,
            "author": c.author,
            "name": name(c.author),
            "text": c.text,
            "at": c.created_at.isoformat(),
            "mine": c.author == me,
        }

    out = []
    for p in posts:
        card = cards.get(p.author)
        out.append(
            {
                "id": p.id,
                "author": card_json(card, now) if card else {"id": p.author, "name": ""},
                "at": p.created_at.isoformat(),
                "workout": p.workout,
                "text": p.text,
                "photo": p.has_photo,
                "cheered_by": [name(x) or "A friend" for x in p.cheered_by],
                "flames": len(p.flames),
                "flamed": me in p.flames,
                "comments": [comment(c) for c in p.comments],
                "mine": p.author == me,
            }
        )
    return out


@router.post("/feed")
async def share(
    body: NewPost,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
    friends: FriendStore = Depends(get_friend_store),
    cheers: CheerStore = Depends(get_cheer_store),
) -> dict[str, Any]:
    if await feed.posts_today(user.user_id) >= PER_DAY:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That's all the posts for today")
    photo = None
    if body.photo:
        try:
            photo = base64.b64decode(body.photo, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That photo didn't come through")
        if not photo.startswith(b"\xff\xd8") or len(photo) > PHOTO_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That photo didn't come through")
    w = body.workout.model_dump(mode="json")
    w["exercises"] = [_line(x)[:40] for x in body.workout.exercises if _line(x)]
    # Who cheered during this workout: since it started, at most a few hours back.
    now = datetime.now(UTC)
    start = body.workout.started_at or now - timedelta(hours=2)
    since = max(start, now - timedelta(hours=6))
    cheered = await cheers.senders_since(user.user_id, since)
    p = await feed.create(user.user_id, w, _line(body.text), photo, cheered)
    return (await _out([p], user.user_id, friends))[0]


@router.get("/feed")
async def read(
    before: datetime | None = None,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    posts = await feed.feed(
        await _circle(user.user_id, friends), before or datetime.now(UTC) + timedelta(1), PAGE
    )
    return {"posts": await _out(posts, user.user_id, friends), "more": len(posts) == PAGE}


@router.get("/feed/{post_id}/photo")
async def photo(
    post_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
    friends: FriendStore = Depends(get_friend_store),
) -> Response:
    await _seen(post_id, user, feed, friends)
    data = await feed.photo(str(post_id))
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No photo")
    return Response(
        data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"}
    )


@router.post("/feed/{post_id}/flame")
async def flame(
    post_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await _seen(post_id, user, feed, friends)
    on = await feed.flame(str(post_id), user.user_id)
    p = await feed.get(str(post_id))
    return {"flamed": on, "flames": len(p.flames) if p else 0}


@router.post("/feed/{post_id}/comments")
async def add_comment(
    post_id: UUID,
    body: NewComment,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
    friends: FriendStore = Depends(get_friend_store),
) -> dict[str, Any]:
    await _seen(post_id, user, feed, friends)
    text = _line(body.text)
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Say something first")
    await feed.comment(str(post_id), user.user_id, text)
    p = await feed.get(str(post_id))
    return (await _out([p], user.user_id, friends))[0] if p else {}


@router.delete("/feed/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
) -> Response:
    c = await feed.get_comment(str(comment_id))
    p = await feed.get(c.post_id) if c else None
    # Your own comment, or any comment on your own post.
    if not c or not p or user.user_id not in (c.author, p.author):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such comment")
    await feed.delete_comment(c.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/feed/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    user: AuthedUser = Depends(get_authed_user),
    feed: FeedStore = Depends(get_feed_store),
) -> Response:
    p = await feed.get(str(post_id))
    if not p or p.author != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such post")
    await feed.delete(p.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
