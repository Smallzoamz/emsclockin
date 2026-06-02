-- Set replica identity to FULL for leave_requests to enable old row columns in Realtime events
ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
