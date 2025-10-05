const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixqjqvqjqvqjqvqjqvqj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxdnFqcXZxanF2cWpxdnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzU0NzE4MSwiZXhwIjoyMDUzMTIzMTgxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

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
      // Get table structure
      const { data: columns, error } = await supabase
        .rpc('sql', {
          query: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
            AND column_name = 'user_id'
            ORDER BY ordinal_position;
          `
        });

      if (error) {
        console.error(`❌ Greška pri proveri tabele ${tableName}:`, error.message);
        continue;
      }

      if (columns && columns.length > 0) {
        console.log(`✅ ${tableName}: HAS user_id column`);
        columns.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      } else {
        console.log(`❌ ${tableName}: NO user_id column`);
      }

      // Check if table has RLS enabled
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('sql', {
          query: `
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = '${tableName}';
          `
        });

      if (!rlsError && rlsData && rlsData.length > 0) {
        const hasRLS = rlsData[0].rowsecurity;
        console.log(`   RLS: ${hasRLS ? '✅ Enabled' : '❌ Disabled'}`);
      }

      console.log('');
    } catch (err) {
      console.error(`❌ Greška pri proveri tabele ${tableName}:`, err.message);
    }
  }
}

checkTablesForUserId().catch(console.error);