-- Create blacklist_records table
CREATE TABLE IF NOT EXISTS blacklist_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(255),
  gang VARCHAR(255),
  penalty TEXT,
  fine NUMERIC,
  multiplier INTEGER DEFAULT 1,
  target_type VARCHAR(50) DEFAULT 'ประชาชน',
  status VARCHAR(50) DEFAULT 'active', -- 'active' or 'released'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by VARCHAR(255), -- doctor email or name
  released_at TIMESTAMP WITH TIME ZONE,
  released_by VARCHAR(255) -- email of the releaser
);
