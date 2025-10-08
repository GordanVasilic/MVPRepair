const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🏢 DODELJIVANJE STANARA DEMO@FIRMA.COM NA VIŠI SPRAT')
console.log('==================================================')

async function assignTenantToAdmin() {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Admin klijent kreiran')
    
    const tenantId = '31eb01f9-886a-486c-adf0-48e7263100a8'
    
    // 1. Pronađi demo@firma.com korisnika (company korisnik)
    console.log('\n📋 Pronalaženje demo@firma.com korisnika...')
    const { data: allUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const adminUser = allUsers.users.find(user => user.email === 'demo@firma.com')
    if (!adminUser) {
      console.error('❌ demo@firma.com korisnik nije pronađen!')
      return
    }
    
    console.log('✅ demo@firma.com pronađen:', adminUser.id)
    
    // Takođe pronađi info o stanaru koji se dodeljuje
    const tenantUser = allUsers.users.find(user => user.id === tenantId)
    if (!tenantUser) {
      console.error('❌ Stanar sa ID', tenantId, 'nije pronađen!')
      return
    }
    
    console.log('✅ Stanar pronađen:', tenantUser.email)
    
    // 2. Pronađi zgrade koje poseduje demo@firma.com
    console.log('\n🏢 Pronalaženje zgrada demo@firma.com...')
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('id, name, address, floors_config')
      .eq('user_id', adminUser.id)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ demo@firma.com nema zgrade!')
      return
    }
    
    console.log(`🏢 Pronađeno ${buildings.length} zgrada:`)
    buildings.forEach((building, index) => {
      console.log(`   ${index + 1}. ${building.name} (${building.address})`)
      console.log(`      ID: ${building.id}`)
    })
    
    // 3. Pronađi apartmane na višim spratovima (4+) u tim zgradama
    console.log('\n🏠 Pronalaženje apartmana na višim spratovima (sprat 4+)...')
    const buildingIds = buildings.map(b => b.id)
    const { data: apartments, error: apartmentsError } = await adminClient
      .from('apartments')
      .select('id, building_id, apartment_number, floor')
      .in('building_id', buildingIds)
      .gte('floor', 4) // Sprat 4 ili viši
      .order('floor', { ascending: false }) // Sortiraj po spratu, najviši prvi
    
    if (apartmentsError) {
      console.error('❌ Greška pri dohvatanju apartmana:', apartmentsError.message)
      return
    }
    
    if (!apartments || apartments.length === 0) {
      console.log('❌ Nema apartmana na višim spratovima (4+) u zgradama demo@firma.com!')
      return
    }
    
    console.log(`🏠 Pronađeno ${apartments.length} apartmana na višim spratovima:`)
    apartments.forEach((apt, index) => {
      const building = buildings.find(b => b.id === apt.building_id)
      console.log(`   ${index + 1}. Apartman ${apt.apartment_number}, Sprat ${apt.floor}`)
      console.log(`      Zgrada: ${building?.name || 'N/A'}`)
      console.log(`      ID: ${apt.id}`)
    })
    
    // 4. Proveri koji apartmani su već zauzeti
    console.log('\n🔍 Proverava koji apartmani su već zauzeti...')
    const apartmentIds = apartments.map(a => a.id)
    const { data: occupiedApartments, error: occupiedError } = await adminClient
      .from('apartment_tenants')
      .select('apartment_id')
      .in('apartment_id', apartmentIds)
    
    if (occupiedError) {
      console.error('❌ Greška pri proveri zauzetih apartmana:', occupiedError.message)
      return
    }
    
    const occupiedIds = occupiedApartments?.map(oa => oa.apartment_id) || []
    const availableApartments = apartments.filter(apt => !occupiedIds.includes(apt.id))
    
    console.log(`📊 Zauzeto apartmana: ${occupiedIds.length}`)
    console.log(`📊 Dostupno apartmana: ${availableApartments.length}`)
    
    if (availableApartments.length === 0) {
      console.log('❌ Nema dostupnih apartmana na višim spratovima!')
      return
    }
    
    // 5. Uzmi prvi dostupan apartman (najviši sprat)
    const selectedApartment = availableApartments[0]
    const selectedBuilding = buildings.find(b => b.id === selectedApartment.building_id)
    
    console.log(`\n🎯 Odabran apartman:`)
    console.log(`   Apartman: ${selectedApartment.apartment_number}`)
    console.log(`   Sprat: ${selectedApartment.floor}`)
    console.log(`   Zgrada: ${selectedBuilding?.name}`)
    console.log(`   ID: ${selectedApartment.id}`)
    
    // 6. Proveri da li stanar već ima dodeljen apartman
    console.log('\n🔍 Proverava postojeće dodeljivanje stanara...')
    const { data: existingAssignment, error: existingError } = await adminClient
      .from('apartment_tenants')
      .select('*')
      .eq('tenant_id', tenantId)
    
    if (existingError) {
      console.error('❌ Greška pri proveri postojećeg dodeljivanja:', existingError.message)
      return
    }
    
    if (existingAssignment && existingAssignment.length > 0) {
      console.log('⚠️ Stanar već ima dodeljen apartman. Briše se postojeće dodeljivanje...')
      const { error: deleteError } = await adminClient
        .from('apartment_tenants')
        .delete()
        .eq('tenant_id', tenantId)
      
      if (deleteError) {
        console.error('❌ Greška pri brisanju postojećeg dodeljivanja:', deleteError.message)
        return
      }
      
      console.log('✅ Postojeće dodeljivanje obrisano')
    }
    
    // 7. Kreiraj novo dodeljivanje
    console.log('\n💾 Kreiranje novog apartment_tenants unosa...')
    const newAssignment = {
      apartment_id: selectedApartment.id,
      tenant_id: tenantId,
      status: 'active',
      invited_by: adminUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedAssignment, error: insertError } = await adminClient
      .from('apartment_tenants')
      .insert([newAssignment])
      .select()
    
    if (insertError) {
      console.error('❌ Greška pri kreiranju apartment_tenants unosa:', insertError.message)
      return
    }
    
    console.log('✅ Novo dodeljivanje kreirano uspešno!')
    
    // 8. Verifikacija - prikaži finalno stanje
    console.log('\n🔍 VERIFIKACIJA - Finalno stanje:')
    const { data: finalAssignment, error: finalError } = await adminClient
      .from('apartment_tenants')
      .select(`
        *,
        apartments (
          apartment_number,
          floor,
          buildings (
            name,
            address
          )
        )
      `)
      .eq('tenant_id', tenantId)
    
    if (finalError) {
      console.error('❌ Greška pri verifikaciji:', finalError.message)
      return
    }
    
    if (finalAssignment && finalAssignment.length > 0) {
      const assignment = finalAssignment[0]
      console.log('✅ Dodeljivanje potvrđeno:')
      console.log(`   Stanar: ${tenantUser.email}`)
      console.log(`   Apartman: ${assignment.apartments.apartment_number}`)
      console.log(`   Sprat: ${assignment.apartments.floor}`)
      console.log(`   Zgrada: ${assignment.apartments.buildings.name}`)
      console.log(`   Adresa: ${assignment.apartments.buildings.address}`)
      console.log(`   Status: ${assignment.status}`)
      console.log(`   Dodelio: demo@firma.com`)
    }
    
    console.log('\n🎉 ZAVRŠENO! Stanar je uspešno dodeljen demo@firma.com apartmanu na višem spratu!')
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

assignTenantToAdmin()