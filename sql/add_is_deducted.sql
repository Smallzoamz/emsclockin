-- เพิ่มคอลัมน์ is_deducted เพื่อให้แอดมินสามารถหักเวรที่ไม่เป็นไปตามเงื่อนไขได้
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_deducted BOOLEAN DEFAULT false;
