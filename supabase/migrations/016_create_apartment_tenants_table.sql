-- Create apartment_tenants table to properly link tenants to specific apartments
-- Migration: 016_create_apartment_tenants_table.sql

-- First, update tenant_invitations table to use apartment_id instead of building_id
-- Check if columns exist before dropping them
DO $$ 
BEGIN
    -- Drop building_id column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tenant_invitations' AND column_name = 'building_id') THEN
        ALTER TABLE tenant_invitations DROP COLUMN building_id;
    END IF;
    
    -- Drop apartment_number column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tenant_invitations' AND column_name = 'apartment_number') THEN
        ALTER TABLE tenant_invitations DROP COLUMN apartment_number;
    END IF;
    
    -- Drop floor_number column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tenant_invitations' AND column_name = 'floor_number') THEN
        ALTER TABLE tenant_invitations DROP COLUMN floor_number;
    END IF;
    
    -- Add apartment_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenant_invitations' AND column_name = 'apartment_id') THEN
        ALTER TABLE tenant_invitations ADD COLUMN apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop existing building_tenants table if it exists
DROP TABLE IF EXISTS building_tenants CASCADE;

-- Create apartment_tenants table
CREATE TABLE IF NOT EXISTS apartment_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tenant per apartment (one apartment can have only one tenant)
    UNIQUE(apartment_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_apartment_tenants_apartment_id ON apartment_tenants(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_tenants_tenant_id ON apartment_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apartment_tenants_status ON apartment_tenants(status);

-- Enable RLS
ALTER TABLE apartment_tenants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Tenants can see their own records
CREATE POLICY "Tenants can view their own apartment assignments" ON apartment_tenants
    FOR SELECT USING (tenant_id = auth.uid());

-- Building owners can see all tenants in their buildings
CREATE POLICY "Building owners can view all tenants in their buildings" ON apartment_tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM apartments a
            JOIN buildings b ON a.building_id = b.id
            WHERE a.id = apartment_tenants.apartment_id
            AND b.user_id = auth.uid()
        )
    );

-- Building owners can manage tenants in their buildings
CREATE POLICY "Building owners can manage tenants in their buildings" ON apartment_tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM apartments a
            JOIN buildings b ON a.building_id = b.id
            WHERE a.id = apartment_tenants.apartment_id
            AND b.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL PRIVILEGES ON apartment_tenants TO authenticated;
GRANT ALL PRIVILEGES ON apartment_tenants TO service_role;

-- Create a view for easier querying with building and apartment details
CREATE OR REPLACE VIEW apartment_tenants_with_details AS
SELECT 
    at.id,
    at.apartment_id,
    at.tenant_id,
    at.status,
    at.invited_by,
    at.invited_at,
    at.joined_at,
    at.created_at,
    u.email as tenant_email,
    u.raw_user_meta_data->>'name' as tenant_name,
    a.apartment_number,
    a.floor,
    b.id as building_id,
    b.name as building_name,
    b.address as building_address,
    inviter.email as inviter_email,
    inviter.raw_user_meta_data->>'name' as inviter_name
FROM apartment_tenants at
LEFT JOIN auth.users u ON at.tenant_id = u.id
LEFT JOIN apartments a ON at.apartment_id = a.id
LEFT JOIN buildings b ON a.building_id = b.id
LEFT JOIN auth.users inviter ON at.invited_by = inviter.id;

-- Grant permissions on the view
GRANT SELECT ON apartment_tenants_with_details TO authenticated;
GRANT SELECT ON apartment_tenants_with_details TO service_role;