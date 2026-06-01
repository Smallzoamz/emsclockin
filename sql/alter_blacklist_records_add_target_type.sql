-- Migration: Add target_type column to blacklist_records table
ALTER TABLE blacklist_records ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'ประชาชน';
