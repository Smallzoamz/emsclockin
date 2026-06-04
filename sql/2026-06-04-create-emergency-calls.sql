-- Create emergency_calls table
CREATE TABLE IF NOT EXISTS public.emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  image_url TEXT NOT NULL,
  discord_message_id TEXT NOT NULL,
  discord_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable replica identity full for updating Discord messages on update
ALTER TABLE public.emergency_calls REPLICA IDENTITY FULL;

-- Add emergency_calls to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_calls;

-- Enable Row Level Security (RLS)
ALTER TABLE public.emergency_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public select" ON public.emergency_calls FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.emergency_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.emergency_calls FOR UPDATE USING (true);
