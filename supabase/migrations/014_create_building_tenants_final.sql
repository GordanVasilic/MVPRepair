-- Create building_tenants table for managing tenant-building relationships
-- Final version with proper constraints and indexes

CREATE TABLE IF NOT EXISTS building_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    apartment_number VARCHAR(10) NOT NULL,
    floor_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tenant per apartment in building
    UNIQUE(building_id, apartment_number),
    -- Ensure tenant can only be in one apartment per building
    UNIQUE(building_id, tenant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
CREATE INDEX IF NOT EXISTS idx_building_tenants_tenant_id ON building_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);

-- Enable RLS
ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;

-- Company owners can see all tenants in their buildings
CREATE POLICY IF NOT EXISTS "Company owners can view their building tenants" ON building_tenants
    FOR SELECT USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
        )
    );

-- Company owners can manage tenants in their buildings
CREATE POLICY IF NOT EXISTS "Company owners can manage their building tenants" ON building_tenants
    FOR ALL USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
        )
    );

-- Tenants can view their own records
CREATE POLICY IF NOT EXISTS "Tenants can view their own records" ON building_tenants
    FOR SELECT USING (tenant_id = auth.uid());

-- Grant permissions
GRANT ALL PRIVILEGES ON building_tenants TO authenticated;
GRANT ALL PRIVILEGES ON building_tenants TO service_role;