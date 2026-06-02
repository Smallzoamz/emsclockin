-- Add discord_thread_id column to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS discord_thread_id TEXT;
