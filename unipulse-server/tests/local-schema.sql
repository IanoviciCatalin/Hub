CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY,
 credential_hash TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 24),
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS player_credentials (
 player_id TEXT PRIMARY KEY REFERENCES players(id),
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 last_login INTEGER,
 failed_attempts INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0,
 must_change INTEGER NOT NULL DEFAULT 0,
 disabled INTEGER NOT NULL DEFAULT 0
);
-- O sesiune pe dispozitiv. Cookie-ul __Host-duca_player conține tokenul; aici stă doar SHA-256.
CREATE TABLE IF NOT EXISTS player_sessions (
 token_hash TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS player_sessions_player ON player_sessions(player_id);
