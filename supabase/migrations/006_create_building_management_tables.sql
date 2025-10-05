-- Create tables for building management system
-- This migration adds support for company building management with 3D models and floor plans

-- Table for 3D building models
CREATE TABLE building_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    floors_count INTEGER NOT NULL DEFAULT 1,
    model_config JSONB DEFAULT '{}', -- 3D configuration (floor heights, positions, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for floor plans (2D layouts)
CREATE TABLE floor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    plan_config JSONB DEFAULT '{}', -- 2D floor plan configuration
    rooms JSONB DEFAULT '[]', -- Array of room definitions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(building_id, floor_number)
);

-- Table for individual rooms/apartments
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    room_type VARCHAR(50) NOT NULL DEFAULT 'apartment', -- 'apartment', 'common_area', 'utility', 'commercial'
    room_number VARCHAR(20),
    floor_number INTEGER NOT NULL,
    coordinates JSONB DEFAULT '{}', -- Position on floor plan (x, y, width, height)
    metadata JSONB DEFAULT '{}', -- Additional room data (area, description, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_building_models_building_id ON building_models(building_id);
CREATE INDEX idx_floor_plans_building_id ON floor_plans(building_id);
CREATE INDEX idx_floor_plans_floor_number ON floor_plans(building_id, floor_number);
CREATE INDEX idx_rooms_floor_plan_id ON rooms(floor_plan_id);
CREATE INDEX idx_rooms_building_id ON rooms(building_id);
CREATE INDEX idx_rooms_floor_number ON rooms(building_id, floor_number);

-- Add RLS (Row Level Security) policies
ALTER TABLE building_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policies for building_models (only authenticated users can access)
CREATE POLICY "Users can view building models" ON building_models
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage building models" ON building_models
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for floor_plans (only authenticated users can access)
CREATE POLICY "Users can view floor plans" ON floor_plans
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage floor plans" ON floor_plans
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for rooms (only authenticated users can access)
CREATE POLICY "Users can view rooms" ON rooms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage rooms" ON rooms
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions to authenticated role
GRANT ALL PRIVILEGES ON building_models TO authenticated;
GRANT ALL PRIVILEGES ON floor_plans TO authenticated;
GRANT ALL PRIVILEGES ON rooms TO authenticated;

-- Grant full permissions to service_role (for admin operations)
GRANT ALL PRIVILEGES ON building_models TO service_role;
GRANT ALL PRIVILEGES ON floor_plans TO service_role;
GRANT ALL PRIVILEGES ON rooms TO service_role;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_building_models_updated_at BEFORE UPDATE ON building_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floor_plans_updated_at BEFORE UPDATE ON floor_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();