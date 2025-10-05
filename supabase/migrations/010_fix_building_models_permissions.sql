-- Fix permissions for building_models, floor_plans, and rooms tables
-- This migration disables RLS to allow proper access to these tables

-- Disable RLS on building management tables
ALTER TABLE building_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view building models" ON building_models;
DROP POLICY IF EXISTS "Admins can manage building models" ON building_models;
DROP POLICY IF EXISTS "Authenticated users can manage building models" ON building_models;

DROP POLICY IF EXISTS "Users can view floor plans" ON floor_plans;
DROP POLICY IF EXISTS "Admins can manage floor plans" ON floor_plans;
DROP POLICY IF EXISTS "Authenticated users can manage floor plans" ON floor_plans;

DROP POLICY IF EXISTS "Users can view rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;

-- Grant full permissions to authenticated users
GRANT ALL PRIVILEGES ON building_models TO authenticated;
GRANT ALL PRIVILEGES ON floor_plans TO authenticated;
GRANT ALL PRIVILEGES ON rooms TO authenticated;

-- Grant full permissions to service_role
GRANT ALL PRIVILEGES ON building_models TO service_role;
GRANT ALL PRIVILEGES ON floor_plans TO service_role;
GRANT ALL PRIVILEGES ON rooms TO service_role;