-- Create mentorship_relations table
CREATE TABLE IF NOT EXISTS mentorship_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_email TEXT NOT NULL,
  student_email TEXT NOT NULL,
  mentor_name TEXT,
  student_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'cancelled'
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  acceptance_bonus_added BOOLEAN DEFAULT true,
  completion_bonus_added BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE mentorship_relations ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "service_role_all" ON mentorship_relations
  FOR ALL USING (true) WITH CHECK (true);
