const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🏠 DODELJIVANJE POSTOJEĆIH STANARA DEMO@FIRMA.COM')
console.log('===============================================')

async function assignExistingTenants() {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Admin klijent kreiran')
    
    // 1. Pronađi demo@firma.com korisnika
    console.log('\n📋 Pronalaženje demo@firma.com korisnika...')
    const { data: allUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const companyUser = allUsers.users.find(user => user.email === 'demo@firma.com')
    if (!companyUser) {
      console.error('❌ demo@firma.com korisnik nije pronađen!')
      return
    }
    
    console.log('✅ demo@firma.com pronađen:', companyUser.id)
    
    // 2. Pronađi sve tenant korisnike
    console.log('\n👥 Pronalaženje postojećih tenant korisnika...')
    const tenantUsers = allUsers.users.filter(user => 
      user.user_metadata?.role === 'tenant' && 
      user.email !== 'demo@stanar.com' // Zadržimo osnovnog demo stanara
    )
    
    console.log(`📊 Pronađeno ${tenantUsers.length} tenant korisnika:`)
    tenantUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`)
    })
    
    // 3. Pronađi zgrade koje poseduje demo@firma.com
    console.log('\n🏢 Pronalaženje zgrada demo@firma.com...')
    const { data: buildings, error: buildingsError } = await adminClient
      .from('buildings')
      .select('id, name, address, floors_config')
      .eq('user_id', companyUser.id)
    
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
      console.log(`      Spratovi: ${JSON.stringify(building.floors_config)}`)
    })
    
    // 4. Pronađi apartmane u tim zgradama
    console.log('\n🏠 Pronalaženje apartmana...')
    const buildingIds = buildings.map(b => b.id)
    const { data: apartments, error: apartmentsError } = await adminClient
      .from('apartments')
      .select('id, building_id, apartment_number, floor')
      .in('building_id', buildingIds)
    
    if (apartmentsError) {
      console.error('❌ Greška pri dohvatanju apartmana:', apartmentsError.message)
      return
    }
    
    if (!apartments || apartments.length === 0) {
      console.log('❌ Nema apartmana u zgradama!')
      return
    }
    
    console.log(`🏠 Pronađeno ${apartments.length} apartmana:`)
    apartments.forEach((apt, index) => {
      const building = buildings.find(b => b.id === apt.building_id)
      console.log(`   ${index + 1}. Apartman ${apt.apartment_number}, Sprat ${apt.floor}`)
      console.log(`      Zgrada: ${building?.name || 'N/A'}`)
      console.log(`      ID: ${apt.id}`)
    })
    
    // 5. Proveri trenutne apartment_tenants unose
    console.log('\n🔍 Proverava postojeće apartment_tenants unose...')
    const { data: existingTenants, error: existingError } = await adminClient
      .from('apartment_tenants')
      .select('*')
      .in('apartment_id', apartments.map(a => a.id))
    
    if (existingError) {
      console.error('❌ Greška pri dohvatanju postojećih tenant unosa:', existingError.message)
      return
    }
    
    console.log(`📊 Postojeći apartment_tenants unosi: ${existingTenants?.length || 0}`)
    if (existingTenants && existingTenants.length > 0) {
      existingTenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. Apartman ID: ${tenant.apartment_id}, Tenant ID: ${tenant.tenant_id}`)
      })
    }
    
    // 6. Obriši postojeće apartment_tenants unose za ove apartmane
    if (existingTenants && existingTenants.length > 0) {
      console.log('\n🗑️ Brisanje postojećih apartment_tenants unosa...')
      const { error: deleteError } = await adminClient
        .from('apartment_tenants')
        .delete()
        .in('apartment_id', apartments.map(a => a.id))
      
      if (deleteError) {
        console.error('❌ Greška pri brisanju postojećih unosa:', deleteError.message)
        return
      }
      
      console.log('✅ Postojeći unosi obrisani')
    }
    
    // 7. Random dodeljivanje stanara apartmanima
    console.log('\n🎲 Random dodeljivanje stanara apartmanima...')
    
    // Uzmi do 7 stanara ili koliko god ima
    const tenantsToAssign = tenantUsers.slice(0, Math.min(7, tenantUsers.length))
    console.log(`👥 Dodeljivanje ${tenantsToAssign.length} stanara...`)
    
    // Shuffle apartmane za random raspored
    const shuffledApartments = [...apartments].sort(() => Math.random() - 0.5)
    
    const newTenantAssignments = []
    
    for (let i = 0; i < tenantsToAssign.length && i < shuffledApartments.length; i++) {
      const tenant = tenantsToAssign[i]
      const apartment = shuffledApartments[i]
      const building = buildings.find(b => b.id === apartment.building_id)
      
      console.log(`🔗 Dodeljivanje: ${tenant.email} -> Apartman ${apartment.apartment_number}, Sprat ${apartment.floor} (${building?.name})`)
      
      newTenantAssignments.push({
        apartment_id: apartment.id,
        tenant_id: tenant.id,
        status: 'active',
        invited_by: companyUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
    
    // 8. Kreiraj nove apartment_tenants unose
    if (newTenantAssignments.length > 0) {
      console.log('\n💾 Kreiranje novih apartment_tenants unosa...')
      const { data: insertedTenants, error: insertError } = await adminClient
        .from('apartment_tenants')
        .insert(newTenantAssignments)
        .select()
      
      if (insertError) {
        console.error('❌ Greška pri kreiranju apartment_tenants unosa:', insertError.message)
        return
      }
      
      console.log(`✅ Kreirano ${insertedTenants.length} novih apartment_tenants unosa`)
    }
    
    // 9. Verifikacija - prikaži finalno stanje
    console.log('\n🔍 VERIFIKACIJA - Finalno stanje:')
    const { data: finalTenants, error: finalError } = await adminClient
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
      .in('apartment_id', apartments.map(a => a.id))
    
    if (finalError) {
      console.error('❌ Greška pri verifikaciji:', finalError.message)
      return
    }
    
    console.log(`📊 Ukupno dodeljenih stanara: ${finalTenants?.length || 0}`)
    if (finalTenants && finalTenants.length > 0) {
      finalTenants.forEach((tenant, index) => {
        const user = allUsers.users.find(u => u.id === tenant.tenant_id)
        console.log(`   ${index + 1}. ${user?.email || 'N/A'}`)
        console.log(`      Apartman: ${tenant.apartments.apartment_number}, Sprat: ${tenant.apartments.floor}`)
        console.log(`      Zgrada: ${tenant.apartments.buildings.name}`)
        console.log(`      Status: ${tenant.status}`)
      })
    }
    
    console.log('\n🎉 ZAVRŠENO! Postojeći stanari su uspešno dodeljeni demo@firma.com apartmanima!')
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

assignExistingTenants()