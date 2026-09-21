CREATE TABLE IF NOT EXISTS jobs (
  job_id            TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  company           TEXT NOT NULL,
  url               TEXT NOT NULL,
  location          TEXT,
  work_mode         TEXT NOT NULL CHECK (work_mode IN ('remote', 'hybrid', 'onsite', 'unknown')),
  salary_min        INTEGER,
  salary_max        INTEGER,
  salary_currency   TEXT,
  latam_eligibility TEXT NOT NULL CHECK (latam_eligibility IN ('latam_mx_br', 'us_only', 'unknown')),
  remote_notes      TEXT,
  source            TEXT NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL,
  last_seen_at      TIMESTAMPTZ NOT NULL,
  missed_runs       INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  raw_json          JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS jobs_active_last_seen_idx ON jobs (is_active, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs (source);
CREATE INDEX IF NOT EXISTS jobs_active_work_mode_idx ON jobs (work_mode) WHERE is_active;
CREATE INDEX IF NOT EXISTS jobs_active_latam_idx ON jobs (latam_eligibility) WHERE is_active;
CREATE INDEX IF NOT EXISTS jobs_active_company_idx ON jobs (lower(company)) WHERE is_active;
CREATE INDEX IF NOT EXISTS jobs_active_salary_max_idx ON jobs (salary_max DESC NULLS LAST) WHERE is_active;

CREATE TABLE IF NOT EXISTS scrape_runs (
  id            SERIAL PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL,
  finished_at   TIMESTAMPTZ NOT NULL,
  boards_ok     INTEGER NOT NULL,
  boards_failed INTEGER NOT NULL,
  jobs_seen     INTEGER NOT NULL,
  jobs_matched  INTEGER NOT NULL,
  boards        JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS scrape_runs_finished_idx ON scrape_runs (finished_at DESC);
