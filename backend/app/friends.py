"""Friends: each player's public card (`profiles`) and who is friends with whom (`friends`).

A card holds only what friends see: a name, the hero's class, level and look, when they last
trained, and whether the app is open right now (`seen_at`, refreshed every 30 s while it is), in
a run (`playing`) or in a workout (`training`). The profile adds what the player chose to tell
friends, all optional: where they live (`place`), a line about them (`about`) and a photo
(`profile_photos`, `photo_at` says when it last changed). A friendship starts as an ask from `a`
to `b` and holds once `b` accepts.
Behind a small store, like saves.py, so the routes are tested without a database.
"""

import json
import secrets
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any, Protocol

from app.db import get_pool

# Run on every start; safe to run again. The same tables are in db/init.sql.
SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    user_id     uuid PRIMARY KEY,
    code        text NOT NULL UNIQUE,
    name        text NOT NULL DEFAULT '',
    class_id    text,
    level       integer NOT NULL DEFAULT 1,
    look        jsonb,
    trained_at  timestamptz,
    playing     text,
    training    text,
    seen_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS place text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_at timestamptz;
CREATE TABLE IF NOT EXISTS profile_photos (
    user_id     uuid PRIMARY KEY,
    data        bytea NOT NULL
);
CREATE TABLE IF NOT EXISTS friends (
    a           uuid NOT NULL,
    b           uuid NOT NULL,
    accepted    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (a, b)
);
CREATE INDEX IF NOT EXISTS friends_b ON friends (b);
"""

# No 0/O or 1/I/L: a code read out loud or typed from a screenshot still works.
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def new_code() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(6))


def clean_code(code: str) -> str:
    """What a player typed, as stored: capitals, no dashes or spaces."""
    return "".join(c for c in code.upper() if c.isalnum())


@dataclass(frozen=True)
class Profile:
    user_id: str
    code: str
    name: str
    class_id: str | None
    level: int
    look: dict[str, Any] | None
    trained_at: datetime | None
    playing: str | None
    seen_at: datetime
    training: str | None = None
    place: str = ""
    about: str = ""
    photo_at: datetime | None = None


@dataclass(frozen=True)
class Link:
    """A friendship or an ask, seen from one player: `other` is the friend, `mine` if I asked."""

    other: str
    mine: bool
    accepted: bool


# The fields a phone may set on its own card.
CARD_FIELDS = ("name", "class_id", "level", "look", "trained_at", "playing", "training")


class FriendStore(Protocol):
    async def ensure(self) -> None: ...

    async def touch(self, user_id: str, card: dict[str, Any]) -> Profile:
        """Write these card fields (a new card gets a code) and mark the player seen now."""
        ...

    async def get(self, user_id: str) -> Profile | None: ...

    async def by_code(self, code: str) -> Profile | None: ...

    async def many(self, ids: list[str]) -> list[Profile]: ...

    async def links(self, user_id: str) -> list[Link]: ...

    async def ask(self, a: str, b: str) -> None: ...

    async def accept(self, a: str, b: str) -> None:
        """`b` accepts `a`'s ask."""
        ...

    async def unlink(self, x: str, y: str) -> None:
        """Remove a friendship or an ask, whichever way it went."""
        ...

    async def set_about(self, user_id: str, place: str, about: str) -> Profile:
        """Write where they live and the line about them (a new card gets a code)."""
        ...

    async def set_photo(self, user_id: str, data: bytes | None) -> Profile:
        """Keep this JPEG as their photo, or remove it with None."""
        ...

    async def photo(self, user_id: str) -> bytes | None: ...


def _profile(r: Any) -> Profile:
    look = r["look"]
    return Profile(
        user_id=str(r["user_id"]),
        code=r["code"],
        name=r["name"],
        class_id=r["class_id"],
        level=r["level"],
        look=json.loads(look) if isinstance(look, str) else look,
        trained_at=r["trained_at"],
        playing=r["playing"],
        seen_at=r["seen_at"],
        training=r["training"],
        place=r["place"],
        about=r["about"],
        photo_at=r["photo_at"],
    )


_COLS = (
    "user_id, code, name, class_id, level, look, trained_at, playing, seen_at, training,"
    " place, about, photo_at"
)


