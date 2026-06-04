-- Create complaints table
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  image_url TEXT,
  discord_message_id TEXT NOT NULL,
  discord_user_id TEXT,
  discord_username TEXT,
  discord_nickname TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable replica identity full for updating Discord messages on update
ALTER TABLE public.complaints REPLICA IDENTITY FULL;

-- Add complaints to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Enable Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public select" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.complaints FOR UPDATE USING (true);
