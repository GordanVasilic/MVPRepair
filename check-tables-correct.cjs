const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTablesForUserId() {
  console.log('🔍 Proverava tabele za user_id kolone...\n');

  const tablesToCheck = [
    'buildings',
    'building_models', 
    'floor_plans',
    'rooms',
    'issues',
    'issue_comments',
    'notifications',
    'user_buildings',
    'apartments'
  ];

  for (const tableName of tablesToCheck) {
    try {
      // Simple check - try to select from table to see if it exists and has user_id
      const { data, error } = await supabase
        .from(tableName)
        .select('user_id')
        .limit(1);

      if (error) {
        if (error.message.includes('column "user_id" does not exist')) {
          console.log(`❌ ${tableName}: NO user_id column`);
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ ${tableName}: Table does not exist`);
        } else {
          console.log(`❌ ${tableName}: Error - ${error.message}`);
        }
      } else {
        console.log(`✅ ${tableName}: HAS user_id column`);
      }
    } catch (err) {
      console.error(`❌ Greška pri proveri tabele ${tableName}:`, err.message);
    }
  }

  console.log('\n🔍 Proverava RLS politike za buildings tabelu...');
  
  try {
    // Check if we can access buildings table
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .limit(5);

    if (buildingsError) {
      console.log('❌ Greška pri pristupu buildings tabeli:', buildingsError.message);
    } else {
      console.log(`✅ Uspešno pristupljeno buildings tabeli, pronađeno ${buildingsData?.length || 0} objekata`);
      if (buildingsData && buildingsData.length > 0) {
        buildingsData.forEach(building => {
          console.log(`   - ${building.name}: user_id = ${building.user_id || 'NULL'}`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Greška pri proveri buildings tabele:', err.message);
  }
}

checkTablesForUserId().catch(console.error);