class PgStore:
    async def ensure(self) -> None:
        await get_pool().execute(SCHEMA)

    async def touch(self, user_id: str, card: dict[str, Any]) -> Profile:
        pool = get_pool()
        if await self.get(user_id) is None:
            # A fresh code; on the rare clash, roll again.
            for _ in range(5):
                done = await pool.execute(
                    "INSERT INTO profiles (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    user_id,
                    new_code(),
                )
                if done.endswith("1") or await self.get(user_id):
                    break
        sets, args = ["seen_at = now()"], [user_id]
        for k in CARD_FIELDS:
            if k in card:
                v = card[k]
                args.append(json.dumps(v) if k == "look" and v is not None else v)
                sets.append(f"{k} = ${len(args)}" + ("::jsonb" if k == "look" else ""))
        r = await pool.fetchrow(
            f"UPDATE profiles SET {', '.join(sets)} WHERE user_id = $1 RETURNING {_COLS}", *args
        )
        return _profile(r)

    async def get(self, user_id: str) -> Profile | None:
        r = await get_pool().fetchrow(f"SELECT {_COLS} FROM profiles WHERE user_id = $1", user_id)
        return _profile(r) if r else None

    async def by_code(self, code: str) -> Profile | None:
        r = await get_pool().fetchrow(f"SELECT {_COLS} FROM profiles WHERE code = $1", code)
        return _profile(r) if r else None

    async def many(self, ids: list[str]) -> list[Profile]:
        if not ids:
            return []
        rows = await get_pool().fetch(
            f"SELECT {_COLS} FROM profiles WHERE user_id = ANY($1::uuid[])", ids
        )
        return [_profile(r) for r in rows]

    async def links(self, user_id: str) -> list[Link]:
        rows = await get_pool().fetch(
            "SELECT a, b, accepted FROM friends WHERE a = $1 OR b = $1", user_id
        )
        out = []
        for r in rows:
            mine = str(r["a"]) == user_id
            out.append(
                Link(other=str(r["b"] if mine else r["a"]), mine=mine, accepted=r["accepted"])
            )
        return out

    async def ask(self, a: str, b: str) -> None:
        await get_pool().execute(
            "INSERT INTO friends (a, b) VALUES ($1, $2) ON CONFLICT DO NOTHING", a, b
        )

    async def accept(self, a: str, b: str) -> None:
        await get_pool().execute("UPDATE friends SET accepted = true WHERE a = $1 AND b = $2", a, b)

    async def unlink(self, x: str, y: str) -> None:
        await get_pool().execute(
            "DELETE FROM friends WHERE (a = $1 AND b = $2) OR (a = $2 AND b = $1)", x, y
        )

    async def set_about(self, user_id: str, place: str, about: str) -> Profile:
        if await self.get(user_id) is None:
            await self.touch(user_id, {})
        r = await get_pool().fetchrow(
            f"UPDATE profiles SET place = $2, about = $3 WHERE user_id = $1 RETURNING {_COLS}",
            user_id,
            place,
            about,
        )
        return _profile(r)

    async def set_photo(self, user_id: str, data: bytes | None) -> Profile:
        if await self.get(user_id) is None:
            await self.touch(user_id, {})
        pool = get_pool()
        async with pool.acquire() as conn, conn.transaction():
            if data is None:
                await conn.execute("DELETE FROM profile_photos WHERE user_id = $1", user_id)
            else:
                await conn.execute(
                    "INSERT INTO profile_photos (user_id, data) VALUES ($1, $2)"
                    " ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data",
                    user_id,
                    data,
                )
            r = await conn.fetchrow(
                "UPDATE profiles SET photo_at = CASE WHEN $2 THEN now() END"
                f" WHERE user_id = $1 RETURNING {_COLS}",
                user_id,
                data is not None,
            )
        return _profile(r)

    async def photo(self, user_id: str) -> bytes | None:
        return await get_pool().fetchval(
            "SELECT data FROM profile_photos WHERE user_id = $1", user_id
        )


class MemoryStore:
    """The same rules as PgStore, in dicts: for tests."""

    def __init__(self) -> None:
        self.cards: dict[str, Profile] = {}
        self.pairs: dict[tuple[str, str], bool] = {}
        self.photos: dict[str, bytes] = {}

    async def ensure(self) -> None:
        return None

    async def touch(self, user_id: str, card: dict[str, Any]) -> Profile:
        now = datetime.now(UTC)
        p = self.cards.get(user_id) or Profile(
            user_id, new_code(), "", None, 1, None, None, None, now
        )
        p = replace(p, seen_at=now, **{k: card[k] for k in CARD_FIELDS if k in card})
        self.cards[user_id] = p
        return p

    async def get(self, user_id: str) -> Profile | None:
        return self.cards.get(user_id)

    async def by_code(self, code: str) -> Profile | None:
        return next((p for p in self.cards.values() if p.code == code), None)

    async def many(self, ids: list[str]) -> list[Profile]:
        return [self.cards[i] for i in ids if i in self.cards]

    async def links(self, user_id: str) -> list[Link]:
        out = []
        for (a, b), accepted in self.pairs.items():
            if user_id in (a, b):
                out.append(
                    Link(other=b if a == user_id else a, mine=a == user_id, accepted=accepted)
                )
        return out

    async def ask(self, a: str, b: str) -> None:
        self.pairs.setdefault((a, b), False)

    async def accept(self, a: str, b: str) -> None:
        if (a, b) in self.pairs:
            self.pairs[(a, b)] = True

    async def unlink(self, x: str, y: str) -> None:
        self.pairs.pop((x, y), None)
        self.pairs.pop((y, x), None)

    async def set_about(self, user_id: str, place: str, about: str) -> Profile:
        p = replace(await self.touch(user_id, {}), place=place, about=about)
        self.cards[user_id] = p
        return p

    async def set_photo(self, user_id: str, data: bytes | None) -> Profile:
        if data is None:
            self.photos.pop(user_id, None)
        else:
            self.photos[user_id] = data
        at = datetime.now(UTC) if data is not None else None
        p = replace(await self.touch(user_id, {}), photo_at=at)
        self.cards[user_id] = p
        return p

    async def photo(self, user_id: str) -> bytes | None:
        return self.photos.get(user_id)
