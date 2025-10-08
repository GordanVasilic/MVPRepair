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

async function fixDemoIssuesSetup() {
  console.log('🔧 Popravlja demo setup za kvarove...')
  console.log('=====================================')
  
  try {
    // 1. Dohvati demo korisnike
    console.log('\n📋 1. Dohvatam demo korisnike...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const companyUser = users.users.find(u => u.email === 'demo@firma.com')
    const tenantUser = users.users.find(u => u.email === 'demo@stanar.com')
    
    if (!companyUser || !tenantUser) {
      console.log('❌ Demo korisnici ne postoje!')
      return
    }
    
    console.log('✅ Demo korisnici pronađeni')
    
    // 2. Dohvati zgrade firme
    console.log('\n🏢 2. Dohvatam zgrade firme...')
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('user_id', companyUser.id)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.log('❌ Nema zgrada za firmu, kreiram test zgradu...')
      
      const { data: newBuilding, error: createBuildingError } = await supabaseAdmin
        .from('buildings')
        .insert({
          name: 'Demo Zgrada',
          address: 'Demo Adresa 123, Novi Sad',
          description: 'Demo zgrada za testiranje',
          user_id: companyUser.id
        })
        .select()
        .single()
      
      if (createBuildingError) {
        console.error('❌ Greška pri kreiranju zgrade:', createBuildingError.message)
        return
      }
      
      console.log('✅ Kreirana demo zgrada:', newBuilding.name)
      buildings = [newBuilding]
    }
    
    const testBuilding = buildings[0]
    console.log(`✅ Koristim zgradu: ${testBuilding.name} (ID: ${testBuilding.id})`)
    
    // 3. Proveri apartmane
    console.log('\n🏠 3. Proveravam apartmane...')
    const { data: apartments, error: apartmentsError } = await supabaseAdmin
      .from('apartments')
      .select('*')
      .eq('building_id', testBuilding.id)
    
    let testApartment
    
    if (apartmentsError || !apartments || apartments.length === 0) {
      console.log('❌ Nema apartmana, kreiram test apartman...')
      
      const { data: newApartment, error: createApartmentError } = await supabaseAdmin
        .from('apartments')
        .insert({
          building_id: testBuilding.id,
          apartment_number: '1A',
          floor: 1,
          rooms_config: {
            rooms: ['living_room', 'bedroom', 'kitchen', 'bathroom']
          }
        })
        .select()
        .single()
      
      if (createApartmentError) {
        console.error('❌ Greška pri kreiranju apartmana:', createApartmentError.message)
        return
      }
      
      console.log('✅ Kreiran test apartman:', newApartment.apartment_number)
      testApartment = newApartment
    } else {
      testApartment = apartments[0]
      console.log(`✅ Koristim postojeći apartman: ${testApartment.apartment_number}`)
    }
    
    // 4. Kreiraj building_tenants vezu
    console.log('\n🔗 4. Kreiram vezu stanar-zgrada...')
    const { data: existingTenant, error: checkTenantError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .eq('building_id', testBuilding.id)
      .eq('tenant_id', tenantUser.id)
      .single()
    
    if (checkTenantError && checkTenantError.code !== 'PGRST116') {
      console.error('❌ Greška pri proveri building_tenants:', checkTenantError.message)
    }
    
    if (!existingTenant) {
      const { data: newTenant, error: createTenantError } = await supabaseAdmin
        .from('building_tenants')
        .insert({
          building_id: testBuilding.id,
          tenant_id: tenantUser.id,
          apartment_number: testApartment.apartment_number,
          floor_number: testApartment.floor,
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createTenantError) {
        console.error('❌ Greška pri kreiranju building_tenants:', createTenantError.message)
      } else {
        console.log('✅ Kreirana veza stanar-zgrada')
      }
    } else {
      console.log('✅ Veza stanar-zgrada već postoji')
    }
    
    // 5. Kreiraj test kvar
    console.log('\n🔧 5. Kreiram test kvar...')
    
    // Prvo proveri da li već postoji kvar za ovu zgradu preko apartment_id
    const { data: existingIssues, error: checkIssuesError } = await supabaseAdmin
      .from('issues')
      .select(`
        *,
        apartments!inner(building_id)
      `)
      .eq('apartments.building_id', testBuilding.id)
      .neq('status', 'resolved')
      .neq('status', 'closed')
    
    if (existingIssues && existingIssues.length > 0) {
      console.log(`✅ Već postoji ${existingIssues.length} aktivnih kvarova za ovu zgradu`)
      existingIssues.forEach(issue => {
        console.log(`   - ${issue.title} (Status: ${issue.status})`)
      })
    } else {
      // Kreiraj kvar bez building_id kolone prvo
      const testIssue = {
        user_id: tenantUser.id,
        title: 'Curenje vode u kupatilu',
        description: 'Voda curi iz slavine u kupatilu. Potrebna je hitna intervencija.',
        category: 'plumbing',
        priority: 'high',
        status: 'open',
        apartment_id: testApartment.id,
        location_details: {
          room: 'Kupatilo',
          description: 'Slavina za umivaonik'
        }
      }
      
      const { data: createdIssue, error: createIssueError } = await supabaseAdmin
        .from('issues')
        .insert(testIssue)
        .select()
        .single()
      
      if (createIssueError) {
        console.error('❌ Greška pri kreiranju kvara:', createIssueError.message)
        return
      }
      
      console.log('✅ Test kvar uspešno kreiran!')
      console.log(`   - ID: ${createdIssue.id}`)
      console.log(`   - Naslov: ${createdIssue.title}`)
      console.log(`   - Status: ${createdIssue.status}`)
      console.log(`   - Apartment ID: ${createdIssue.apartment_id}`)
      
      // Sada pokušaj da dodaš building_id kroz UPDATE
      console.log('\n🔄 Dodajem building_id...')
      const { data: updatedIssue, error: updateError } = await supabaseAdmin
        .from('issues')
        .update({ building_id: testBuilding.id })
        .eq('id', createdIssue.id)
        .select()
        .single()
      
      if (updateError) {
        console.log('⚠️ Nije moguće dodati building_id:', updateError.message)
        console.log('   Kvar je kreiran, ali bez direktne building_id veze')
      } else {
        console.log('✅ Building ID uspešno dodat!')
        console.log(`   - Building ID: ${updatedIssue.building_id}`)
      }
    }
    
    // 6. Verifikuj da li firma vidi kvarove
    console.log('\n✅ 6. Finalna verifikacija...')
    
    // Prvo pokušaj direktno preko building_id
    const { data: directIssues, error: directError } = await supabaseAdmin
      .from('issues')
      .select(`
        id,
        title,
        status,
        priority,
        building_id,
        apartment_id,
        user_id
      `)
      .eq('building_id', testBuilding.id)
      .neq('status', 'resolved')
      .neq('status', 'closed')
    
    console.log(`🎯 Direktni kvarovi (building_id): ${directIssues?.length || 0}`)
    if (directIssues && directIssues.length > 0) {
      directIssues.forEach(issue => {
        console.log(`   ✅ ${issue.title} (Status: ${issue.status}, Priority: ${issue.priority})`)
      })
    }
    
    // Zatim pokušaj preko apartment_id -> building_id veze
    const { data: indirectIssues, error: indirectError } = await supabaseAdmin
      .from('issues')
      .select(`
        id,
        title,
        status,
        priority,
        apartment_id,
        user_id,
        apartments!inner(building_id)
      `)
      .eq('apartments.building_id', testBuilding.id)
      .neq('status', 'resolved')
      .neq('status', 'closed')
    
    console.log(`🎯 Indirektni kvarovi (apartment->building): ${indirectIssues?.length || 0}`)
    if (indirectIssues && indirectIssues.length > 0) {
      indirectIssues.forEach(issue => {
        console.log(`   ✅ ${issue.title} (Status: ${issue.status}, Priority: ${issue.priority})`)
      })
    }
    
    const totalIssues = (directIssues?.length || 0) + (indirectIssues?.length || 0)
    console.log(`🎯 UKUPNO aktivnih kvarova za demo firmu: ${totalIssues}`)
    
    console.log('\n🎉 SETUP ZAVRŠEN!')
    console.log('✅ Demo zgrada kreirana')
    console.log('✅ Demo apartman kreiran')
    console.log('✅ Veza stanar-zgrada kreirana')
    console.log('✅ Test kvar kreiran')
    console.log('✅ demo@firma.com sada treba da vidi aktivne kvarove!')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

fixDemoIssuesSetup()