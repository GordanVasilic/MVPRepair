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

// Kreiranje običnog klijenta za testiranje prijave
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugCompanyUser() {
  console.log('🔍 Debugging company user i zgrade...')
  
  try {
    // 1. Proveri da li demo@firma.com postoji
    console.log('\n📋 Proverava demo@firma.com korisnika...')
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri dohvatanju korisnika:', usersError.message)
      return
    }
    
    const companyUser = users.users.find(u => u.email === 'demo@firma.com')
    if (!companyUser) {
      console.log('❌ demo@firma.com ne postoji! Kreiranje...')
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'demo@firma.com',
        password: '123456',
        user_metadata: {
          name: 'Demo Firma',
          role: 'company'
        },
        email_confirm: true
      })
      
      if (createError) {
        console.error('❌ Greška pri kreiranju korisnika:', createError.message)
        return
      }
      
      console.log('✅ Kreiran novi company korisnik:', newUser.user.email)
    } else {
      console.log('✅ demo@firma.com postoji')
      console.log('   ID:', companyUser.id)
      console.log('   Email confirmed:', companyUser.email_confirmed_at ? 'DA' : 'NE')
      console.log('   User metadata:', companyUser.user_metadata)
      console.log('   App metadata:', companyUser.app_metadata)
    }
    
    // 2. Testiraj prijavu
    console.log('\n🔐 Testiranje prijave demo@firma.com...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: '123456'
    })
    
    if (loginError) {
      console.error('❌ Greška pri prijavi:', loginError.message)
      return
    }
    
    console.log('✅ Uspešna prijava!')
    console.log('   User ID:', loginData.user.id)
    console.log('   User metadata:', loginData.user.user_metadata)
    console.log('   App metadata:', loginData.user.app_metadata)
    
    // 3. Proveri zgrade za ovog korisnika
    console.log('\n🏢 Proverava zgrade za korisnika...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
    
    console.log('Buildings query result:', { buildings, buildingsError })
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
    } else {
      console.log(`✅ Pronađeno ${buildings?.length || 0} zgrada`)
      if (buildings && buildings.length > 0) {
        buildings.forEach(building => {
          console.log(`   - ${building.name} (${building.address}) - User ID: ${building.user_id}`)
        })
      }
    }
    
    // 4. Ako nema zgrada, kreiraj test zgradu
    if (!buildings || buildings.length === 0) {
      console.log('\n🏗️ Kreiranje test zgrade...')
      const { data: newBuilding, error: createBuildingError } = await supabase
        .from('buildings')
        .insert([{
          name: 'Test Zgrada',
          address: 'Test Adresa 123',
          description: 'Test zgrada za demo firmu'
        }])
        .select()
        .single()
      
      if (createBuildingError) {
        console.error('❌ Greška pri kreiranju zgrade:', createBuildingError.message)
      } else {
        console.log('✅ Kreirana test zgrada:', newBuilding.name)
        
        // Kreiraj building model
        const { data: buildingModel, error: modelError } = await supabase
          .from('building_models')
          .insert([{
            building_id: newBuilding.id,
            floors_count: 3,
            model_config: {
              floors: [
                { number: 1, height: 3.0, position: { x: 0, y: 0, z: 0 } },
                { number: 2, height: 3.0, position: { x: 0, y: 3.5, z: 0 } },
                { number: 3, height: 3.0, position: { x: 0, y: 7.0, z: 0 } }
              ]
            }
          }])
          .select()
          .single()
        
        if (modelError) {
          console.error('❌ Greška pri kreiranju building model:', modelError.message)
        } else {
          console.log('✅ Kreiran building model')
        }
      }
    }
    
    // 5. Odjavi se
    await supabase.auth.signOut()
    console.log('\n✅ Debug završen!')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

debugCompanyUser()