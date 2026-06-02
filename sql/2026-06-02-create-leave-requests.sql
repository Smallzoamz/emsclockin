-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_username TEXT NOT NULL,
    discord_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'อื่นๆ')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    proof_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow select for doctors own leaves" 
    ON public.leave_requests FOR SELECT 
    TO authenticated 
    USING (discord_id = (auth.jwt()->>'sub') OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow insert for all authenticated and bot service" 
    ON public.leave_requests FOR INSERT 
    TO authenticated, service_role 
    WITH CHECK (true);

CREATE POLICY "Allow all actions for admin" 
    ON public.leave_requests FOR ALL 
    TO authenticated 
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
