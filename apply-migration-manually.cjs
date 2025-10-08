require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyMigrationManually() {
  console.log('🔧 PRIMENJUJEM MIGRACIJU RUČNO');
  console.log('===============================');

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

    // Učitaj SQL migraciju
    const migrationSQL = fs.readFileSync('./supabase/migrations/016_create_apartment_tenants_table.sql', 'utf8');
    console.log('✅ Migracija učitana');

    // Podeli SQL na delove (po ; karakteru)
    const sqlStatements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Pronađeno ${sqlStatements.length} SQL izjava`);

    // Izvršavaj svaku izjavu pojedinačno
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`\n${i + 1}. Izvršavam: ${statement.substring(0, 100)}...`);
      
      try {
        const { data, error } = await adminClient.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          console.log(`❌ Greška u izjavi ${i + 1}:`, error.message);
          // Nastavi sa sledećom izjavom
        } else {
          console.log(`✅ Izjava ${i + 1} uspešno izvršena`);
        }
      } catch (err) {
        console.log(`❌ Neočekivana greška u izjavi ${i + 1}:`, err.message);
      }
    }

    // Proveri da li su tabele kreirane
    console.log('\n🔍 Proveravam da li su tabele kreirane...');
    
    // Proveri apartment_tenants
    try {
      const { data: apartmentTenantsData, error: apartmentTenantsError } = await adminClient
        .from('apartment_tenants')
        .select('count(*)')
        .limit(1);

      if (!apartmentTenantsError) {
        console.log('✅ apartment_tenants tabela postoji');
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
        console.log('Kolone:', Object.keys(invitationsData[0] || {}));
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

applyMigrationManually();