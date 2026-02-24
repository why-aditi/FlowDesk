-- Add reminder fields to tasks table
-- Run this in your Supabase SQL Editor

-- Add reminder_time column (time of day in HH:MM format, e.g., "14:30")
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_time TEXT;

-- Add frequency_time column (duration in HH:MM format for recurring reminders, e.g., "02:30" for 2 hours 30 minutes)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS frequency_time TEXT;

-- Add last_reminder_sent column (timestamp tracking when the last reminder was sent)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- Add check constraint to validate reminder_time format (HH:MM)
-- Drop constraint first if it exists, then add it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'tasks' AND c.conname = 'check_reminder_time_format'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT check_reminder_time_format;
    END IF;
END $$;

ALTER TABLE tasks
ADD CONSTRAINT check_reminder_time_format 
CHECK (reminder_time IS NULL OR reminder_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

-- Add check constraint to validate frequency_time format (HH:MM)
-- Drop constraint first if it exists, then add it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'tasks' AND c.conname = 'check_frequency_time_format'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT check_frequency_time_format;
    END IF;
END $$;

ALTER TABLE tasks
ADD CONSTRAINT check_frequency_time_format 
CHECK (frequency_time IS NULL OR frequency_time ~ '^([0-9]{1,2}):[0-5][0-9]$');

-- Add index on reminder_time for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_time ON tasks(reminder_time) WHERE reminder_time IS NOT NULL;

-- Add index on last_reminder_sent for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_last_reminder_sent ON tasks(last_reminder_sent) WHERE last_reminder_sent IS NOT NULL;

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Ensure status column exists and has the correct type (if it doesn't already)
-- If status doesn't exist, uncomment the line below:
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done'));
