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

async function connectTenantToApartment() {
  console.log('🔗 Povezujem stanara demo@stanar.com sa apartmanom 4A u zgradi "Zgrada 1 Lamela2"...')
  
  try {
    // 1. Pronađi zgradu "Zgrada 1 Lamela2"
    console.log('\n🏢 Tražim zgradu "Zgrada 1 Lamela2"...')
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('name', 'Zgrada 1 Lamela2')
    
    if (buildingsError) {
      console.error('❌ Greška pri traženju zgrade:', buildingsError.message)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ Zgrada "Zgrada 1 Lamela2" ne postoji!')
      return
    }
    
    const building = buildings[0]
    console.log(`✅ Pronašao zgradu: ${building.name} (ID: ${building.id})`)
    console.log(`   Adresa: ${building.address}`)
    console.log(`   Vlasnik ID: ${building.user_id}`)
    
    // 2. Pronađi apartman "4A" u toj zgradi
    console.log('\n🏠 Tražim apartman "4A" u zgradi...')
    const { data: apartments, error: apartmentsError } = await supabaseAdmin
      .from('apartments')
      .select('*')
      .eq('building_id', building.id)
      .eq('apartment_number', '4A')
    
    if (apartmentsError) {
      console.error('❌ Greška pri traženju apartmana:', apartmentsError.message)
      return
    }
    
    if (!apartments || apartments.length === 0) {
      console.log('❌ Apartman "4A" ne postoji u zgradi "Zgrada 1 Lamela2"!')
      console.log('   Dostupni apartmani u zgradi:')
      
      // Prikaži dostupne apartmane
      const { data: allApartments, error: allApartmentsError } = await supabaseAdmin
        .from('apartments')
        .select('apartment_number, floor')
        .eq('building_id', building.id)
        .order('apartment_number')
      
      if (!allApartmentsError && allApartments) {
        allApartments.forEach(apt => {
          console.log(`     - ${apt.apartment_number} (sprat ${apt.floor})`)
        })
      }
      return
    }
    
    const apartment = apartments[0]
    console.log(`✅ Pronašao apartman: ${apartment.apartment_number}`)
    console.log(`   Sprat: ${apartment.floor}`)
    console.log(`   ID: ${apartment.id}`)
    
    // 3. Pronađi korisnika demo@stanar.com
    console.log('\n👤 Tražim korisnika demo@stanar.com...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const tenantUser = users.users.find(u => u.email === 'demo@stanar.com')
    if (!tenantUser) {
      console.log('❌ Korisnik demo@stanar.com ne postoji!')
      return
    }
    
    console.log(`✅ Pronašao korisnika: ${tenantUser.email}`)
    console.log(`   ID: ${tenantUser.id}`)
    console.log(`   Ime: ${tenantUser.user_metadata?.name || 'N/A'}`)
    
    // 4. Proveri da li veza već postoji
    console.log('\n🔍 Proveravam da li veza već postoji...')
    const { data: existingConnection, error: connectionError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .eq('building_id', building.id)
      .eq('tenant_id', tenantUser.id)
    
    if (connectionError) {
      console.error('❌ Greška pri proveri postojeće veze:', connectionError.message)
      return
    }
    
    if (existingConnection && existingConnection.length > 0) {
      console.log('⚠️  Veza već postoji!')
      const existing = existingConnection[0]
      console.log(`   Trenutni apartman: ${existing.apartment_number}`)
      console.log(`   Status: ${existing.status}`)
      
      // Ažuriraj postojeću vezu
      console.log('\n🔄 Ažuriram postojeću vezu...')
      const { data: updatedConnection, error: updateError } = await supabaseAdmin
        .from('building_tenants')
        .update({
          apartment_number: '4A',
          floor_number: 4,
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
      
      if (updateError) {
        console.error('❌ Greška pri ažuriranju veze:', updateError.message)
        return
      }
      
      console.log('✅ Veza je uspešno ažurirana!')
      console.log(`   Novi apartman: ${updatedConnection[0].apartment_number}`)
      console.log(`   Novi sprat: ${updatedConnection[0].floor_number}`)
      console.log(`   Status: ${updatedConnection[0].status}`)
      
    } else {
      // 5. Kreiraj novu vezu u building_tenants tabeli
      console.log('\n🔗 Kreiram novu vezu između stanara i apartmana...')
      const { data: newConnection, error: createError } = await supabaseAdmin
        .from('building_tenants')
        .insert({
          building_id: building.id,
          user_id: tenantUser.id,
          apartment_number: '4A',
          floor_number: 4,
          status: 'active',
          invited_by: building.user_id, // vlasnik zgrade je pozvao
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        })
        .select()
      
      if (createError) {
        console.error('❌ Greška pri kreiranju veze:', createError.message)
        return
      }
      
      console.log('✅ Veza je uspešno kreirana!')
      console.log(`   Stanar: ${tenantUser.email}`)
      console.log(`   Zgrada: ${building.name}`)
      console.log(`   Apartman: ${newConnection[0].apartment_number}`)
      console.log(`   Sprat: ${newConnection[0].floor_number}`)
      console.log(`   Status: ${newConnection[0].status}`)
    }
    
    // 6. Verifikuj da je veza uspešno kreirana/ažurirana
    console.log('\n✅ Verifikujem finalnu vezu...')
    const { data: finalConnection, error: verifyError } = await supabaseAdmin
      .from('building_tenants')
      .select(`
        *,
        buildings!inner(name, address),
        users!inner(email, raw_user_meta_data)
      `)
      .eq('building_id', building.id)
      .eq('user_id', tenantUser.id)
      .eq('apartment_number', '4A')
    
    if (verifyError) {
      console.error('❌ Greška pri verifikaciji:', verifyError.message)
      return
    }
    
    if (finalConnection && finalConnection.length > 0) {
      const connection = finalConnection[0]
      console.log('🎉 USPEŠNO! Veza je potvrđena:')
      console.log(`   📧 Stanar: ${tenantUser.email}`)
      console.log(`   🏢 Zgrada: ${connection.buildings.name}`)
      console.log(`   🏠 Apartman: ${connection.apartment_number}`)
      console.log(`   📊 Sprat: ${connection.floor_number}`)
      console.log(`   ✅ Status: ${connection.status}`)
      console.log(`   📅 Datum pridruživanja: ${new Date(connection.joined_at).toLocaleString('sr-RS')}`)
    } else {
      console.log('❌ Verifikacija neuspešna - veza nije pronađena!')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

// Pokreni funkciju
connectTenantToApartment()