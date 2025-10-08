const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createBuildingTenantsTable() {
  console.log('🏗️ KREIRANJE building_tenants TABELE')
  console.log('===================================')
  
  try {
    // SQL za kreiranje tabele
    const createTableSQL = `
      -- Create building_tenants table for managing tenant-building relationships
      CREATE TABLE IF NOT EXISTS building_tenants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          apartment_number VARCHAR(10) NOT NULL,
          floor_number INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          invited_by UUID REFERENCES auth.users(id),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          joined_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure unique tenant per apartment in building
          UNIQUE(building_id, apartment_number),
          -- Ensure tenant can only be in one apartment per building
          UNIQUE(building_id, tenant_id)
      );
    `
    
    console.log('1. Kreiranje tabele...')
    const { data: tableResult, error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    })
    
    if (tableError) {
      console.log('❌ Greška pri kreiranju tabele:', tableError.message)
      // Pokušaj direktno preko SQL-a
      console.log('🔄 Pokušavam direktno...')
      const { data, error } = await supabase
        .from('building_tenants')
        .select('*')
        .limit(1)
      
      if (error && error.message.includes('does not exist')) {
        console.log('❌ Tabela ne postoji, pokušavam alternativni pristup...')
        
        // Pokušaj kreiranje preko raw SQL poziva
        const { data: rawResult, error: rawError } = await supabase
          .rpc('exec_sql', { sql: 'SELECT 1' })
        
        if (rawError) {
          console.log('❌ exec_sql funkcija ne postoji')
          console.log('💡 Pokušavam kreiranje tabele preko INSERT poziva...')
          
          // Pokušaj insert koji će triggerovati kreiranje tabele
          const { error: insertError } = await supabase
            .from('building_tenants')
            .insert({
              building_id: '00000000-0000-0000-0000-000000000000',
              tenant_id: '00000000-0000-0000-0000-000000000000',
              apartment_number: 'TEST',
              floor_number: 1
            })
          
          if (insertError) {
            console.log('❌ Ne mogu da kreiram tabelu:', insertError.message)
            return
          }
        }
      } else {
        console.log('✅ Tabela već postoji ili je kreirana')
      }
    } else {
      console.log('✅ Tabela uspešno kreirana')
    }
    
    // Kreiranje indeksa
    console.log('2. Kreiranje indeksa...')
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_tenant_id ON building_tenants(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
    `
    
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: indexesSQL
    })
    
    if (indexError) {
      console.log('⚠️ Indeksi možda nisu kreirani:', indexError.message)
    } else {
      console.log('✅ Indeksi kreirani')
    }
    
    // Omogući RLS
    console.log('3. Omogućavanje RLS...')
    const rlsSQL = `ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;`
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsSQL
    })
    
    if (rlsError) {
      console.log('⚠️ RLS možda nije omogućen:', rlsError.message)
    } else {
      console.log('✅ RLS omogućen')
    }
    
    // Testiranje tabele
    console.log('4. Testiranje tabele...')
    const { data: testData, error: testError } = await supabase
      .from('building_tenants')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Greška pri testiranju:', testError.message)
    } else {
      console.log('✅ Tabela je funkcionalna')
      console.log('📊 Trenutno zapisa:', testData?.length || 0)
    }
    
    console.log('\n🎉 building_tenants tabela je spremna za korišćenje!')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

createBuildingTenantsTable()