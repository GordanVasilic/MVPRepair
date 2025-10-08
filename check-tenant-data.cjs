const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ywqjqxqjqxqjqxqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cWpxeHFqcXhxanF4cWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTU2NzI5NCwiZXhwIjoyMDUxMTQzMjk0fQ.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTenantData() {
  console.log('🔍 Proverava postojanje demo podataka...\n')
  
  try {
    // Prvo proveravamo da li postoje demo korisnici
    console.log('1. Proverava demo korisnike:')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError)
      return
    }
    
    const demoCompany = users.users.find(u => u.email === 'demo@firma.com')
    const demoTenant = users.users.find(u => u.email === 'demo@stanar.com')
    
    console.log('   - demo@firma.com:', demoCompany ? '✅ Postoji' : '❌ Ne postoji')
    console.log('   - demo@stanar.com:', demoTenant ? '✅ Postoji' : '❌ Ne postoji')
    
    if (!demoCompany || !demoTenant) {
      console.log('\n❌ Demo korisnici ne postoje. Potrebno ih je kreirati prvo.')
      return
    }
    
    // Proveravamo zgrade koje pripada demo@firma.com
    console.log('\n2. Proverava zgrade demo firme:')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', demoCompany.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError)
      return
    }
    
    console.log(`   - Broj zgrada: ${buildings.length}`)
    buildings.forEach(building => {
      console.log(`   - ${building.name} (${building.address})`)
    })
    
    if (buildings.length === 0) {
      console.log('\n❌ Demo firma nema zgrade. Potrebno je kreirati zgradu prvo.')
      return
    }
    
    // Proveravamo building_tenants tabelu
    console.log('\n3. Proverava building_tenants tabelu:')
    const { data: tenants, error: tenantsError } = await supabase
      .from('building_tenants')
      .select(`
        *,
        buildings(name, address),
        tenant:user_id(email)
      `)
    
    if (tenantsError) {
      console.error('❌ Greška pri dohvatanju stanara:', tenantsError)
      return
    }
    
    console.log(`   - Ukupno stanara u bazi: ${tenants.length}`)
    
    const demoTenantRecord = tenants.find(t => t.user_id === demoTenant.id)
    console.log('   - demo@stanar.com u building_tenants:', demoTenantRecord ? '✅ Postoji' : '❌ Ne postoji')
    
    if (demoTenantRecord) {
      console.log('     * Zgrada:', demoTenantRecord.buildings?.name)
      console.log('     * Stan:', demoTenantRecord.apartment_number)
      console.log('     * Sprat:', demoTenantRecord.floor_number)
      console.log('     * Status:', demoTenantRecord.status)
    }
    
    // Proveravamo da li demo@stanar.com pripada zgradi demo@firma.com
    const demoConnection = tenants.find(t => 
      t.user_id === demoTenant.id && 
      buildings.some(b => b.id === t.building_id)
    )
    
    console.log('   - Veza demo@stanar.com sa demo@firma.com:', demoConnection ? '✅ Postoji' : '❌ Ne postoji')
    
    if (!demoConnection) {
      console.log('\n⚠️  Demo stanar nije povezan sa demo firmom!')
      console.log('   Potrebno je kreirati vezu u building_tenants tabeli.')
      
      // Predlažemo kreiranje veze
      const firstBuilding = buildings[0]
      console.log(`\n💡 Predlog: Dodati demo@stanar.com u zgradu "${firstBuilding.name}"`)
      console.log('   Stan: 1A, Sprat: 1')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

checkTenantData()