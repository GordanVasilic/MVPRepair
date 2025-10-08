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

async function checkBuildingsData() {
  console.log('🔍 Proveravam podatke u buildings tabeli...')
  
  try {
    // 1. Dohvati sve zgrade
    console.log('\n📋 Dohvatam sve zgrade...')
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ Nema zgrada u bazi')
      return
    }
    
    console.log(`✅ Pronađeno ${buildings.length} zgrada:`)
    buildings.forEach((building, index) => {
      console.log(`\n   ${index + 1}. ${building.name}`)
      console.log(`      ID: ${building.id}`)
      console.log(`      Adresa: "${building.address}"`)
      console.log(`      Grad: "${building.city || 'NEMA'}"`)
      console.log(`      Vlasnik: ${building.user_id}`)
      console.log(`      Kreirana: ${building.created_at}`)
    })
    
    // 2. Proverava building_tenants veze
    console.log('\n🏠 Proveravam building_tenants veze...')
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('building_tenants')
      .select(`
        *,
        buildings!inner(
          id,
          name,
          address
        )
      `)
      .eq('status', 'active')
    
    if (tenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', tenantsError.message)
      return
    }
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ Nema aktivnih stanara u building_tenants tabeli')
      return
    }
    
    console.log(`✅ Pronađeno ${tenants.length} aktivnih stanara:`)
    tenants.forEach((tenant, index) => {
      console.log(`\n   ${index + 1}. Stanar ID: ${tenant.tenant_id}`)
      console.log(`      Zgrada: ${tenant.buildings.name}`)
      console.log(`      Adresa zgrade: "${tenant.buildings.address}"`)
      console.log(`      Stan: ${tenant.apartment_number}`)
      console.log(`      Sprat: ${tenant.floor_number}`)
      console.log(`      Status: ${tenant.status}`)
    })
    
    // 3. Proverava demo korisnika
    console.log('\n👤 Proveravam demo korisnike...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const demoUsers = users.users.filter(u => 
      u.email === 'demo@firma.com' || u.email === 'demo@stanar.com'
    )
    
    console.log(`✅ Pronađeno ${demoUsers.length} demo korisnika:`)
    demoUsers.forEach(user => {
      console.log(`\n   Email: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Potvrđen: ${user.email_confirmed_at ? 'DA' : 'NE'}`)
      console.log(`   Metadata:`, JSON.stringify(user.user_metadata, null, 2))
    })
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

checkBuildingsData()