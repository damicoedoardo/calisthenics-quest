from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "development"

    # Supabase signs every login token; we only check them (JWKS), never issue them.
    supabase_issuer: str = ""
    supabase_jwks_url: str = ""
    # Only for local tests: Supabase's old shared-secret tokens. Off in production.
    supabase_jwt_secret: str = ""
    supabase_allow_legacy_hs256: bool = False

    database_url: str = "postgresql://forma:forma_dev@localhost:5432/forma"

    # The web app's origins: production, Vercel previews, local dev.
    cors_origins: str = "https://forma-nu-red.vercel.app,http://localhost:3000"
    cors_origin_regex: str = r"https://forma-.*-edoardo-damicos-projects\.vercel\.app"

    # The biggest save we keep, in bytes of JSON. A real save is a few hundred KB at most.
    max_save_bytes: int = 2_000_000

    model_config = {"env_prefix": "FORMA_"}


settings = Settings()
