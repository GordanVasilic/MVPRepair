const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateToRelational() {
  console.log('🔄 MIGRACIJA NA RELACIONI PRISTUP')
  console.log('=================================')
  
  try {
    // 1. Prvo kreiraj building_tenants tabelu direktno u bazi
    console.log('1. Kreiranje building_tenants tabele...')
    
    // Pošto ne mogu da kreiram tabelu programski, kreiram je "simulacijom"
    // Ovo znači da ću ažurirati API da koristi hibridni pristup
    
    // 2. Učitaj postojeće demo stanare
    console.log('2. Učitavanje postojećih demo stanara...')
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    
    const demoTenants = allUsers?.users?.filter(user => 
      user.email?.includes('@stanar.com') && 
      user.user_metadata?.role === 'tenant'
    ) || []
    
    console.log(`📊 Pronađeno ${demoTenants.length} demo stanara:`)
    demoTenants.forEach(tenant => {
      console.log(`   - ${tenant.email}`)
      console.log(`     Building: ${tenant.user_metadata?.building_id}`)
      console.log(`     Apartment: ${tenant.user_metadata?.apartment}`)
      console.log(`     Floor: ${tenant.user_metadata?.floor}`)
    })
    
    // 3. Učitaj zgrade
    console.log('\\n3. Učitavanje zgrada...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
    
    if (buildingsError) {
      console.error('❌ Greška pri učitavanju zgrada:', buildingsError.message)
      return
    }
    
    console.log(`📊 Pronađeno ${buildings.length} zgrada`)
    
    // 4. Pošto ne mogu da kreiram building_tenants tabelu, 
    //    kreiram "virtuelnu" relacionu strukturu u memoriji
    console.log('\\n4. Kreiranje virtuelne relacione strukture...')
    
    const virtualBuildingTenants = demoTenants.map(tenant => {
      const building = buildings.find(b => b.id === tenant.user_metadata?.building_id)
      
      return {
        id: tenant.id, // koristim tenant ID kao building_tenant ID
        building_id: tenant.user_metadata?.building_id,
        tenant_id: tenant.id,
        apartment_number: tenant.user_metadata?.apartment || 'N/A',
        floor_number: parseInt(tenant.user_metadata?.floor || '1'),
        status: 'active',
        invited_by: building?.user_id,
        invited_at: tenant.created_at,
        joined_at: tenant.created_at,
        created_at: tenant.created_at,
        updated_at: tenant.created_at,
        // Dodatne informacije za API
        tenant_email: tenant.email,
        tenant_name: tenant.user_metadata?.name || 'Unknown',
        building_name: building?.name || 'Unknown',
        building_address: building?.address || 'Unknown'
      }
    })
    
    console.log('\\n📋 Virtuelna relaciona struktura:')
    virtualBuildingTenants.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.tenant_email}`)
      console.log(`      Building: ${record.building_name}`)
      console.log(`      Apartment: ${record.apartment_number}`)
      console.log(`      Floor: ${record.floor_number}`)
      console.log(`      Status: ${record.status}`)
    })
    
    // 5. Sačuvaj strukturu u JSON fajl za referencu
    console.log('\\n5. Čuvanje strukture u JSON fajl...')
    const fs = require('fs')
    fs.writeFileSync('virtual-building-tenants.json', JSON.stringify(virtualBuildingTenants, null, 2))
    console.log('✅ Struktura sačuvana u virtual-building-tenants.json')
    
    console.log('\\n🎯 REZULTAT MIGRACIJE:')
    console.log('========================')
    console.log('✅ Kreirana virtuelna relaciona struktura')
    console.log('✅ Mapiran sadržaj user_metadata na relacione zapise')
    console.log(`✅ ${virtualBuildingTenants.length} stanara spremno za relacioni pristup`)
    console.log('⚠️  building_tenants tabela nije kreirana u bazi (nedostatak privilegija)')
    console.log('💡 API će koristiti hibridni pristup - relaciona logika sa metadata podacima')
    
  } catch (error) {
    console.error('❌ Greška pri migraciji:', error.message)
  }
}

migrateToRelational()