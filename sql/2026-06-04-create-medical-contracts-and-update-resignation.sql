-- Migration: Medical Contracts & Resignation update
-- 1. Create medical_contracts table
CREATE TABLE IF NOT EXISTS public.medical_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_email TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    doctor_discord_id TEXT NOT NULL,
    doctor_discord_username TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'สัญญาจ้างแพทย์กู้ภัย',
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    signature_name TEXT,
    signed_at TIMESTAMPTZ,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for medical_contracts
DROP POLICY IF EXISTS "Allow select for doctors own contracts" ON public.medical_contracts;
CREATE POLICY "Allow select for doctors own contracts" 
    ON public.medical_contracts FOR SELECT 
    TO authenticated 
    USING (doctor_discord_id = (auth.jwt()->>'sub') OR doctor_email = auth.jwt()->>'email' OR auth.jwt()->>'role' = 'admin');

DROP POLICY IF EXISTS "Allow update for doctors own contracts" ON public.medical_contracts;
CREATE POLICY "Allow update for doctors own contracts" 
    ON public.medical_contracts FOR UPDATE 
    TO authenticated
    USING (doctor_discord_id = (auth.jwt()->>'sub') OR doctor_email = auth.jwt()->>'email' OR auth.jwt()->>'role' = 'admin')
    WITH CHECK (doctor_discord_id = (auth.jwt()->>'sub') OR doctor_email = auth.jwt()->>'email' OR auth.jwt()->>'role' = 'admin');

DROP POLICY IF EXISTS "Allow insert/all actions for admin" ON public.medical_contracts;
CREATE POLICY "Allow insert/all actions for admin" 
    ON public.medical_contracts FOR ALL 
    TO authenticated 
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_contracts;

-- 2. Add contract_id to user_inbox table if not exists
ALTER TABLE public.user_inbox ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.medical_contracts(id) ON DELETE SET NULL;

-- 3. Add type column to resignation_requests table if not exists
ALTER TABLE public.resignation_requests ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'resignation' CHECK (type IN ('resignation', 'dismissal'));

-- 4. Seed default contract template inside system_settings
INSERT INTO public.system_settings (key, value)
VALUES 
('medical_contract_default_template', to_jsonb('สัญญาปฏิบัติหน้าที่บุคลากรทางการแพทย์

เขียนที่ ศูนย์ปฏิบัติการแพทย์กู้ภัย FiveM EMS Service
วันที่ [วันที่]

สัญญาฉบับนี้ทำขึ้นระหว่าง ศูนย์ปฏิบัติการแพทย์กู้ภัย FiveM EMS Service (ซึ่งต่อไปในสัญญานี้เรียกว่า "หน่วยงาน") ฝ่ายหนึ่ง กับ [ชื่อแพทย์] ([Discord]) (ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ปฏิบัติการ") อีกฝ่ายหนึ่ง

โดยทั้งสองฝ่ายตกลงยินยอมปฏิบัติตามเงื่อนไขและข้อบังคับดังต่อไปนี้:
1. ผู้ปฏิบัติการตกลงที่จะเข้าเวรปฏิบัติหน้าที่รักษาพยาบาลฉุกเฉินและอำนวยความสะดวกในเวลางานอย่างเคร่งครัด
2. ผู้ปฏิบัติการตกลงที่จะสะสมชั่วโมงเข้าเวรให้ครบตามเกณฑ์มาตรฐานขั้นต่ำของหน่วยงานในแต่ละสัปดาห์
3. ผู้ปฏิบัติการตกลงที่จะรักษาวินัย มารยาท และภาพลักษณ์ของบุคลากรทางการแพทย์อย่างสูงสุด ทั้งในเวลางานและนอกเวลางาน
4. ผู้ปฏิบัติการยินยอมที่จะปฏิบัติตามกฎเกณฑ์ ข้อบังคับ และคำสั่งของผู้อำนวยการและคณะผู้บริหารทุกประการ
5. หากผู้ปฏิบัติการละเลยไม่ปฏิบัติหน้าที่หรือฝ่าฝืนกฎวินัย หน่วยงานมีสิทธิ์ยกเลิกสัญญาและปลดพ้นสภาพได้ทันทีโดยไม่ต้องได้รับความยินยอม

ผู้ปฏิบัติการได้รับทราบและยอมรับข้อตกลงทั้งหมด และได้ลงชื่อยินยอมไว้เป็นลายลักษณ์อักษรผ่านระบบอิเล็กทรอนิกส์ฉบับนี้'::text))
ON CONFLICT (key) DO NOTHING;
