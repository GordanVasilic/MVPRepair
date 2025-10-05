const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixqjqvqjqvqjqvqjqvqj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iul4cWpxdnFqcXZxanF2cWpxdnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzU0NzE4MSwiZXhwIjoyMDUzMTIzMTgxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

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
    // Check RLS policies for buildings
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'buildings');

    if (policiesError) {
      console.log('❌ Ne mogu da proverim RLS politike:', policiesError.message);
    } else {
      console.log(`✅ Pronađeno ${policies?.length || 0} RLS politika za buildings tabelu`);
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Greška pri proveri RLS politika:', err.message);
  }
}

checkTablesForUserId().catch(console.error);