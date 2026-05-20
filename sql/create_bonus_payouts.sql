-- ตาราง bonus_payouts สำหรับเก็บประวัติการสั่งจ่ายโบนัสรายบุคคล
CREATE TABLE IF NOT EXISTS bonus_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bonus_history_id UUID NOT NULL,
  doctor_email TEXT NOT NULL,
  doctor_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ DEFAULT now(),
  paid_by TEXT,
  UNIQUE(bonus_history_id, doctor_email)
);

-- Enable RLS
ALTER TABLE bonus_payouts ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "service_role_all" ON bonus_payouts
  FOR ALL USING (true) WITH CHECK (true);
