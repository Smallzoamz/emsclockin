-- Create complaints table
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  phone TEXT, -- Phone number for return contact
  image_url TEXT,
  discord_message_id TEXT NOT NULL,
  discord_user_id TEXT,
  discord_username TEXT,
  discord_nickname TEXT,
  discord_thread_id TEXT, -- Thread ID of the private ticket channel
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable replica identity full for updating Discord messages on update
ALTER TABLE public.complaints REPLICA IDENTITY FULL;

-- Add complaints to Supabase Realtime publication conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'complaints' AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'complaints' AND policyname = 'Allow public select'
  ) THEN
    CREATE POLICY "Allow public select" ON public.complaints FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'complaints' AND policyname = 'Allow public insert'
  ) THEN
    CREATE POLICY "Allow public insert" ON public.complaints FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'complaints' AND policyname = 'Allow public update'
  ) THEN
    CREATE POLICY "Allow public update" ON public.complaints FOR UPDATE USING (true);
  END IF;
END $$;
