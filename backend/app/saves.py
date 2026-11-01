"""Where saves are kept: the `saves` table (db/init.sql), behind a small store so the routes can be
tested without a database (tests/test_save.py swaps in MemoryStore)."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

from app.db import get_pool


@dataclass(frozen=True)
class SaveRow:
    rev: int
    version: int
    workouts: int
    updated_at: datetime
    data: dict[str, Any]


class SaveStore(Protocol):
    async def get(self, user_id: str) -> SaveRow | None: ...

    async def put(
        self, user_id: str, data: dict[str, Any], version: int, workouts: int, base_rev: int | None
    ) -> tuple[bool, SaveRow | None]:
        """Write when the stored rev is still `base_rev` (None: only when there is no save yet).
        Returns (written, row): the new row, or on a clash the row that is there now."""
        ...

    async def delete(self, user_id: str) -> None: ...


def _row(r: Any) -> SaveRow:
    data = r["data"]
    return SaveRow(
        rev=r["rev"],
        version=r["version"],
        workouts=r["workouts"],
        updated_at=r["updated_at"],
        data=json.loads(data) if isinstance(data, str) else data,
    )


class PgStore:
    async def get(self, user_id: str) -> SaveRow | None:
        r = await get_pool().fetchrow(
            "SELECT rev, version, workouts, updated_at, data FROM saves WHERE user_id = $1",
            user_id,
        )
        return _row(r) if r else None

    async def put(
        self, user_id: str, data: dict[str, Any], version: int, workouts: int, base_rev: int | None
    ) -> tuple[bool, SaveRow | None]:
        body = json.dumps(data)
        if base_rev is None:
            r = await get_pool().fetchrow(
                "INSERT INTO saves (user_id, data, version, workouts)"
                " VALUES ($1, $2::jsonb, $3, $4)"
                " ON CONFLICT (user_id) DO NOTHING"
                " RETURNING rev, version, workouts, updated_at, data",
                user_id,
                body,
                version,
                workouts,
            )
        else:
            r = await get_pool().fetchrow(
                "UPDATE saves SET data = $2::jsonb, version = $3, workouts = $4, rev = rev + 1,"
                " updated_at = now() WHERE user_id = $1 AND rev = $5"
                " RETURNING rev, version, workouts, updated_at, data",
                user_id,
                body,
                version,
                workouts,
                base_rev,
            )
        if r:
            return True, _row(r)
        return False, await self.get(user_id)

    async def delete(self, user_id: str) -> None:
        await get_pool().execute("DELETE FROM saves WHERE user_id = $1", user_id)


class MemoryStore:
    """The same rules as PgStore, in a dict: for tests and trying the API without Postgres."""

    def __init__(self) -> None:
        self.rows: dict[str, SaveRow] = {}

    async def get(self, user_id: str) -> SaveRow | None:
        return self.rows.get(user_id)

    async def put(
        self, user_id: str, data: dict[str, Any], version: int, workouts: int, base_rev: int | None
    ) -> tuple[bool, SaveRow | None]:
        now = self.rows.get(user_id)
        if (now is None) != (base_rev is None) or (now and now.rev != base_rev):
            return False, now
        row = SaveRow(
            rev=(now.rev + 1) if now else 1,
            version=version,
            workouts=workouts,
            updated_at=datetime.now(UTC),
            data=data,
        )
        self.rows[user_id] = row
        return True, row

    async def delete(self, user_id: str) -> None:
        self.rows.pop(user_id, None)
