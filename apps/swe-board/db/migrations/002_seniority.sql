ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS seniority TEXT NOT NULL DEFAULT 'unknown'
    CHECK (seniority IN ('entry', 'associate', 'mid', 'senior', 'staff', 'principal', 'manager', 'unknown'));

CREATE INDEX IF NOT EXISTS jobs_active_seniority_idx ON jobs (seniority) WHERE is_active;
