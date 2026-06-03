CREATE TABLE doctor_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_uid TEXT NOT NULL,
  ic_firstname TEXT NOT NULL,
  ic_lastname TEXT NOT NULL,
  age TEXT NOT NULL,
  age_type TEXT NOT NULL DEFAULT 'IC',
  previous_experience TEXT,
  reason_to_join TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  queue_number INTEGER NOT NULL,
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE doctor_applications ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (public form)
CREATE POLICY "anon_insert_applications" ON doctor_applications FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to read own by discord_uid  
CREATE POLICY "anon_read_applications" ON doctor_applications FOR SELECT TO anon USING (true);

-- Allow service role full access
CREATE POLICY "service_full_access" ON doctor_applications FOR ALL TO service_role USING (true) WITH CHECK (true);
