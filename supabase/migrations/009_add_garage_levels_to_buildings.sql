-- Add garage_levels column to buildings table
ALTER TABLE buildings 
ADD COLUMN garage_levels INTEGER DEFAULT 0 CHECK (garage_levels >= 0);

-- Update existing buildings to have 0 garage levels by default
UPDATE buildings 
SET garage_levels = 0 
WHERE garage_levels IS NULL;

-- Add comment to the column
COMMENT ON COLUMN buildings.garage_levels IS 'Number of garage/basement levels below ground level';