-- Migration: Add release_reason column to blacklist_records
ALTER TABLE blacklist_records ADD COLUMN IF NOT EXISTS release_reason TEXT;
