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

async function applyTenantMigration() {
  console.log('🔧 Primenjivanje tenant management migracije...\n')
  
  try {
    // 1. Kreiranje building_tenants tabele
    console.log('1. Kreiranje building_tenants tabele...')
    const createTableSQL = `
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
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (createError) {
      console.error('❌ Greška pri kreiranju tabele:', createError.message)
      return
    }
    
    console.log('✅ building_tenants tabela kreirana')
    
    // 2. Kreiranje tenant_invitations tabele
    console.log('\n2. Kreiranje tenant_invitations tabele...')
    const createInvitationsSQL = `
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
    `
    
    const { error: invitationsError } = await supabase.rpc('exec_sql', { sql: createInvitationsSQL })
    
    if (invitationsError) {
      console.error('❌ Greška pri kreiranju invitations tabele:', invitationsError.message)
      return
    }
    
    console.log('✅ tenant_invitations tabela kreirana')
    
    // 3. Kreiranje indeksa
    console.log('\n3. Kreiranje indeksa...')
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_user_id ON building_tenants(user_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);
    `
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexesSQL })
    
    if (indexError) {
      console.error('❌ Greška pri kreiranju indeksa:', indexError.message)
      return
    }
    
    console.log('✅ Indeksi kreirani')
    
    // 4. Omogućavanje RLS
    console.log('\n4. Omogućavanje RLS...')
    const rlsSQL = `
      ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
    `
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL })
    
    if (rlsError) {
      console.error('❌ Greška pri omogućavanju RLS:', rlsError.message)
      return
    }
    
    console.log('✅ RLS omogućen')
    
    // 5. Kreiranje RLS politika
    console.log('\n5. Kreiranje RLS politika...')
    const policiesSQL = `
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
    `
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSQL })
    
    if (policiesError) {
      console.error('❌ Greška pri kreiranju politika:', policiesError.message)
      return
    }
    
    console.log('✅ RLS politike kreirane')
    
    // 6. Dodavanje dozvola
    console.log('\n6. Dodavanje dozvola...')
    const permissionsSQL = `
      GRANT SELECT ON building_tenants TO anon;
      GRANT ALL PRIVILEGES ON building_tenants TO authenticated;
      GRANT SELECT ON tenant_invitations TO anon;
      GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;
    `
    
    const { error: permissionsError } = await supabase.rpc('exec_sql', { sql: permissionsSQL })
    
    if (permissionsError) {
      console.error('❌ Greška pri dodavanju dozvola:', permissionsError.message)
      return
    }
    
    console.log('✅ Dozvole dodane')
    
    // 7. Kreiranje view-a
    console.log('\n7. Kreiranje tenant_management_view...')
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
    
    const { error: viewError } = await supabase.rpc('exec_sql', { sql: viewSQL })
    
    if (viewError) {
      console.error('❌ Greška pri kreiranju view-a:', viewError.message)
      return
    }
    
    console.log('✅ tenant_management_view kreiran')
    
    console.log('\n🎉 Tenant management migracija uspešno primenjena!')
    console.log('   Sada možete kreirati veze između stanara i zgrada.')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

applyTenantMigration()