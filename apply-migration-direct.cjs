require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function applyMigrationDirect() {
  console.log('🔧 PRIMENJUJEM MIGRACIJU DIREKTNO');
  console.log('=================================');

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

    // 1. Prvo dodaj apartment_id kolonu u tenant_invitations
    console.log('\n1. Dodajem apartment_id kolonu u tenant_invitations...');
    
    try {
      // Pokušaj da dodaš kolonu
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: `ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE;`
      });
      
      if (error && !error.message.includes('already exists')) {
        console.log('❌ Greška pri dodavanju apartment_id:', error.message);
      } else {
        console.log('✅ apartment_id kolona dodana ili već postoji');
      }
    } catch (err) {
      console.log('❌ Neočekivana greška:', err.message);
    }

    // 2. Kreiraj apartment_tenants tabelu
    console.log('\n2. Kreiram apartment_tenants tabelu...');
    
    const createTableSQL = `
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
          UNIQUE(apartment_id)
      );
    `;

    try {
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: createTableSQL
      });
      
      if (error) {
        console.log('❌ Greška pri kreiranju apartment_tenants:', error.message);
      } else {
        console.log('✅ apartment_tenants tabela kreirana');
      }
    } catch (err) {
      console.log('❌ Neočekivana greška:', err.message);
    }

    // 3. Kreiraj indekse
    console.log('\n3. Kreiram indekse...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_apartment_tenants_apartment_id ON apartment_tenants(apartment_id);',
      'CREATE INDEX IF NOT EXISTS idx_apartment_tenants_tenant_id ON apartment_tenants(tenant_id);',
      'CREATE INDEX IF NOT EXISTS idx_apartment_tenants_status ON apartment_tenants(status);'
    ];

    for (const indexSQL of indexes) {
      try {
        const { data, error } = await adminClient.rpc('exec_sql', {
          sql: indexSQL
        });
        
        if (error) {
          console.log('❌ Greška pri kreiranju indeksa:', error.message);
        } else {
          console.log('✅ Indeks kreiran');
        }
      } catch (err) {
        console.log('❌ Neočekivana greška pri indeksu:', err.message);
      }
    }

    // 4. Omogući RLS
    console.log('\n4. Omogućavam RLS...');
    
    try {
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: 'ALTER TABLE apartment_tenants ENABLE ROW LEVEL SECURITY;'
      });
      
      if (error) {
        console.log('❌ Greška pri omogućavanju RLS:', error.message);
      } else {
        console.log('✅ RLS omogućen');
      }
    } catch (err) {
      console.log('❌ Neočekivana greška pri RLS:', err.message);
    }

    // 5. Proveri da li su tabele kreirane
    console.log('\n🔍 Proveravam da li su tabele kreirane...');
    
    // Proveri apartment_tenants
    try {
      const { data: apartmentTenantsData, error: apartmentTenantsError } = await adminClient
        .from('apartment_tenants')
        .select('id')
        .limit(1);

      if (!apartmentTenantsError) {
        console.log('✅ apartment_tenants tabela postoji i funkcioniše');
      } else {
        console.log('❌ apartment_tenants tabela ne postoji:', apartmentTenantsError.message);
      }
    } catch (err) {
      console.log('❌ Greška pri proveri apartment_tenants:', err.message);
    }

    // Proveri tenant_invitations
    try {
      const { data: invitationsData, error: invitationsError } = await adminClient
        .from('tenant_invitations')
        .select('*')
        .limit(1);

      if (!invitationsError) {
        console.log('✅ tenant_invitations tabela postoji');
        if (invitationsData && invitationsData.length > 0) {
          console.log('Kolone:', Object.keys(invitationsData[0]));
        } else {
          console.log('Tabela je prazna, proveravam strukturu...');
          
          // Pokušaj insert test reda da vidimo strukturu
          const { data: testData, error: testError } = await adminClient
            .from('tenant_invitations')
            .insert({
              email: 'test@test.com',
              invite_token: 'test-token-' + Date.now(),
              invited_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();
            
          if (!testError && testData) {
            console.log('Kolone:', Object.keys(testData));
            
            // Obriši test red
            await adminClient
              .from('tenant_invitations')
              .delete()
              .eq('email', 'test@test.com');
          } else {
            console.log('❌ Greška pri test insertu:', testError?.message);
          }
        }
      } else {
        console.log('❌ tenant_invitations tabela ima problem:', invitationsError.message);
      }
    } catch (err) {
      console.log('❌ Greška pri proveri tenant_invitations:', err.message);
    }

    console.log('\n✅ Migracija završena!');

  } catch (error) {
    console.error('❌ Greška tokom migracije:', error);
  }
}

applyMigrationDirect();