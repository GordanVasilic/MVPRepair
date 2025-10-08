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

async function checkAndCreateDemoIssues() {
  console.log('🔍 Proverava demo korisnike i kvarove...')
  console.log('==========================================')
  
  try {
    // 1. Proveri da li demo korisnici postoje
    console.log('\n📋 1. Proverava demo korisnike...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const companyUser = users.users.find(u => u.email === 'demo@firma.com')
    const tenantUser = users.users.find(u => u.email === 'demo@stanar.com')
    
    if (!companyUser) {
      console.log('❌ demo@firma.com ne postoji!')
      return
    }
    console.log('✅ demo@firma.com postoji - ID:', companyUser.id)
    
    if (!tenantUser) {
      console.log('❌ demo@stanar.com ne postoji!')
      return
    }
    console.log('✅ demo@stanar.com postoji - ID:', tenantUser.id)
    
    // 2. Proveri zgrade firme
    console.log('\n🏢 2. Proverava zgrade firme...')
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('user_id', companyUser.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ demo@firma.com nema zgrade!')
      return
    }
    
    console.log(`✅ Pronađeno ${buildings.length} zgrada:`)
    buildings.forEach(building => {
      console.log(`   - ${building.name} (ID: ${building.id})`)
    })
    
    // 3. Proveri apartmane u zgradama
    console.log('\n🏠 3. Proverava apartmane...')
    const buildingIds = buildings.map(b => b.id)
    const { data: apartments, error: apartmentsError } = await supabaseAdmin
      .from('apartments')
      .select('*')
      .in('building_id', buildingIds)
    
    if (apartmentsError) {
      console.error('❌ Greška pri dohvatanju apartmana:', apartmentsError.message)
      return
    }
    
    console.log(`✅ Pronađeno ${apartments?.length || 0} apartmana`)
    if (apartments && apartments.length > 0) {
      apartments.slice(0, 3).forEach(apt => {
        console.log(`   - Apartman ${apt.apartment_number}, sprat ${apt.floor}, zgrada: ${apt.building_id}`)
      })
    }
    
    // 4. Proveri postojeće kvarove
    console.log('\n🔧 4. Proverava postojeće kvarove...')
    const { data: allIssues, error: issuesError } = await supabaseAdmin
      .from('issues')
      .select('*')
    
    if (issuesError) {
      console.error('❌ Greška pri dohvatanju kvarova:', issuesError.message)
      return
    }
    
    console.log(`📊 Ukupno kvarova u bazi: ${allIssues?.length || 0}`)
    
    if (allIssues && allIssues.length > 0) {
      console.log('📋 Postojeći kvarovi:')
      allIssues.forEach(issue => {
        console.log(`   - ${issue.title} (Status: ${issue.status}, Building ID: ${issue.building_id || 'N/A'}, User: ${issue.user_id})`)
      })
    }
    
    // 5. Proveri kvarove za zgrade firme
    const companyIssues = allIssues?.filter(issue => 
      buildingIds.includes(issue.building_id)
    ) || []
    
    console.log(`🎯 Kvarovi za zgrade firme: ${companyIssues.length}`)
    
    if (companyIssues.length > 0) {
      console.log('✅ Firma već ima kvarove:')
      companyIssues.forEach(issue => {
        console.log(`   - ${issue.title} (Status: ${issue.status})`)
      })
      return
    }
    
    // 6. Kreiraj test kvar ako nema
    console.log('\n🆕 5. Kreiranje test kvara...')
    
    if (!apartments || apartments.length === 0) {
      console.log('❌ Nema apartmana za kreiranje kvara!')
      return
    }
    
    const testApartment = apartments[0]
    const testBuilding = buildings.find(b => b.id === testApartment.building_id)
    
    console.log(`🏠 Koristim apartman: ${testApartment.apartment_number} u zgradi: ${testBuilding?.name}`)
    
    const testIssue = {
      user_id: tenantUser.id,
      title: 'Test kvar - Curenje vode u kupatilu',
      description: 'Testni kvar kreiran za demo. Voda curi iz slavine u kupatilu.',
      category: 'plumbing',
      priority: 'medium',
      status: 'open',
      building_id: testBuilding.id,
      apartment_id: testApartment.id,
      location_details: {
        room: 'Kupatilo',
        description: 'Slavina za umivaonik'
      }
    }
    
    const { data: createdIssue, error: createError } = await supabaseAdmin
      .from('issues')
      .insert(testIssue)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Greška pri kreiranju kvara:', createError.message)
      return
    }
    
    console.log('✅ Test kvar uspešno kreiran!')
    console.log(`   - ID: ${createdIssue.id}`)
    console.log(`   - Naslov: ${createdIssue.title}`)
    console.log(`   - Status: ${createdIssue.status}`)
    console.log(`   - Building ID: ${createdIssue.building_id}`)
    console.log(`   - Apartment ID: ${createdIssue.apartment_id}`)
    console.log(`   - Korisnik: ${createdIssue.user_id}`)
    
    // 7. Verifikuj da li se kvar vidi u upitu firme
    console.log('\n✅ 6. Verifikacija - proverava da li firma vidi kvar...')
    const { data: companyVisibleIssues, error: verifyError } = await supabaseAdmin
      .from('issues')
      .select('*')
      .in('building_id', buildingIds)
      .neq('status', 'resolved')
      .neq('status', 'closed')
    
    if (verifyError) {
      console.error('❌ Greška pri verifikaciji:', verifyError.message)
      return
    }
    
    console.log(`🎯 Aktivni kvarovi za firmu: ${companyVisibleIssues?.length || 0}`)
    if (companyVisibleIssues && companyVisibleIssues.length > 0) {
      companyVisibleIssues.forEach(issue => {
        console.log(`   ✅ ${issue.title} (Status: ${issue.status})`)
      })
    }
    
    console.log('\n🎉 GOTOVO!')
    console.log('✅ Demo kvar je kreiran')
    console.log('✅ demo@firma.com sada treba da vidi 1 aktivan kvar')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

checkAndCreateDemoIssues()