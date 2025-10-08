const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Nedostaju environment varijable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkApartmentTenantsStructure() {
  console.log('🔍 Proverava strukturu apartment_tenants tabele...')
  
  try {
    // 1. Pokušaj da pročitaš sve kolone iz apartment_tenants
    const { data: apartmentTenants, error: atError } = await supabase
      .from('apartment_tenants')
      .select('*')
      .limit(1)

    if (atError) {
      console.error('❌ Greška pri čitanju apartment_tenants:', atError)
      
      // Pokušaj alternativno ime tabele
      const { data: altData, error: altError } = await supabase
        .from('apartment_tenant')
        .select('*')
        .limit(1)
        
      if (altError) {
        console.error('❌ Greška pri čitanju apartment_tenant:', altError)
      } else {
        console.log('✅ Pronađena apartment_tenant tabela:', Object.keys(altData[0] || {}))
      }
      
      return
    }

    console.log('✅ apartment_tenants tabela postoji')
    if (apartmentTenants && apartmentTenants.length > 0) {
      console.log('📋 Kolone u apartment_tenants:', Object.keys(apartmentTenants[0]))
    } else {
      console.log('📋 apartment_tenants tabela je prazna')
    }

    // 2. Pokušaj da pročitaš sve apartment_tenants zapise
    const { data: allApartmentTenants, error: allError } = await supabase
      .from('apartment_tenants')
      .select('*')

    if (allError) {
      console.error('❌ Greška pri čitanju svih apartment_tenants:', allError)
    } else {
      console.log('📊 Ukupno apartment_tenants zapisa:', allApartmentTenants?.length || 0)
      if (allApartmentTenants && allApartmentTenants.length > 0) {
        allApartmentTenants.slice(0, 3).forEach((at, index) => {
          console.log(`  ${index + 1}. ${JSON.stringify(at)}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

checkApartmentTenantsStructure()