require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createInvitationsTable() {
  console.log('🔧 KREIRAM TENANT_INVITATIONS TABELU JEDNOSTAVNO');
  console.log('=================================================');

  try {
    // Kreiraj service klijent
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Service klijent kreiran');

    // Pokušaj da kreiram tabelu direktno preko INSERT-a
    console.log('1. Pokušavam da kreiram tabelu...');
    
    // Prvo pokušaj da vidiš da li tabela postoji
    try {
      const { data, error } = await serviceClient
        .from('tenant_invitations')
        .select('count(*)')
        .limit(1);
        
      if (!error) {
        console.log('✅ tenant_invitations tabela već postoji');
        console.log('Broj redova:', data);
        return;
      }
      
      console.log('Tabela ne postoji, greška:', error.message);
    } catch (e) {
      console.log('Tabela definitivno ne postoji');
    }

    // Kreiraj tabelu manuelno preko SQL koda
    console.log('2. Kreiram tabelu preko SQL koda...');
    
    // Pokušaj da koristiš PostgreSQL konekciju direktno
    const pg = require('pg');
    
    // Ekstraktuj connection string iz Supabase URL-a
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Kreiraj PostgreSQL konekciju
    const connectionString = supabaseUrl.replace('https://', 'postgresql://postgres:')
      .replace('.supabase.co', '.supabase.co:5432/postgres');
    
    console.log('Pokušavam PostgreSQL konekciju...');
    
    const client = new pg.Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✅ PostgreSQL konekcija uspešna');

      const createTableSQL = `
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

        DROP POLICY IF EXISTS "Companies can manage their invitations" ON tenant_invitations;
        CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
            FOR ALL USING (invited_by = auth.uid());

        DROP POLICY IF EXISTS "Public can read invitations by token" ON tenant_invitations;
        CREATE POLICY "Public can read invitations by token" ON tenant_invitations
            FOR SELECT USING (true);

        GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;
        GRANT SELECT ON tenant_invitations TO anon;
      `;

      const result = await client.query(createTableSQL);
      console.log('✅ Tabela kreirana preko PostgreSQL konekcije');

      await client.end();

      // Proveri da li tabela sada radi
      console.log('3. Proveravam da li tabela sada radi...');
      const { data: checkData, error: checkError } = await serviceClient
        .from('tenant_invitations')
        .select('count(*)')
        .limit(1);

      if (!checkError) {
        console.log('✅ tenant_invitations tabela je uspešno kreirana i funkcioniše!');
        console.log('Broj redova:', checkData);
      } else {
        console.log('⚠️ Tabela možda nije potpuno funkcionalna:', checkError.message);
      }

    } catch (pgError) {
      console.log('❌ PostgreSQL greška:', pgError.message);
      
      // Poslednji pokušaj - kreiraj preko raw HTTP zahteva
      console.log('4. Poslednji pokušaj preko HTTP zahteva...');
      
      const fetch = require('node-fetch');
      
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
          `
        })
      });

      if (response.ok) {
        console.log('✅ Tabela kreirana preko HTTP zahteva');
      } else {
        const errorText = await response.text();
        console.log('❌ HTTP zahtev neuspešan:', errorText);
      }
    }

    console.log('\n🎉 Proces završen!');

  } catch (error) {
    console.error('❌ Neočekivana greška:', error);
  }
}

createInvitationsTable();