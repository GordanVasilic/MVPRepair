-- Fix permissions for building_models table
-- This script fixes the RLS policies that are causing permission errors

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage building models" ON building_models;
DROP POLICY IF EXISTS "Admins can manage floor plans" ON floor_plans;
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;

-- Create simplified policies for authenticated users
CREATE POLICY "Authenticated users can manage building models" ON building_models
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage floor plans" ON floor_plans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage rooms" ON rooms
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON building_models TO authenticated;
GRANT ALL PRIVILEGES ON floor_plans TO authenticated;
GRANT ALL PRIVILEGES ON rooms TO authenticated;