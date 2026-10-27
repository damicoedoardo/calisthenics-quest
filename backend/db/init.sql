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

-- Friends (app/friends.py): each player's public card and who is friends with whom. The api
-- also creates these on start (friends.SCHEMA), so a server that predates them gets them on deploy.
CREATE TABLE IF NOT EXISTS profiles (
    user_id     uuid PRIMARY KEY,
    code        text NOT NULL UNIQUE,
    name        text NOT NULL DEFAULT '',
    class_id    text,
    level       integer NOT NULL DEFAULT 1,
    look        jsonb,
    trained_at  timestamptz,
    playing     text,
    seen_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS friends (
    a           uuid NOT NULL,
    b           uuid NOT NULL,
    accepted    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (a, b)
);
CREATE INDEX IF NOT EXISTS friends_b ON friends (b);

-- Parties (app/party.py): friends who go into the Fog together. Also created by the api on start.
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

-- Forge materials one friend gives another, waiting until claimed (app/gifts.py).
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
