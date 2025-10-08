const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem za admin operacije
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkTableStructure() {
  console.log('🔍 Proveravam strukturu building_tenants tabele...')
  
  try {
    // Pokušaj da dohvatiš podatke iz tabele da vidiš strukturu
    console.log('\n📋 Pokušavam da dohvatim podatke iz building_tenants tabele...')
    const { data, error } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Greška pri dohvatanju podataka:', error.message)
      console.error('   Detalji:', error)
      
      // Pokušaj da kreiram tabelu
      console.log('\n🔧 Pokušavam da kreiram building_tenants tabelu...')
      
      const createTableSQL = `
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
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_building_tenants_building_id ON building_tenants(building_id);
        CREATE INDEX IF NOT EXISTS idx_building_tenants_tenant_id ON building_tenants(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_building_tenants_status ON building_tenants(status);
        
        -- Enable RLS
        ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
        
        -- Grant permissions
        GRANT ALL PRIVILEGES ON building_tenants TO authenticated;
        GRANT ALL PRIVILEGES ON building_tenants TO service_role;
      `
      
      const { data: createResult, error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: createTableSQL
      })
      
      if (createError) {
        console.error('❌ Greška pri kreiranju tabele:', createError.message)
        return
      }
      
      console.log('✅ Tabela je kreirana!')
      
      // Pokušaj ponovo da dohvatiš podatke
      const { data: newData, error: newError } = await supabaseAdmin
        .from('building_tenants')
        .select('*')
        .limit(1)
      
      if (newError) {
        console.error('❌ I dalje greška:', newError.message)
        return
      }
      
      console.log('✅ Tabela je sada dostupna!')
      
    } else {
      console.log('✅ Tabela postoji i dostupna je!')
      console.log('   Broj redova:', data?.length || 0)
      
      if (data && data.length > 0) {
        console.log('   Primer reda:', data[0])
      }
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokreni funkciju
checkTableStructure()