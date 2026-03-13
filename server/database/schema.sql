CREATE TABLE IF NOT EXISTS reviews (

  user_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,

  repetition INT DEFAULT 0,
  interval INT DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,

  next_review BIGINT,
  last_result TEXT,

  rev_id BIGINT,

  PRIMARY KEY(user_id, question_id)

);

CREATE INDEX IF NOT EXISTS idx_reviews_user_rev
ON reviews(user_id, rev_id);
