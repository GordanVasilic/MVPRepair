-- Fix foreign key constraints to use auth.users instead of custom users table
-- This migration removes the custom users table and updates all references to use auth.users

-- First, drop all foreign key constraints that reference the custom users table
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_user_id_fkey;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_assigned_to_fkey;
ALTER TABLE issue_comments DROP CONSTRAINT IF EXISTS issue_comments_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS user_buildings_user_id_fkey;

-- Drop the custom users table (it's not needed since we use auth.users)
DROP TABLE IF EXISTS users CASCADE;

-- Update issues table to reference auth.users
ALTER TABLE issues 
ADD CONSTRAINT issues_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE issues 
ADD CONSTRAINT issues_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update issue_comments table to reference auth.users
ALTER TABLE issue_comments 
ADD CONSTRAINT issue_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update notifications table to reference auth.users
ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update user_buildings table to reference auth.users
ALTER TABLE user_buildings 
ADD CONSTRAINT user_buildings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a view to access user data from auth.users with metadata
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'phone' as phone,
    COALESCE(raw_user_meta_data->>'role', 'tenant') as role,
    created_at,
    updated_at
FROM auth.users;

-- Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;