-- Create tenant management tables and policies
-- Migration: 012_create_tenant_management_tables.sql

-- Create building_tenants table for managing tenant-building relationships
CREATE TABLE IF NOT EXISTS building_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    apartment_number VARCHAR(10), -- npr. "1A", "2B", "15"
    floor_number INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id), -- firma koja je pozvala
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(building_id, user_id) -- jedan korisnik može biti stanar samo jednom u istoj zgradi
);

-- Create tenant_invitations table for managing email invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    apartment_number VARCHAR(10),
    floor_number INTEGER,
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
CREATE INDEX IF NOT EXISTS idx_building_tenants_user_id ON building_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);

-- Enable RLS on both tables
ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for building_tenants
CREATE POLICY "Companies can manage their building tenants" ON building_tenants
    FOR ALL USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can view their own records" ON building_tenants
    FOR SELECT USING (user_id = auth.uid());

-- RLS policies for tenant_invitations  
CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
    FOR ALL USING (invited_by = auth.uid());

CREATE POLICY "Public can read invitations by token" ON tenant_invitations
    FOR SELECT USING (true);

-- Grant permissions for Supabase roles
GRANT SELECT ON building_tenants TO anon;
GRANT ALL PRIVILEGES ON building_tenants TO authenticated;

GRANT SELECT ON tenant_invitations TO anon;
GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;

-- Add floor_number column to issues table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'floor_number') THEN
        ALTER TABLE issues ADD COLUMN floor_number INTEGER;
    END IF;
END $$;

-- Update existing issues with floor_number from building_tenants
-- This will be done after we have some data in building_tenants table

-- Create a function to automatically set floor_number when creating issues
CREATE OR REPLACE FUNCTION set_issue_floor_number()
RETURNS TRIGGER AS $$
BEGIN
    -- If floor_number is not provided, try to get it from building_tenants
    IF NEW.floor_number IS NULL THEN
        SELECT bt.floor_number INTO NEW.floor_number
        FROM building_tenants bt
        WHERE bt.user_id = NEW.user_id
        AND bt.status = 'active'
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set floor_number on issue creation
DROP TRIGGER IF EXISTS trigger_set_issue_floor_number ON issues;
CREATE TRIGGER trigger_set_issue_floor_number
    BEFORE INSERT ON issues
    FOR EACH ROW
    EXECUTE FUNCTION set_issue_floor_number();

-- Create a view for easier tenant management queries
CREATE OR REPLACE VIEW tenant_management_view AS
SELECT 
    bt.id,
    bt.building_id,
    bt.user_id,
    bt.apartment_number,
    bt.floor_number,
    bt.status,
    bt.invited_by,
    bt.invited_at,
    bt.joined_at,
    bt.created_at,
    u.email as tenant_email,
    u.raw_user_meta_data->>'name' as tenant_name,
    b.name as building_name,
    b.address as building_address,
    inviter.email as inviter_email,
    inviter.raw_user_meta_data->>'name' as inviter_name
FROM building_tenants bt
LEFT JOIN auth.users u ON bt.user_id = u.id
LEFT JOIN buildings b ON bt.building_id = b.id
LEFT JOIN auth.users inviter ON bt.invited_by = inviter.id;

-- Grant access to the view
GRANT SELECT ON tenant_management_view TO authenticated;