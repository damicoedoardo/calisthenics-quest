"""Parties: up to 4 friends who go into the Fog together.

A party is its leader's: they invite friends, pick the zone, and start when everyone else is
ready. Starting stamps a seed and a time (`started_at`); each phone sees the new start on its next
look and walks in. Then the party is back in its lobby, ready flags cleared, for the next run. A
player is in at most one party. Behind a small store, like friends.py.
"""

from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from app.db import get_pool

MAX_PARTY = 4

SCHEMA = """
CREATE TABLE IF NOT EXISTS parties (
    id          uuid PRIMARY KEY,
    leader      uuid NOT NULL,
    zone        integer NOT NULL DEFAULT 0,
    seed        integer,
    started_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS party_members (
    party_id    uuid NOT NULL REFERENCES parties (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL UNIQUE,
    ready       boolean NOT NULL DEFAULT false,
    joined_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (party_id, user_id)
);
CREATE TABLE IF NOT EXISTS party_invites (
    party_id    uuid NOT NULL REFERENCES parties (id) ON DELETE CASCADE,
    to_id       uuid NOT NULL,
    from_id     uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (party_id, to_id)
);
CREATE INDEX IF NOT EXISTS party_invites_to ON party_invites (to_id);
"""


@dataclass(frozen=True)
class Member:
    user_id: str
    ready: bool


@dataclass(frozen=True)
class Party:
    id: str
    leader: str
    zone: int
    seed: int | None
    started_at: datetime | None
    members: list[Member] = field(default_factory=list)
    invited: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Invite:
    party_id: str
    from_id: str


class PartyStore(Protocol):
    async def ensure(self) -> None: ...

    async def of(self, user_id: str) -> Party | None:
        """The party this player is in."""
        ...

    async def get(self, party_id: str) -> Party | None: ...

    async def create(self, leader: str) -> Party: ...

    async def join(self, party_id: str, user_id: str) -> None: ...

    async def leave(self, user_id: str) -> None:
        """Out of their party; the next member leads, and an empty party is gone."""
        ...

    async def ready(self, user_id: str, ready: bool) -> None: ...

    async def set_zone(self, party_id: str, zone: int) -> None:
        """A new zone; everyone's ready again from scratch."""
        ...

    async def start(self, party_id: str, seed: int) -> None:
        """Stamp a start (seed and time) and clear the ready flags."""
        ...

    async def invite(self, party_id: str, to_id: str, from_id: str) -> None: ...

    async def invites_to(self, user_id: str) -> list[Invite]: ...

    async def drop_invite(self, party_id: str, to_id: str) -> None: ...


class PgStore:
    async def ensure(self) -> None:
        await get_pool().execute(SCHEMA)

    async def get(self, party_id: str) -> Party | None:
        pool = get_pool()
        p = await pool.fetchrow(
            "SELECT id, leader, zone, seed, started_at FROM parties WHERE id = $1", party_id
        )
        if not p:
            return None
        members = await pool.fetch(
            "SELECT user_id, ready FROM party_members WHERE party_id = $1 ORDER BY joined_at",
            party_id,
        )
        invited = await pool.fetch(
            "SELECT to_id FROM party_invites WHERE party_id = $1 ORDER BY created_at", party_id
        )
        return Party(
            id=str(p["id"]),
            leader=str(p["leader"]),
            zone=p["zone"],
            seed=p["seed"],
            started_at=p["started_at"],
            members=[Member(str(m["user_id"]), m["ready"]) for m in members],
            invited=[str(i["to_id"]) for i in invited],
        )

    async def of(self, user_id: str) -> Party | None:
        pid = await get_pool().fetchval(
            "SELECT party_id FROM party_members WHERE user_id = $1", user_id
        )
        return await self.get(str(pid)) if pid else None

    async def create(self, leader: str) -> Party:
        pid = str(uuid4())
        async with get_pool().acquire() as c, c.transaction():
            await c.execute("INSERT INTO parties (id, leader) VALUES ($1, $2)", pid, leader)
            await c.execute(
                "INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)", pid, leader
            )
        party = await self.get(pid)
        assert party
        return party

    async def join(self, party_id: str, user_id: str) -> None:
        await get_pool().execute(
            "INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)", party_id, user_id
        )

    async def leave(self, user_id: str) -> None:
        party = await self.of(user_id)
        if not party:
            return
        pool = get_pool()
        rest = [m.user_id for m in party.members if m.user_id != user_id]
        if not rest:
            await pool.execute("DELETE FROM parties WHERE id = $1", party.id)
            return
        await pool.execute("DELETE FROM party_members WHERE user_id = $1", user_id)
        if party.leader == user_id:
            await pool.execute("UPDATE parties SET leader = $2 WHERE id = $1", party.id, rest[0])

    async def ready(self, user_id: str, ready: bool) -> None:
        await get_pool().execute(
            "UPDATE party_members SET ready = $2 WHERE user_id = $1", user_id, ready
        )

    async def set_zone(self, party_id: str, zone: int) -> None:
        pool = get_pool()
        await pool.execute("UPDATE parties SET zone = $2 WHERE id = $1", party_id, zone)
        await pool.execute("UPDATE party_members SET ready = false WHERE party_id = $1", party_id)

    async def start(self, party_id: str, seed: int) -> None:
        pool = get_pool()
        await pool.execute(
            "UPDATE parties SET seed = $2, started_at = now() WHERE id = $1", party_id, seed
        )
        await pool.execute("UPDATE party_members SET ready = false WHERE party_id = $1", party_id)

    async def invite(self, party_id: str, to_id: str, from_id: str) -> None:
        await get_pool().execute(
            "INSERT INTO party_invites (party_id, to_id, from_id) VALUES ($1, $2, $3)"
            " ON CONFLICT DO NOTHING",
            party_id,
            to_id,
            from_id,
        )

    async def invites_to(self, user_id: str) -> list[Invite]:
        rows = await get_pool().fetch(
            "SELECT party_id, from_id FROM party_invites WHERE to_id = $1 ORDER BY created_at",
            user_id,
        )
        return [Invite(str(r["party_id"]), str(r["from_id"])) for r in rows]

    async def drop_invite(self, party_id: str, to_id: str) -> None:
        await get_pool().execute(
            "DELETE FROM party_invites WHERE party_id = $1 AND to_id = $2", party_id, to_id
        )


