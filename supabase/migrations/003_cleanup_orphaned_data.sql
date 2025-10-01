-- Clean up orphaned data before applying foreign key constraints
-- This migration removes any data that references non-existent users

-- Delete issues that reference non-existent users
DELETE FROM issues 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete issues where assigned_to references non-existent users
UPDATE issues 
SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL 
AND assigned_to NOT IN (SELECT id FROM auth.users);

-- Delete issue_comments that reference non-existent users
DELETE FROM issue_comments 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete notifications that reference non-existent users
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete user_buildings that reference non-existent users
DELETE FROM user_buildings 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now apply the foreign key constraints
ALTER TABLE issues 
ADD CONSTRAINT issues_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE issues 
ADD CONSTRAINT issues_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE issue_comments 
ADD CONSTRAINT issue_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_buildings 
ADD CONSTRAINT user_buildings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;