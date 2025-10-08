const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function applyTenantMigrationDirect() {
  console.log('🔧 Direktno primenjivanje tenant management migracije...\n')
  
  try {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Direktan REST API poziv
    const migrationSQL = `
      -- Create building_tenants table
      CREATE TABLE IF NOT EXISTS building_tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          apartment_number VARCHAR(10),
          floor_number INTEGER,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          invited_by UUID REFERENCES auth.users(id),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          joined_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(building_id, user_id)
      );

      -- Create tenant_invitations table
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

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_user_id ON building_tenants(user_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);

      -- Enable RLS
      ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
    `
    
    console.log('Izvršavanje SQL migracije...')
    
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ HTTP greška:', response.status, response.statusText)
      console.error('Odgovor:', errorText)
      return
    }

    const result = await response.json()
    console.log('✅ Tabele kreirane uspešno')
    
    // Kreiranje RLS politika
    console.log('\nKreiranje RLS politika...')
    const policiesSQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Companies can manage their building tenants" ON building_tenants;
      DROP POLICY IF EXISTS "Tenants can view their own records" ON building_tenants;
      DROP POLICY IF EXISTS "Companies can manage their invitations" ON tenant_invitations;
      DROP POLICY IF EXISTS "Public can read invitations by token" ON tenant_invitations;

      -- Create new policies
      CREATE POLICY "Companies can manage their building tenants" ON building_tenants
          FOR ALL USING (
              building_id IN (
                  SELECT id FROM buildings WHERE user_id = auth.uid()
              )
          );

      CREATE POLICY "Tenants can view their own records" ON building_tenants
          FOR SELECT USING (user_id = auth.uid());

      CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
          FOR ALL USING (invited_by = auth.uid());

      CREATE POLICY "Public can read invitations by token" ON tenant_invitations
          FOR SELECT USING (true);

      -- Grant permissions
      GRANT SELECT ON building_tenants TO anon;
      GRANT ALL PRIVILEGES ON building_tenants TO authenticated;
      GRANT SELECT ON tenant_invitations TO anon;
      GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;
    `
    
    const policiesResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: policiesSQL
      })
    })

    if (!policiesResponse.ok) {
      const errorText = await policiesResponse.text()
      console.error('❌ Greška pri kreiranju politika:', policiesResponse.status)
      console.error('Odgovor:', errorText)
      return
    }

    console.log('✅ RLS politike kreirane')
    
    // Kreiranje view-a
    console.log('\nKreiranje tenant_management_view...')
    const viewSQL = `
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

      GRANT SELECT ON tenant_management_view TO authenticated;
    `
    
    const viewResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: viewSQL
      })
    })

    if (!viewResponse.ok) {
      const errorText = await viewResponse.text()
      console.error('❌ Greška pri kreiranju view-a:', viewResponse.status)
      console.error('Odgovor:', errorText)
      return
    }

    console.log('✅ tenant_management_view kreiran')
    
    console.log('\n🎉 Tenant management migracija uspešno primenjena!')
    console.log('   Sada možete kreirati veze između stanara i zgrada.')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

applyTenantMigrationDirect()