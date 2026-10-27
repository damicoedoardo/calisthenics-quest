"""Who is calling: the Supabase login token, checked here, never issued here.

Copied from minlit's backend/app/auth.py (user part only). Supabase signs tokens with an
asymmetric key whose public half we fetch from its JWKS URL; the old shared-secret (HS256)
tokens are accepted only when turned on, for local tests.
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.auth_jwks import JwksCache, JwksError
from app.config import Settings

security = HTTPBearer(auto_error=False)

ASYMMETRIC_ALGORITHMS = {"RS256", "ES256"}
jwks_cache = JwksCache()


@dataclass(frozen=True)
class AuthedUser:
    user_id: str
    email: str | None


def get_settings() -> Settings:
    return Settings()


async def get_authed_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthedUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")

        if algorithm == "HS256":
            if not settings.supabase_allow_legacy_hs256 or not settings.supabase_jwt_secret:
                raise JWTError("legacy HS256 verification is disabled")
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require_exp": True, "require_sub": True},
            )
        elif algorithm in ASYMMETRIC_ALGORITHMS:
            kid = header.get("kid")
            if (
                not isinstance(kid, str)
                or not kid
                or not settings.supabase_issuer
                or not settings.supabase_jwks_url
            ):
                raise JWTError("asymmetric verifier is not configured")
            signing_key = await jwks_cache.get_key(settings.supabase_jwks_url, kid)
            if signing_key is None:
                raise JWTError("signing key not found")
            if signing_key.get("alg") != algorithm or signing_key.get("use") not in (None, "sig"):
                raise JWTError("invalid signing key metadata")
            key_operations = signing_key.get("key_ops")
            if key_operations is not None and (
                not isinstance(key_operations, list) or "verify" not in key_operations
            ):
                raise JWTError("signing key is not permitted for verification")
            if algorithm == "RS256" and signing_key.get("kty") != "RSA":
                raise JWTError("invalid RSA signing key")
            if algorithm == "ES256" and (
                signing_key.get("kty") != "EC" or signing_key.get("crv") != "P-256"
            ):
                raise JWTError("invalid EC signing key")
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=[algorithm],
                audience="authenticated",
                issuer=settings.supabase_issuer,
                options={"require_exp": True, "require_sub": True},
            )
        else:
            raise JWTError("unsupported signing algorithm")

        if payload.get("aud") != "authenticated":
            raise JWTError("invalid audience")
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id.strip():
            raise JWTError("invalid subject")
        email = payload.get("email")
        if not isinstance(email, str) or not email.strip():
            email = None
        return AuthedUser(user_id=user_id, email=email)
    except (JWTError, JwksError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from None
