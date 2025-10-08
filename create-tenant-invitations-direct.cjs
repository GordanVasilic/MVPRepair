require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTenantInvitationsTable() {
  console.log('🔧 KREIRAM TENANT_INVITATIONS TABELU DIREKTNO');
  console.log('==============================================');

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

    // Pokušaj da kreiram tabelu direktno
    console.log('1. Kreiram tenant_invitations tabelu...');
    
    const { data, error } = await adminClient
      .from('tenant_invitations')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ tenant_invitations tabela već postoji');
      return;
    }

    console.log('2. Tabela ne postoji, kreiram je...');

    // Pokušaj da kreiram tabelu preko raw SQL-a
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
    `;

    // Pokušaj preko SQL editora
    const { data: sqlResult, error: sqlError } = await adminClient
      .from('_sql')
      .insert({ query: createTableSQL });

    if (sqlError) {
      console.log('⚠️ Greška pri kreiranju preko SQL editora:', sqlError.message);
      
      // Pokušaj direktno preko REST API-ja
      console.log('3. Pokušavam direktno preko REST API-ja...');
      
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: createTableSQL
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Greška pri direktnom kreiranju:', errorText);
        
        // Poslednji pokušaj - kreiraj tabelu manuelno
        console.log('4. Poslednji pokušaj - kreiram tabelu manuelno...');
        
        try {
          // Pokušaj da insertujemo prazan red da vidimo da li tabela postoji
          const { data: insertData, error: insertError } = await adminClient
            .from('tenant_invitations')
            .insert({
              email: 'test@test.com',
              building_id: '00000000-0000-0000-0000-000000000000',
              invite_token: 'test-token-' + Date.now(),
              invited_by: '00000000-0000-0000-0000-000000000000'
            })
            .select();

          if (!insertError) {
            console.log('✅ Tabela postoji i funkcioniše');
            
            // Obriši test red
            await adminClient
              .from('tenant_invitations')
              .delete()
              .eq('email', 'test@test.com');
              
            return;
          }
        } catch (testError) {
          console.log('⚠️ Test insert neuspešan:', testError.message);
        }
        
        console.error('❌ Sve metode neuspešne. Tabela možda ne postoji.');
        return;
      }

      console.log('✅ Tabela kreirana preko REST API-ja');
    } else {
      console.log('✅ Tabela kreirana preko SQL editora');
    }

    // Kreiraj indekse i politike
    console.log('5. Kreiram indekse i politike...');
    
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invite_token);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);
      
      ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Companies can manage their invitations" ON tenant_invitations
          FOR ALL USING (invited_by = auth.uid());
      
      CREATE POLICY "Public can read invitations by token" ON tenant_invitations
          FOR SELECT USING (true);
      
      GRANT ALL PRIVILEGES ON tenant_invitations TO authenticated;
    `;

    // Pokušaj da primeniš indekse i politike
    try {
      const indexResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: indexesSQL
      });

      if (indexResponse.ok) {
        console.log('✅ Indeksi i politike kreirani');
      } else {
        console.log('⚠️ Greška pri kreiranju indeksa i politika');
      }
    } catch (indexError) {
      console.log('⚠️ Greška pri kreiranju indeksa:', indexError.message);
    }

    // Finalna provera
    console.log('6. Finalna provera...');
    const { data: finalCheck, error: finalError } = await adminClient
      .from('tenant_invitations')
      .select('id')
      .limit(1);

    if (!finalError) {
      console.log('✅ tenant_invitations tabela je uspešno kreirana i dostupna!');
    } else {
      console.log('⚠️ Tabela možda nije potpuno funkcionalna:', finalError.message);
    }

    console.log('\n🎉 Proces završen!');

  } catch (error) {
    console.error('❌ Neočekivana greška:', error);
  }
}

createTenantInvitationsTable();