-- Update issue status constraint to include 'assigned_to_master' status
-- This migration updates the status check constraint to match the frontend implementation

-- Drop the existing constraint
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;

-- Add the new constraint with the updated status values
ALTER TABLE issues ADD CONSTRAINT issues_status_check 
CHECK (status IN ('open', 'assigned_to_master', 'in_progress', 'closed'));

-- Update any existing 'assigned' status to 'assigned_to_master' for consistency
UPDATE issues SET status = 'assigned_to_master' WHERE status = 'assigned';