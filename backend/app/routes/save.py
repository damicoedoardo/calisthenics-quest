"""The save backup: GET the cloud copy, PUT a new one, DELETE it.

A PUT names the rev it was based on (`base_rev`, null for the first upload). If the cloud moved on
since (another phone saved), nothing is written and the answer is 409 with the cloud copy, so the
app can ask the player which one to keep. The app sends the cloud's rev back to keep its own.
"""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth import AuthedUser, get_authed_user
from app.config import settings
from app.saves import PgStore, SaveRow, SaveStore

router = APIRouter()

_store: SaveStore = PgStore()


def get_store() -> SaveStore:
    return _store


class PutSave(BaseModel):
    data: dict[str, Any]
    base_rev: int | None = None


def _out(row: SaveRow, with_data: bool = True) -> dict[str, Any]:
    out: dict[str, Any] = {
        "rev": row.rev,
        "version": row.version,
        "workouts": row.workouts,
        "updated_at": row.updated_at.isoformat(),
    }
    if with_data:
        out["data"] = row.data
    return out


def _check(data: dict[str, Any]) -> tuple[int, int]:
    """A save looks like a GameState: a whole-number version and a list of sessions."""
    version = data.get("version")
    sessions = data.get("sessions")
    if not isinstance(version, int) or isinstance(version, bool) or not isinstance(sessions, list):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Not a FORMA save")
    return version, len(sessions)


@router.get("/save")
async def get_save(
    user: AuthedUser = Depends(get_authed_user), store: SaveStore = Depends(get_store)
) -> dict[str, Any]:
    row = await store.get(user.user_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No save yet")
    return _out(row)


@router.put("/save")
async def put_save(
    request: Request,
    user: AuthedUser = Depends(get_authed_user),
    store: SaveStore = Depends(get_store),
) -> Any:
    raw = await request.body()
    if len(raw) > settings.max_save_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Save is too big")
    try:
        body = PutSave.model_validate(json.loads(raw))
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Not a FORMA save") from None
    version, workouts = _check(body.data)
    written, row = await store.put(user.user_id, body.data, version, workouts, body.base_rev)
    if not written:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "The cloud save changed", "current": _out(row) if row else None},
        )
    assert row is not None
    return _out(row, with_data=False)


@router.delete("/save", status_code=status.HTTP_204_NO_CONTENT)
async def delete_save(
    user: AuthedUser = Depends(get_authed_user), store: SaveStore = Depends(get_store)
) -> Response:
    await store.delete(user.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
