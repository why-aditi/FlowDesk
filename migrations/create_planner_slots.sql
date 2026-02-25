-- Create planner_slots table for hour planner feature
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS planner_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hour TEXT NOT NULL, -- Format: "YYYY-MM-DDTHH:00:00"
  task_title TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one slot per user per hour
  UNIQUE(user_id, hour)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_planner_slots_user_hour ON planner_slots(user_id, hour);
CREATE INDEX IF NOT EXISTS idx_planner_slots_user_created ON planner_slots(user_id, created_at DESC);

-- Add RLS policies
ALTER TABLE planner_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own planner slots
CREATE POLICY "Users can view their own planner slots"
  ON planner_slots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own planner slots
CREATE POLICY "Users can insert their own planner slots"
  ON planner_slots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own planner slots
CREATE POLICY "Users can update their own planner slots"
  ON planner_slots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own planner slots
CREATE POLICY "Users can delete their own planner slots"
  ON planner_slots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_planner_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planner_slots_updated_at
  BEFORE UPDATE ON planner_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_slots_updated_at();
