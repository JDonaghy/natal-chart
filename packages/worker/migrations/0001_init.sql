-- User record (created on first login)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- User preferences (one row per user)
CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Saved charts (inputs only — recalculate on load, cache in localStorage)
CREATE TABLE saved_charts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  birth_data TEXT NOT NULL,
  view_flags TEXT,
  transit_data TEXT,
  share_token TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_charts_user ON saved_charts(user_id);
CREATE INDEX idx_charts_share ON saved_charts(share_token) WHERE share_token IS NOT NULL;
