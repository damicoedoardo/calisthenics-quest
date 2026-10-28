"""Live party runs: a pass to the game server (POST /party/play).

The game server (play/ at the repo root, `play` in docker-compose.yml) plays one run per party
start. It trusts a pass signed with the secret both share: who you are, your party, its start
(seed and zone) and its members in order, so it knows whom to wait for.
"""

import time

from jose import jwt


def play_pass(
    *,
    secret: str,
    user_id: str,
    party_id: str,
    seed: int,
    zone: int,
    users: list[str],
    seconds: int,
    now: float | None = None,
) -> str:
    t = int(now if now is not None else time.time())
    claims = {
        "sub": user_id,
        "party": party_id,
        "seed": seed,
        "zone": zone,
        "users": users,
        "iat": t,
        "exp": t + seconds,
    }
    return jwt.encode(claims, secret, algorithm="HS256")
