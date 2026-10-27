-- FORMA's database, run by Postgres on its first boot (docker-compose.yml mounts it into
-- /docker-entrypoint-initdb.d). After that, changes go in a new db/migrate_<date>_<what>.sql,
-- applied by hand, and are copied here too so a fresh server matches.

-- One save per player: the game's whole GameState as JSON (src/lib/game.ts), as the phone last
-- sent it. `rev` goes up by one on every write; a write must name the rev it was based on, so a
-- phone that missed a newer save can never overwrite it (app/routes/save.py).
CREATE TABLE IF NOT EXISTS saves (
    user_id     uuid PRIMARY KEY,
    data        jsonb NOT NULL,
    version     integer NOT NULL,
    workouts    integer NOT NULL DEFAULT 0,
    rev         integer NOT NULL DEFAULT 1,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
