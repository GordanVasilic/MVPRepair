require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTenantInvitationsTable() {
  console.log('🔧 KREIRAM TENANT_INVITATIONS TABELU');
  console.log('====================================');

  try {
    // Kreiraj admin klijent
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Admin klijent kreiran');

    // Proverava da li tabela već postoji
    console.log('1. Proveravam da li tenant_invitations tabela postoji...');
    const { data: existingTables, error: checkError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'tenant_invitations');

    if (checkError) {
      console.log('⚠️ Greška pri proveri postojanja tabele (možda ne postoji):', checkError.message);
    }

    if (existingTables && existingTables.length > 0) {
      console.log('✅ tenant_invitations tabela već postoji');
      return;
    }

    // Direktno kreiranje tabele preko SQL-a
    console.log('2. Kreiram tenant_invitations tabelu...');
    
    // Koristimo REST API direktno
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: `
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

          CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);
          CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
          CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);

          ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
              FOR ALL USING (invited_by = auth.uid());

          CREATE POLICY "Public can read invitations by token" ON tenant_invitations
              FOR SELECT USING (true);

          GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;
        `
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Greška pri kreiranju tabele:', errorText);
      return;
    }

    console.log('✅ tenant_invitations tabela uspešno kreirana');

    // Proverava da li je tabela stvarno kreirana
    console.log('3. Proveravam da li je tabela kreirana...');
    const { data: newTables, error: verifyError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'tenant_invitations');

    if (verifyError) {
      console.log('⚠️ Greška pri verifikaciji:', verifyError.message);
    } else if (newTables && newTables.length > 0) {
      console.log('✅ Tabela je uspešno kreirana i verifikovana');
    } else {
      console.log('⚠️ Tabela možda nije kreirana ili nije vidljiva');
    }

    console.log('\n🎉 tenant_invitations tabela je spremna za korišćenje!');

  } catch (error) {
    console.error('❌ Neočekivana greška:', error);
  }
}

createTenantInvitationsTable();