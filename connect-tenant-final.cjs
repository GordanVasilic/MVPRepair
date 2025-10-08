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

async function connectTenantFinal() {
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
    
    // 2. Pronađi korisnika demo@stanar.com
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
    
    console.log(`✅ Pronašao korisnika: ${tenantUser.email} (ID: ${tenantUser.id})`)
    
    // 3. Proverava postojeće veze
    console.log('\n🔍 Proveravam postojeće veze...')
    const { data: existingConnections, error: connectionError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .eq('tenant_id', tenantUser.id)
    
    if (connectionError) {
      console.error('❌ Greška pri proveri veza:', connectionError.message)
      return
    }
    
    console.log(`   Pronađeno ${existingConnections?.length || 0} postojećih veza`)
    
    // 4. Proverava da li već postoji veza sa ovom zgradom
    const existingInBuilding = existingConnections?.find(conn => conn.building_id === building.id)
    
    if (existingInBuilding) {
      console.log('⚠️  Veza sa ovom zgradom već postoji!')
      console.log(`   Trenutni apartman: ${existingInBuilding.apartment_number}`)
      console.log(`   Status: ${existingInBuilding.status}`)
      
      // Ažuriraj postojeću vezu
      console.log('\n🔄 Ažuriram postojeću vezu na apartman 4A...')
      const { data: updatedConnection, error: updateError } = await supabaseAdmin
        .from('building_tenants')
        .update({
          apartment_number: '4A',
          floor_number: 4,
          status: 'active',
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInBuilding.id)
        .select()
      
      if (updateError) {
        console.error('❌ Greška pri ažuriranju veze:', updateError.message)
        return
      }
      
      console.log('✅ Veza je uspešno ažurirana!')
      console.log(`   Novi apartman: ${updatedConnection[0].apartment_number}`)
      console.log(`   Novi sprat: ${updatedConnection[0].floor_number}`)
      
    } else {
      // 5. Kreiraj novu vezu koristeći insert
      console.log('\n🔗 Kreiram novu vezu...')
      
      const newConnectionData = {
        building_id: building.id,
        tenant_id: tenantUser.id,
        apartment_number: '4A',
        floor_number: 4,
        status: 'active',
        invited_by: building.user_id,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('   Podaci za insert:', newConnectionData)
      
      const { data: newConnection, error: createError } = await supabaseAdmin
        .from('building_tenants')
        .insert(newConnectionData)
        .select()
      
      if (createError) {
        console.error('❌ Greška pri kreiranju veze:', createError.message)
        console.error('   Detalji greške:', createError)
        return
      }
      
      console.log('✅ Veza je uspešno kreirana!')
      console.log('   Nova veza:', newConnection[0])
    }
    
    // 6. Verifikuj finalnu vezu
    console.log('\n✅ Verifikujem finalnu vezu...')
    const { data: finalConnection, error: verifyError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .eq('building_id', building.id)
      .eq('tenant_id', tenantUser.id)
      .eq('apartment_number', '4A')
    
    if (verifyError) {
      console.error('❌ Greška pri verifikaciji:', verifyError.message)
      return
    }
    
    if (finalConnection && finalConnection.length > 0) {
      const connection = finalConnection[0]
      console.log('🎉 USPEŠNO! Veza je potvrđena:')
      console.log(`   📧 Stanar: ${tenantUser.email}`)
      console.log(`   🏢 Zgrada: ${building.name}`)
      console.log(`   🏠 Apartman: ${connection.apartment_number}`)
      console.log(`   📊 Sprat: ${connection.floor_number}`)
      console.log(`   ✅ Status: ${connection.status}`)
      console.log(`   📅 Datum pridruživanja: ${new Date(connection.joined_at).toLocaleString('sr-RS')}`)
    } else {
      console.log('❌ Verifikacija neuspešna - veza nije pronađena!')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
    console.error('   Stack trace:', error.stack)
  }
}

// Pokreni funkciju
connectTenantFinal()