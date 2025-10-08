require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkAllTables() {
  console.log('🔍 PROVERAVAM SVE TABELE U BAZI');
  console.log('==============================');

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

    // Lista tabela koje treba da proverim
    const tablesToCheck = [
      'buildings',
      'building_tenants', 
      'tenants',
      'users',
      'issues',
      'building_models'
    ];

    for (const tableName of tablesToCheck) {
      console.log(`\n📋 Proveravam tabelu: ${tableName}`);
      
      const { data, error } = await adminClient
        .from(tableName)
        .select('*')
        .limit(5);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: ${data?.length || 0} zapisa (prikazujem prvih 5)`);
        if (data && data.length > 0) {
          console.log(`   Kolone: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    }

    // Posebno proverim demo korisnike
    console.log('\n👥 DEMO KORISNICI:');
    const { data: users } = await adminClient.auth.admin.listUsers();
    const demoUsers = users?.users?.filter(u => u.email?.includes('demo')) || [];
    
    demoUsers.forEach(user => {
      console.log(`   ${user.email} (ID: ${user.id})`);
      console.log(`   Role: ${user.user_metadata?.role || 'N/A'}`);
      console.log(`   Building ID: ${user.user_metadata?.building_id || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

checkAllTables();