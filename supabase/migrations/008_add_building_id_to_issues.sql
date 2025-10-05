-- Add building_id column to issues table
-- This allows issues to be directly associated with buildings

ALTER TABLE issues 
ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_issues_building_id ON issues(building_id);

-- Update existing issues to have building_id based on their apartment's building
UPDATE issues 
SET building_id = apartments.building_id 
FROM apartments 
WHERE issues.apartment_id = apartments.id;

-- Make building_id nullable since some issues might not be tied to specific apartments
-- but rather to the building as a whole