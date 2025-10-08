const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje običnog klijenta
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createDemoConnection() {
  console.log('🔗 Kreiranje demo veze između stanara i firme...\n')
  
  try {
    // 1. Prijavi se kao demo@firma.com
    console.log('1. Prijavljivanje kao demo@firma.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Greška pri prijavljivanju:', authError.message)
      return
    }
    
    console.log('✅ Uspešno prijavljen kao:', authData.user.email)
    const companyId = authData.user.id
    
    // 2. Dohvati ID stanara demo@stanar.com
    console.log('\n2. Dohvatanje ID-ja stanara...')
    
    // Prvo se prijavi kao stanar da dohvatimo ID
    const { data: tenantAuth, error: tenantAuthError } = await supabase.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: '123456'
    })
    
    if (tenantAuthError) {
      console.error('❌ Greška pri prijavljivanju stanara:', tenantAuthError.message)
      return
    }
    
    const tenantId = tenantAuth.user.id
    console.log('✅ ID stanara:', tenantId)
    
    // Vrati se na prijavu firme
    await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    // 3. Proveravamo zgrade firme
    console.log('\n3. Proverava zgrade firme...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', companyId)
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }
    
    console.log(`   Broj zgrada: ${buildings.length}`)
    
    let targetBuilding = null
    
    if (buildings.length === 0) {
      console.log('   ⚠️  Nema zgrada, kreiranje demo zgrade...')
      
      // Kreiranje demo zgrade
      const { data: newBuilding, error: createBuildingError } = await supabase
        .from('buildings')
        .insert({
          name: 'Demo Zgrada',
          address: 'Knez Mihailova 42, Beograd',
          user_id: companyId,
          floors_config: {
            floors: 5,
            apartments_per_floor: 4
          },
          description: 'Demo zgrada za testiranje'
        })
        .select()
        .single()
      
      if (createBuildingError) {
        console.error('❌ Greška pri kreiranju zgrade:', createBuildingError.message)
        return
      }
      
      targetBuilding = newBuilding
      console.log('   ✅ Demo zgrada kreirana:', targetBuilding.name)
    } else {
      targetBuilding = buildings[0]
      console.log('   ✅ Koristi postojeću zgradu:', targetBuilding.name)
    }
    
    // 4. Proveravamo da li već postoji veza
    console.log('\n4. Proverava postojeće veze...')
    const { data: existingConnection, error: connectionError } = await supabase
      .from('building_tenants')
      .select('*')
      .eq('building_id', targetBuilding.id)
      .eq('user_id', tenantId)
      .single()
    
    if (connectionError && connectionError.code !== 'PGRST116') {
      console.error('❌ Greška pri proveri veze:', connectionError.message)
      return
    }
    
    if (existingConnection) {
      console.log('   ✅ Veza već postoji!')
      console.log('     Stan:', existingConnection.apartment_number)
      console.log('     Sprat:', existingConnection.floor_number)
      console.log('     Status:', existingConnection.status)
    } else {
      console.log('   ⚠️  Veza ne postoji, kreiranje...')
      
      // 5. Kreiranje veze između stanara i zgrade
      console.log('\n5. Kreiranje veze stanar-zgrada...')
      const { data: tenantConnection, error: tenantError } = await supabase
        .from('building_tenants')
        .insert({
          building_id: targetBuilding.id,
          user_id: tenantId,
          apartment_number: '1A',
          floor_number: 1,
          status: 'active',
          invited_by: companyId,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('❌ Greška pri kreiranju veze:', tenantError.message)
        return
      }
      
      console.log('✅ Veza uspešno kreirana!')
      console.log('   ID:', tenantConnection.id)
      console.log('   Stan:', tenantConnection.apartment_number)
      console.log('   Sprat:', tenantConnection.floor_number)
      console.log('   Status:', tenantConnection.status)
    }
    
    // 6. Testiranje API poziva
    console.log('\n6. Testiranje API poziva...')
    
    const response = await fetch('http://localhost:3001/api/tenants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ API greška:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('   Odgovor:', errorText)
      return
    }
    
    const apiData = await response.json()
    console.log('   ✅ API poziv uspešan!')
    console.log('   Broj stanara:', apiData.tenants?.length || 0)
    
    if (apiData.tenants && apiData.tenants.length > 0) {
      console.log('\n📋 Lista stanara iz API-ja:')
      apiData.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.user.name} (${tenant.user.email})`)
        console.log(`      Zgrada: ${tenant.building.name}`)
        console.log(`      Stan: ${tenant.apartment_number}, Sprat: ${tenant.floor_number}`)
        console.log(`      Status: ${tenant.status}`)
      })
    }
    
    console.log('\n🎉 Demo veza uspešno kreirana i testirana!')
    console.log('   Sada možete da se prijavite kao demo@firma.com')
    console.log('   i vidite demo@stanar.com u sekciji "Stanari"')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

createDemoConnection()