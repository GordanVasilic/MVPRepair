-- Add user_id column to buildings table and implement RLS policies
-- This migration fixes the critical security issue where all users can see all buildings

-- Step 1: Add user_id column to buildings table
ALTER TABLE buildings 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index for better performance
CREATE INDEX idx_buildings_user_id ON buildings(user_id);

-- Step 3: Update existing buildings to have a user_id
-- For now, we'll set them to NULL, but in production you might want to assign them to a specific user
-- UPDATE buildings SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Step 4: Enable RLS on buildings table if not already enabled
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all buildings" ON buildings;
DROP POLICY IF EXISTS "Users can manage all buildings" ON buildings;
DROP POLICY IF EXISTS "Authenticated users can view buildings" ON buildings;
DROP POLICY IF EXISTS "Authenticated users can manage buildings" ON buildings;

-- Step 6: Create RLS policies for user-specific access
-- Policy for SELECT: Users can only see their own buildings
CREATE POLICY "Users can view own buildings" ON buildings
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for INSERT: Users can create buildings (user_id will be set automatically)
CREATE POLICY "Users can create buildings" ON buildings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update their own buildings
CREATE POLICY "Users can update own buildings" ON buildings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete their own buildings
CREATE POLICY "Users can delete own buildings" ON buildings
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id_on_buildings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS trigger_set_user_id_buildings ON buildings;
CREATE TRIGGER trigger_set_user_id_buildings
    BEFORE INSERT ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_on_buildings();

-- Step 9: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON buildings TO authenticated;