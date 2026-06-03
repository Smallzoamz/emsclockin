-- Migration: Enable RLS and allow public read access on blacklist_records table
ALTER TABLE blacklist_records ENABLE ROW LEVEL SECURITY;

-- Drop existing select policies if any to prevent duplicates
DROP POLICY IF EXISTS "Allow public read access" ON blacklist_records;
DROP POLICY IF EXISTS "anon_read_blacklist" ON blacklist_records;

-- Create policy to allow both anon and authenticated users to view blacklist records
CREATE POLICY "Allow public read access" ON blacklist_records 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);
