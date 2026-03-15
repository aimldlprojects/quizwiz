-- --------------------------------------------------
-- Users
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS users (

  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()

);

-- --------------------------------------------------
-- Subjects
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS subjects (

  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE

);

-- --------------------------------------------------
-- Topics
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS topics (

  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT REFERENCES subjects(id),
  parent_topic_id BIGINT REFERENCES topics(id),
  key TEXT UNIQUE,
  name TEXT NOT NULL

);

-- --------------------------------------------------
-- Questions
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS questions (

  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES topics(id),
  type TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  UNIQUE(topic_id, question)

);

-- --------------------------------------------------
-- User Subjects
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS user_subjects (

  user_id BIGINT NOT NULL REFERENCES users(id),
  subject_id BIGINT NOT NULL REFERENCES subjects(id),

  PRIMARY KEY(user_id, subject_id)

);

-- --------------------------------------------------
-- Reviews (spaced repetition)
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS reviews (

  user_id BIGINT NOT NULL,
  question_id TEXT NOT NULL,

  repetition INT DEFAULT 0,
  interval INT DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,

  next_review BIGINT,
  last_result TEXT,

  rev_id BIGINT,
  last_modified_rev BIGINT,
  sync_version INT DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY(user_id, question_id)

);

CREATE INDEX IF NOT EXISTS idx_reviews_user_rev
ON reviews(user_id, rev_id);


-- --------------------------------------------------
-- Stats
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS stats (

  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT NOT NULL,
  question_id TEXT,

  correct INT DEFAULT 0,
  wrong INT DEFAULT 0,

  practiced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, question_id, practiced_at)

);

-- --------------------------------------------------
-- Badges
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS badges (

  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT

);

-- --------------------------------------------------
-- User Badges
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS user_badges (

  user_id BIGINT NOT NULL,
  badge_id TEXT NOT NULL,

  unlocked_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sync_version BIGINT DEFAULT 1,

  PRIMARY KEY(user_id, badge_id)

  );

-- --------------------------------------------------
-- Settings
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (

  user_id BIGINT NOT NULL DEFAULT 0,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  sync_version BIGINT DEFAULT 1,

  CONSTRAINT settings_user_key_pk
    PRIMARY KEY(user_id, key)

  );

-- --------------------------------------------------
-- Sync Meta
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS sync_meta (

  user_id BIGINT PRIMARY KEY,
  last_push_rev_id BIGINT,
  last_pull_rev_id BIGINT,
  last_sync_time BIGINT,
  sync_status TEXT,
  error_message TEXT,
  last_push TIMESTAMP,
  last_pull TIMESTAMP,
  last_error TEXT,
  updated_at TIMESTAMP DEFAULT NOW()

  );
