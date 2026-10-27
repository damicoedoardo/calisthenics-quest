"""Gifts: co-op materials for Mira's forge that one friend gives another.

The sender's phone takes the materials out of its own save once the server says yes; they wait
here until the friend's phone claims them into theirs. Behind a small store, like friends.py, so
the routes are tested without a database.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from app.db import get_pool

# Run on every start; safe to run again. The same table is in db/init.sql.
SCHEMA = """
CREATE TABLE IF NOT EXISTS gifts (
    id          uuid PRIMARY KEY,
    sender      uuid NOT NULL,
    receiver    uuid NOT NULL,
    mat         text NOT NULL,
    n           integer NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    claimed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS gifts_receiver ON gifts (receiver) WHERE claimed_at IS NULL;
"""

# The materials, as in src/balance/upgrades.ts (MAT_IDS).
MATS = ("thread", "shard", "coal", "heart")


@dataclass(frozen=True)
class Gift:
    id: str
    sender: str
    receiver: str
    mat: str
    n: int
    created_at: datetime


class GiftStore(Protocol):
    async def ensure(self) -> None: ...

    async def send(self, sender: str, receiver: str, mat: str, n: int) -> Gift: ...

    async def given_today(self, sender: str, receiver: str) -> int:
        """Materials `sender` gave `receiver` since midnight (UTC)."""
        ...

    async def claim(self, receiver: str) -> list[Gift]:
        """Every gift waiting for `receiver`, marked claimed so it is only handed out once."""
        ...

    async def waiting(self, receiver: str) -> list[Gift]: ...


def _midnight() -> datetime:
    return datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def _gift(r) -> Gift:  # noqa: ANN001
    return Gift(
        str(r["id"]), str(r["sender"]), str(r["receiver"]), r["mat"], r["n"], r["created_at"]
    )


_COLS = "id, sender, receiver, mat, n, created_at"


class PgStore:
    async def ensure(self) -> None:
        await get_pool().execute(SCHEMA)

    async def send(self, sender: str, receiver: str, mat: str, n: int) -> Gift:
        r = await get_pool().fetchrow(
            "INSERT INTO gifts (id, sender, receiver, mat, n) VALUES ($1, $2, $3, $4, $5)"
            f" RETURNING {_COLS}",
            uuid4(),
            sender,
            receiver,
            mat,
            n,
        )
        return _gift(r)

    async def given_today(self, sender: str, receiver: str) -> int:
        n = await get_pool().fetchval(
            "SELECT coalesce(sum(n), 0) FROM gifts"
            " WHERE sender = $1 AND receiver = $2 AND created_at >= $3",
            sender,
            receiver,
            _midnight(),
        )
        return int(n)

    async def claim(self, receiver: str) -> list[Gift]:
        rows = await get_pool().fetch(
            "UPDATE gifts SET claimed_at = now() WHERE receiver = $1 AND claimed_at IS NULL"
            f" RETURNING {_COLS}",
            receiver,
        )
        return [_gift(r) for r in rows]

    async def waiting(self, receiver: str) -> list[Gift]:
        rows = await get_pool().fetch(
            f"SELECT {_COLS} FROM gifts"
            " WHERE receiver = $1 AND claimed_at IS NULL ORDER BY created_at",
            receiver,
        )
        return [_gift(r) for r in rows]


class MemoryStore:
    """The same rules as PgStore, in a list: for tests."""

    def __init__(self) -> None:
        self.rows: list[tuple[Gift, bool]] = []

    async def ensure(self) -> None:
        return None

    async def send(self, sender: str, receiver: str, mat: str, n: int) -> Gift:
        g = Gift(str(uuid4()), sender, receiver, mat, n, datetime.now(UTC))
        self.rows.append((g, False))
        return g

    async def given_today(self, sender: str, receiver: str) -> int:
        day = _midnight()
        return sum(
            g.n
            for g, _ in self.rows
            if g.sender == sender and g.receiver == receiver and g.created_at >= day
        )

    async def claim(self, receiver: str) -> list[Gift]:
        out = [g for g, done in self.rows if g.receiver == receiver and not done]
        self.rows = [(g, done or g.receiver == receiver) for g, done in self.rows]
        return out

    async def waiting(self, receiver: str) -> list[Gift]:
        return [g for g, done in self.rows if g.receiver == receiver and not done]
