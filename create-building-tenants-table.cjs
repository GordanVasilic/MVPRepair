const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBuildingTenantsTable() {
  try {
    console.log('Creating building_tenants table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    
    console.log('✅ building_tenants table created successfully');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createBuildingTenantsTable();