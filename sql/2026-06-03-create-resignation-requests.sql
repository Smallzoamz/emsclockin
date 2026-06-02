-- Create resignation_requests table
CREATE TABLE IF NOT EXISTS public.resignation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_username TEXT NOT NULL,
    discord_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    total_hours NUMERIC NOT NULL DEFAULT 0,
    passing_hours NUMERIC NOT NULL DEFAULT 0,
    is_reset BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'acknowledged')),
    approved_by TEXT,
    discord_thread_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resignation_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow select for doctors own resignations" ON public.resignation_requests;
CREATE POLICY "Allow select for doctors own resignations" 
    ON public.resignation_requests FOR SELECT 
    TO authenticated 
    USING (discord_id = (auth.jwt()->>'sub') OR auth.jwt()->>'role' = 'admin');

DROP POLICY IF EXISTS "Allow insert for all authenticated and bot service" ON public.resignation_requests;
CREATE POLICY "Allow insert for all authenticated and bot service" 
    ON public.resignation_requests FOR INSERT 
    TO authenticated, service_role 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for admin" ON public.resignation_requests;
CREATE POLICY "Allow all actions for admin" 
    ON public.resignation_requests FOR ALL 
    TO authenticated 
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

DROP POLICY IF EXISTS "Allow select for anon" ON public.resignation_requests;
CREATE POLICY "Allow select for anon" 
    ON public.resignation_requests FOR SELECT 
    TO anon 
    USING (true);

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.resignation_requests;

-- Insert default resignation settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES 
('resignation_criteria_hours', to_jsonb(40)),
('resignation_doc_template', to_jsonb('ใบประกาศพ้นสภาพบุคลากรทางการแพทย์

ขอประกาศพ้นสภาพของแพทย์ [ชื่อแพทย์] ([Discord]) จากหน่วยงานแพทย์กู้ภัย FiveM EMS Service เนื่องจากได้ทำการยื่นขอลาออก

เหตุผลการลาออก: [เหตุผล]
ชั่วโมงงานสะสมทั้งหมด: [ชั่วโมงสะสม] / [เกณฑ์ชั่วโมง] ชั่วโมง
สถานะการพ้นสภาพ: [สถานะรีตัว]

ขอขอบคุณในการร่วมงานและดูแลผู้ป่วยตลอดเวลาที่ผ่านมา
ลงชื่อ ผอ. หน่วยงานแพทย์กู้ภัย'::text)),
('resignation_dm_template', to_jsonb('สวัสดีค่ะคุณ [ชื่อแพทย์]

ขอแสดงความยินดีด้วยค่ะ ใบลาออกของคุณได้รับการอนุมัติเรียบร้อยแล้วนะคะ
ทางหน่วยงานแพทย์กู้ภัย FiveM EMS Service ขอขอบคุณที่คุณร่วมปฏิบัติงานและเหน็ดเหนื่อยเคียงข้างพวกเราตลอดเวลาที่ผ่านมาค่ะ

ข้อมูลเพิ่มเติม:
- เวลาสะสมของคุณ: [ชั่วโมงสะสม] ชั่วโมง
- คูลดาวน์ของคุณ: [คูลดาวน์]
- สถานะรีตัว: [สถานะรีตัว]

ขอให้มีความสุขและโชคดีในเส้นทางใหม่ข้างหน้านะคะ 💙'::text)),
('resignation_cooldown_text', to_jsonb('7 วัน'::text))
ON CONFLICT (key) DO NOTHING;
