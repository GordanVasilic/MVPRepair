-- Migration: Remove floor_number column from issues table
-- This column is redundant since floor information is available through apartments.floor

-- Drop the trigger and function first
DROP TRIGGER IF EXISTS trigger_set_issue_floor_number ON issues;
DROP FUNCTION IF EXISTS set_issue_floor_number();

-- Remove the floor_number column from issues table
ALTER TABLE issues DROP COLUMN IF EXISTS floor_number;

-- Update any existing RLS policies that might reference floor_number
-- (This is a safety measure in case any policies were created)

-- Add a comment to document this change
COMMENT ON TABLE issues IS 'Issues table - floor information available through apartments.floor relationship';