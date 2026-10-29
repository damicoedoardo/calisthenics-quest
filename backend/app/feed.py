"""The feed: finished workouts shared with friends, each with an optional line and photo, the
flames friends give it and their comments.

A post holds the workout as the phone summed it up (`workout`, JSON: the plan's name, minutes,
sets, exercises), the names of friends who cheered during it (`cheered_by`), and maybe a photo,
kept apart in `post_photos` so the feed itself stays light. Behind a small store, like gifts.py,
so the routes are tested without a database.
"""

import json
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

from app.db import get_pool

# Run on every start; safe to run again. The same tables are in db/init.sql.
SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id          uuid PRIMARY KEY,
    author      uuid NOT NULL,
    workout     jsonb NOT NULL,
    text        text NOT NULL DEFAULT '',
    has_photo   boolean NOT NULL DEFAULT false,
    cheered_by  jsonb NOT NULL DEFAULT '[]',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_author ON posts (author, created_at DESC);
CREATE TABLE IF NOT EXISTS post_photos (
    post_id     uuid PRIMARY KEY REFERENCES posts (id) ON DELETE CASCADE,
    data        bytea NOT NULL
);
CREATE TABLE IF NOT EXISTS post_flames (
    post_id     uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL,
    PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS post_comments (
    id          uuid PRIMARY KEY,
    post_id     uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    author      uuid NOT NULL,
    text        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post ON post_comments (post_id, created_at);
"""


@dataclass(frozen=True)
class Comment:
    id: str
    post_id: str
    author: str
    text: str
    created_at: datetime


@dataclass(frozen=True)
class Post:
    id: str
    author: str
    workout: dict[str, Any]
    text: str
    has_photo: bool
    cheered_by: list[str]
    created_at: datetime
    flames: list[str] = field(default_factory=list)
    comments: list[Comment] = field(default_factory=list)


class FeedStore(Protocol):
    async def ensure(self) -> None: ...

    async def create(
        self,
        author: str,
        workout: dict[str, Any],
        text: str,
        photo: bytes | None,
        cheered_by: list[str],
    ) -> Post: ...

    async def get(self, post_id: str) -> Post | None:
        """One post with its flames and comments."""
        ...

    async def posts_today(self, author: str) -> int: ...

    async def feed(self, authors: list[str], before: datetime, limit: int) -> list[Post]:
        """Posts by these players before `before`, newest first, with flames and comments."""
        ...

    async def photo(self, post_id: str) -> bytes | None: ...

    async def flame(self, post_id: str, user_id: str) -> bool:
        """Give a flame, or take yours back: True when it is now given."""
        ...

    async def comment(self, post_id: str, author: str, text: str) -> Comment: ...

    async def get_comment(self, comment_id: str) -> Comment | None: ...

    async def delete_comment(self, comment_id: str) -> None: ...

    async def delete(self, post_id: str) -> None: ...


def _midnight() -> datetime:
    return datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def _json(v: Any) -> Any:
    return json.loads(v) if isinstance(v, str) else v


def _comment(r: Any) -> Comment:
    return Comment(str(r["id"]), str(r["post_id"]), str(r["author"]), r["text"], r["created_at"])


_COLS = "id, author, workout, text, has_photo, cheered_by, created_at"


class PgStore:
    async def ensure(self) -> None:
        await get_pool().execute(SCHEMA)

    async def _fill(self, rows: list[Any]) -> list[Post]:
        if not rows:
            return []
        pool = get_pool()
        ids = [r["id"] for r in rows]
        flames: dict[str, list[str]] = {}
        for f in await pool.fetch(
            "SELECT post_id, user_id FROM post_flames WHERE post_id = ANY($1::uuid[])", ids
        ):
            flames.setdefault(str(f["post_id"]), []).append(str(f["user_id"]))
        comments: dict[str, list[Comment]] = {}
        for c in await pool.fetch(
            "SELECT id, post_id, author, text, created_at FROM post_comments"
            " WHERE post_id = ANY($1::uuid[]) ORDER BY created_at",
            ids,
        ):
            comments.setdefault(str(c["post_id"]), []).append(_comment(c))
        return [
            Post(
                str(r["id"]),
                str(r["author"]),
                _json(r["workout"]),
                r["text"],
                r["has_photo"],
                _json(r["cheered_by"]),
                r["created_at"],
                flames.get(str(r["id"]), []),
                comments.get(str(r["id"]), []),
            )
            for r in rows
        ]

    async def create(
        self,
        author: str,
        workout: dict[str, Any],
        text: str,
        photo: bytes | None,
        cheered_by: list[str],
    ) -> Post:
        pool = get_pool()
        async with pool.acquire() as con, con.transaction():
            r = await con.fetchrow(
                "INSERT INTO posts (id, author, workout, text, has_photo, cheered_by)"
                f" VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb) RETURNING {_COLS}",
                uuid4(),
                author,
                json.dumps(workout),
                text,
                photo is not None,
                json.dumps(cheered_by),
            )
            if photo is not None:
                await con.execute(
                    "INSERT INTO post_photos (post_id, data) VALUES ($1, $2)", r["id"], photo
                )
        return (await self._fill([r]))[0]

    async def get(self, post_id: str) -> Post | None:
        r = await get_pool().fetchrow(f"SELECT {_COLS} FROM posts WHERE id = $1", post_id)
        return (await self._fill([r]))[0] if r else None

    async def posts_today(self, author: str) -> int:
        n = await get_pool().fetchval(
            "SELECT count(*) FROM posts WHERE author = $1 AND created_at >= $2",
            author,
            _midnight(),
        )
        return int(n)

    async def feed(self, authors: list[str], before: datetime, limit: int) -> list[Post]:
        rows = await get_pool().fetch(
            f"SELECT {_COLS} FROM posts WHERE author = ANY($1::uuid[]) AND created_at < $2"
            " ORDER BY created_at DESC LIMIT $3",
            authors,
            before,
            limit,
        )
        return await self._fill(list(rows))

    async def photo(self, post_id: str) -> bytes | None:
        return await get_pool().fetchval("SELECT data FROM post_photos WHERE post_id = $1", post_id)

    async def flame(self, post_id: str, user_id: str) -> bool:
        pool = get_pool()
        done = await pool.execute(
            "DELETE FROM post_flames WHERE post_id = $1 AND user_id = $2", post_id, user_id
        )
        if done.endswith(" 1"):
            return False
        await pool.execute(
            "INSERT INTO post_flames (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            post_id,
            user_id,
        )
        return True

    async def comment(self, post_id: str, author: str, text: str) -> Comment:
        r = await get_pool().fetchrow(
            "INSERT INTO post_comments (id, post_id, author, text) VALUES ($1, $2, $3, $4)"
            " RETURNING id, post_id, author, text, created_at",
            uuid4(),
            post_id,
            author,
            text,
        )
        return _comment(r)

    async def get_comment(self, comment_id: str) -> Comment | None:
        r = await get_pool().fetchrow(
            "SELECT id, post_id, author, text, created_at FROM post_comments WHERE id = $1",
            comment_id,
        )
        return _comment(r) if r else None

    async def delete_comment(self, comment_id: str) -> None:
        await get_pool().execute("DELETE FROM post_comments WHERE id = $1", comment_id)

    async def delete(self, post_id: str) -> None:
        await get_pool().execute("DELETE FROM posts WHERE id = $1", post_id)


class MemoryStore:
    """The same rules as PgStore, in dicts: for tests."""

    def __init__(self) -> None:
        self.posts: dict[str, Post] = {}
        self.photos: dict[str, bytes] = {}

    async def ensure(self) -> None:
        return None

    async def create(
        self,
        author: str,
        workout: dict[str, Any],
        text: str,
        photo: bytes | None,
        cheered_by: list[str],
    ) -> Post:
        p = Post(
            str(uuid4()), author, workout, text, photo is not None, cheered_by, datetime.now(UTC)
        )
        self.posts[p.id] = p
        if photo is not None:
            self.photos[p.id] = photo
        return p

    async def get(self, post_id: str) -> Post | None:
        return self.posts.get(post_id)

    async def posts_today(self, author: str) -> int:
        day = _midnight()
        return sum(1 for p in self.posts.values() if p.author == author and p.created_at >= day)

    async def feed(self, authors: list[str], before: datetime, limit: int) -> list[Post]:
        mine = [p for p in self.posts.values() if p.author in authors and p.created_at < before]
        return sorted(mine, key=lambda p: p.created_at, reverse=True)[:limit]

    async def photo(self, post_id: str) -> bytes | None:
        return self.photos.get(post_id)

    async def flame(self, post_id: str, user_id: str) -> bool:
        p = self.posts[post_id]
        on = user_id not in p.flames
        flames = [*p.flames, user_id] if on else [x for x in p.flames if x != user_id]
        self.posts[post_id] = replace(p, flames=flames)
        return on

    async def comment(self, post_id: str, author: str, text: str) -> Comment:
        c = Comment(str(uuid4()), post_id, author, text, datetime.now(UTC))
        p = self.posts[post_id]
        self.posts[post_id] = replace(p, comments=[*p.comments, c])
        return c

    async def get_comment(self, comment_id: str) -> Comment | None:
        return next(
            (c for p in self.posts.values() for c in p.comments if c.id == comment_id), None
        )

    async def delete_comment(self, comment_id: str) -> None:
        for pid, p in self.posts.items():
            self.posts[pid] = replace(p, comments=[c for c in p.comments if c.id != comment_id])

    async def delete(self, post_id: str) -> None:
        self.posts.pop(post_id, None)
        self.photos.pop(post_id, None)
