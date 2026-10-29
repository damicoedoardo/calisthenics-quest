"""Cheers: a short line one friend sends another, mostly while they work out ("One more set!").

A cheer waits here until the friend's phone picks it up (it asks every few seconds during a
workout, every minute otherwise) and shows it once. Behind a small store, like gifts.py, so the
routes are tested without a database.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from app.db import get_pool

# Run on every start; safe to run again. The same table is in db/init.sql.
SCHEMA = """
CREATE TABLE IF NOT EXISTS cheers (
    id          uuid PRIMARY KEY,
    sender      uuid NOT NULL,
    receiver    uuid NOT NULL,
    text        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    seen_at     timestamptz
);
CREATE INDEX IF NOT EXISTS cheers_receiver ON cheers (receiver) WHERE seen_at IS NULL;
"""


@dataclass(frozen=True)
class Cheer:
    id: str
    sender: str
    receiver: str
    text: str
    created_at: datetime


class CheerStore(Protocol):
    async def ensure(self) -> None: ...

    async def send(self, sender: str, receiver: str, text: str) -> Cheer: ...

    async def sent_today(self, sender: str, receiver: str) -> int:
        """Cheers `sender` sent `receiver` since midnight (UTC)."""
        ...

    async def take(self, receiver: str) -> list[Cheer]:
        """Every cheer waiting for `receiver`, oldest first, marked seen so it shows only once."""
        ...


def _midnight() -> datetime:
    return datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def _cheer(r) -> Cheer:  # noqa: ANN001
    return Cheer(str(r["id"]), str(r["sender"]), str(r["receiver"]), r["text"], r["created_at"])


_COLS = "id, sender, receiver, text, created_at"


class PgStore:
    async def ensure(self) -> None:
        await get_pool().execute(SCHEMA)

    async def send(self, sender: str, receiver: str, text: str) -> Cheer:
        r = await get_pool().fetchrow(
            "INSERT INTO cheers (id, sender, receiver, text) VALUES ($1, $2, $3, $4)"
            f" RETURNING {_COLS}",
            uuid4(),
            sender,
            receiver,
            text,
        )
        return _cheer(r)

    async def sent_today(self, sender: str, receiver: str) -> int:
        n = await get_pool().fetchval(
            "SELECT count(*) FROM cheers WHERE sender = $1 AND receiver = $2 AND created_at >= $3",
            sender,
            receiver,
            _midnight(),
        )
        return int(n)

    async def take(self, receiver: str) -> list[Cheer]:
        rows = await get_pool().fetch(
            "UPDATE cheers SET seen_at = now() WHERE receiver = $1 AND seen_at IS NULL"
            f" RETURNING {_COLS}",
            receiver,
        )
        return sorted((_cheer(r) for r in rows), key=lambda c: c.created_at)


class MemoryStore:
    """The same rules as PgStore, in a list: for tests."""

    def __init__(self) -> None:
        self.rows: list[tuple[Cheer, bool]] = []

    async def ensure(self) -> None:
        return None

    async def send(self, sender: str, receiver: str, text: str) -> Cheer:
        c = Cheer(str(uuid4()), sender, receiver, text, datetime.now(UTC))
        self.rows.append((c, False))
        return c

    async def sent_today(self, sender: str, receiver: str) -> int:
        day = _midnight()
        return sum(
            1
            for c, _ in self.rows
            if c.sender == sender and c.receiver == receiver and c.created_at >= day
        )

    async def take(self, receiver: str) -> list[Cheer]:
        out = [c for c, seen in self.rows if c.receiver == receiver and not seen]
        self.rows = [(c, seen or c.receiver == receiver) for c, seen in self.rows]
        return out