class MemoryStore:
    """The same rules as PgStore, in dicts: for tests."""

    def __init__(self) -> None:
        self.parties: dict[str, Party] = {}
        self.invites: list[tuple[str, str, str]] = []  # party, to, from

    async def ensure(self) -> None:
        return None

    async def get(self, party_id: str) -> Party | None:
        p = self.parties.get(party_id)
        if not p:
            return None
        return replace(p, invited=[t for pid, t, _ in self.invites if pid == party_id])

    async def of(self, user_id: str) -> Party | None:
        for p in self.parties.values():
            if any(m.user_id == user_id for m in p.members):
                return await self.get(p.id)
        return None

    async def create(self, leader: str) -> Party:
        p = Party(str(uuid4()), leader, 0, None, None, [Member(leader, False)])
        self.parties[p.id] = p
        return p

    async def join(self, party_id: str, user_id: str) -> None:
        p = self.parties[party_id]
        self.parties[party_id] = replace(p, members=[*p.members, Member(user_id, False)])

    async def leave(self, user_id: str) -> None:
        p = await self.of(user_id)
        if not p:
            return
        rest = [m for m in p.members if m.user_id != user_id]
        if not rest:
            del self.parties[p.id]
            self.invites = [i for i in self.invites if i[0] != p.id]
            return
        leader = rest[0].user_id if p.leader == user_id else p.leader
        self.parties[p.id] = replace(p, members=rest, leader=leader)

    async def ready(self, user_id: str, ready: bool) -> None:
        p = await self.of(user_id)
        if p:
            ms = [replace(m, ready=ready) if m.user_id == user_id else m for m in p.members]
            self.parties[p.id] = replace(self.parties[p.id], members=ms)

    async def set_zone(self, party_id: str, zone: int) -> None:
        p = self.parties[party_id]
        ms = [replace(m, ready=False) for m in p.members]
        self.parties[party_id] = replace(p, zone=zone, members=ms)

    async def start(self, party_id: str, seed: int) -> None:
        p = self.parties[party_id]
        ms = [replace(m, ready=False) for m in p.members]
        self.parties[party_id] = replace(p, seed=seed, started_at=datetime.now(UTC), members=ms)

    async def invite(self, party_id: str, to_id: str, from_id: str) -> None:
        if not any(i[0] == party_id and i[1] == to_id for i in self.invites):
            self.invites.append((party_id, to_id, from_id))

    async def invites_to(self, user_id: str) -> list[Invite]:
        return [Invite(p, f) for p, t, f in self.invites if t == user_id and p in self.parties]

    async def drop_invite(self, party_id: str, to_id: str) -> None:
        self.invites = [i for i in self.invites if not (i[0] == party_id and i[1] == to_id)]
