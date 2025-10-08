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

async function createDemoTenantConnection() {
  console.log('🔗 Kreiram vezu između demo@stanar.com i zgrade...')
  
  try {
    // Demo korisnici IDs iz prethodne analize
    const demoTenantId = '31eb01f9-886a-486c-adf0-48e7263100a8' // demo@stanar.com
    const demoBuildingId = '6a913846-9f0e-456b-b7e9-4d7384aeb7d0' // zgrada 1
    
    // Proverava da li veza već postoji
    console.log('🔍 Proveravam da li veza već postoji...')
    const { data: existingConnection, error: checkError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .eq('tenant_id', demoTenantId)
      .eq('building_id', demoBuildingId)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Greška pri proveri postojeće veze:', checkError.message)
      return
    }
    
    if (existingConnection) {
      console.log('✅ Veza već postoji:', existingConnection)
      return
    }
    
    // Kreiranje nove veze
    console.log('➕ Kreiram novu vezu u building_tenants...')
    const { data: newConnection, error: insertError } = await supabaseAdmin
      .from('building_tenants')
      .insert({
        tenant_id: demoTenantId,
        building_id: demoBuildingId,
        apartment_number: '1A',
        floor_number: 1,
        entrance: 'A',
        status: 'active',
        notes: 'Demo stanar automatski dodeljen demo zgradi'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Greška pri kreiranju veze:', insertError.message)
      return
    }
    
    console.log('✅ Uspešno kreirana veza:', newConnection)
    
    // Verifikacija - proverava da li se sada veza vidi
    console.log('\n🔍 Verifikujem novu vezu...')
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('building_tenants')
      .select(`
        *,
        buildings!inner(
          id,
          name,
          address
        )
      `)
      .eq('tenant_id', demoTenantId)
      .eq('status', 'active')
    
    if (verifyError) {
      console.error('❌ Greška pri verifikaciji:', verifyError.message)
      return
    }
    
    if (verification && verification.length > 0) {
      console.log('✅ Verifikacija uspešna:')
      verification.forEach(tenant => {
        console.log(`   Stanar ID: ${tenant.tenant_id}`)
        console.log(`   Zgrada: ${tenant.buildings.name}`)
        console.log(`   Adresa zgrade: "${tenant.buildings.address}"`)
        console.log(`   Stan: ${tenant.apartment_number}`)
        console.log(`   Sprat: ${tenant.floor_number}`)
        console.log(`   Status: ${tenant.status}`)
      })
    } else {
      console.log('❌ Verifikacija neuspešna - veza se ne vidi')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

createDemoTenantConnection()