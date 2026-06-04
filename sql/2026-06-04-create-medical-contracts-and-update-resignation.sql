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

-- Enable Realtime for the table if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        WHERE p.pubname = 'supabase_realtime' 
          AND c.relname = 'medical_contracts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_contracts;
    END IF;
END $$;

-- 2. Add contract_id to user_inbox table if not exists
ALTER TABLE public.user_inbox ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.medical_contracts(id) ON DELETE SET NULL;

-- 3. Add type column to resignation_requests table if not exists
ALTER TABLE public.resignation_requests ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'resignation' CHECK (type IN ('resignation', 'dismissal'));

-- 4. Seed default contract template inside system_settings
INSERT INTO public.system_settings (key, value)
VALUES 
('medical_contract_default_template', to_jsonb('เลขที่สัญญา : FCMD-EMS-[เลขสัญญา]

ข้าพเจ้า [ชื่อผู้ลงนาม]
ชื่อในเมือง (Character Name) : [ชื่อแพทย์]

มีความประสงค์เข้าร่วมปฏิบัติหน้าที่เป็นบุคลากรทางการแพทย์ภายใต้หน่วยงาน Fox Community Medical Unit (FCMD) และตกลงตามเงื่อนไขดังต่อไปนี้

ข้อกำหนด
1. ข้าพเจ้าตกลงปฏิบัติหน้าที่ในสังกัด FCMD เป็นระยะเวลาไม่น้อยกว่า 30 วัน นับจากวันที่ลงนามในสัญญา
2. ตลอดระยะเวลาของสัญญา ข้าพเจ้าจะปฏิบัติตามกฎ ระเบียบ และคำสั่งของหน่วยงานอย่างเคร่งครัด
3. หากข้าพเจ้าลาออก ย้ายหน่วยงาน หรือกระทำการใด ๆ ที่ส่งผลให้พ้นสภาพการเป็นบุคลากรทางการแพทย์ก่อนครบกำหนดสัญญา 30 วัน จะถือว่าเป็นการ ผิดสัญญา
4. ผู้ที่ผิดสัญญาจะต้องเลือกดำเนินการอย่างใดอย่างหนึ่ง ดังต่อไปนี้
   • ชำระค่าฉีกสัญญาเป็นจำนวน 5,000,000 IC
   • ยินยอมให้ดำเนินการ รีเซ็ตตัวละคร (Character Reset) ตามระเบียบของเซิร์ฟเวอร์
5. ในกรณีที่พ้นสภาพจากตำแหน่งเนื่องจากการปลดออกโดยคำสั่งผู้บังคับบัญชา หรือมีเหตุอันสมควรที่ได้รับการอนุมัติจากผู้บริหารหน่วยงาน ให้ถือเป็นดุลยพินิจของผู้บริหารในการยกเว้นค่าฉีกสัญญา

ข้าพเจ้าได้อ่าน ทำความเข้าใจ และยอมรับเงื่อนไขทั้งหมดข้างต้นโดยไม่มีข้อโต้แย้งใด ๆ'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
