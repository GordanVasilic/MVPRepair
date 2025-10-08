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
    // Prvo proverim da li tabela postoji
    console.log('1. Proveravam da li tabela postoji...')
    const { data, error } = await supabase
      .from('building_tenants')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Tabela ne postoji')
      
      // Pokušaj kreiranje preko REST API poziva
      console.log('2. Pokušavam kreiranje preko REST API...')
      
      const createSQL = `
        CREATE TABLE building_tenants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          apartment_number VARCHAR(10) NOT NULL,
          floor_number INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          invited_by UUID REFERENCES auth.users(id),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          joined_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(building_id, apartment_number),
          UNIQUE(building_id, tenant_id)
        );
        
        CREATE INDEX idx_building_tenants_building_id ON building_tenants(building_id);
        CREATE INDEX idx_building_tenants_tenant_id ON building_tenants(tenant_id);
        ALTER TABLE building_tenants ENABLE ROW LEVEL SECURITY;
      `
      
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: createSQL })
      })
      
      if (response.ok) {
        console.log('✅ Tabela kreirana preko REST API')
      } else {
        const errorText = await response.text()
        console.log('❌ REST API greška:', errorText)
        
        // Alternativni pristup - pokušaj sa supabase.rpc
        console.log('3. Pokušavam sa supabase.rpc...')
        const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
          sql: createSQL
        })
        
        if (rpcError) {
          console.log('❌ RPC greška:', rpcError.message)
          console.log('💡 Možda exec_sql funkcija ne postoji u bazi')
        } else {
          console.log('✅ Tabela kreirana preko RPC')
        }
      }
    } else if (error) {
      console.log('❌ Druga greška:', error.message)
    } else {
      console.log('✅ Tabela već postoji')
      console.log('📊 Broj zapisa:', data?.length || 0)
    }
    
    // Finalno testiranje
    console.log('4. Finalno testiranje tabele...')
    const { data: finalTest, error: finalError } = await supabase
      .from('building_tenants')
      .select('*')
      .limit(1)
    
    if (finalError) {
      console.log('❌ Finalni test neuspešan:', finalError.message)
      console.log('💡 Tabela verovatno nije kreirana')
    } else {
      console.log('✅ Tabela je funkcionalna!')
      console.log('📊 Trenutno zapisa u tabeli:', finalTest?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

createBuildingTenantsTable()