"""Party voice: a pass for the party's LiveKit room (POST /party/voice).

LiveKit runs on this server (docker-compose.yml, `livekit`). It trusts a pass signed with the
api key and secret both share; the pass names one room, `party-<id>`, so only that party's
members hear each other. Mic only: no camera, no screen, no chat data.
"""

import time

from jose import jwt


def room_of(party_id: str) -> str:
    return f"party-{party_id}"


def voice_pass(
    *,
    key: str,
    secret: str,
    room: str,
    user_id: str,
    name: str,
    seconds: int,
    now: float | None = None,
) -> str:
    t = int(now if now is not None else time.time())
    claims = {
        "iss": key,
        "sub": user_id,
        "name": name,
        "nbf": t - 10,
        "exp": t + seconds,
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": False,
            "canPublishSources": ["microphone"],
        },
    }
    return jwt.encode(claims, secret, algorithm="HS256")
