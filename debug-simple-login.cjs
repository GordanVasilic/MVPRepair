const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje običnog klijenta za testiranje prijave
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugSimpleLogin() {
  console.log('🔍 Debugging demo@firma.com prijave i zgrada...')
  
  try {
    // 1. Testiraj prijavu
    console.log('\n🔐 Prijavljivanje kao demo@firma.com...')
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
    console.log('   Email:', loginData.user.email)
    console.log('   User metadata:', loginData.user.user_metadata)
    console.log('   App metadata:', loginData.user.app_metadata)
    
    // 2. Proveri zgrade za ovog korisnika
    console.log('\n🏢 Dohvatanje zgrada za korisnika...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError)
    } else {
      console.log(`✅ Pronađeno ${buildings?.length || 0} zgrada:`)
      if (buildings && buildings.length > 0) {
        buildings.forEach(building => {
          console.log(`   - ${building.name} (${building.address})`)
          console.log(`     ID: ${building.id}`)
          console.log(`     User ID: ${building.user_id}`)
          console.log(`     Created: ${building.created_at}`)
        })
      } else {
        console.log('   Nema zgrada za ovog korisnika')
      }
    }
    
    // 3. Testiraj join query kao u Dashboard-u
    console.log('\n🔍 Testiranje join query sa building_models...')
    const { data: buildingsWithModels, error: joinError } = await supabase
      .from('buildings')
      .select(`
        *,
        building_models (
          id,
          floors_count,
          model_config
        )
      `)
    
    if (joinError) {
      console.error('❌ Greška pri join query:', joinError)
    } else {
      console.log(`✅ Join query uspešan, ${buildingsWithModels?.length || 0} rezultata:`)
      buildingsWithModels?.forEach(building => {
        console.log(`   - ${building.name}:`)
        console.log(`     User ID: ${building.user_id}`)
        console.log(`     Building models: ${building.building_models?.length || 0}`)
        if (building.building_models && building.building_models.length > 0) {
          building.building_models.forEach(model => {
            console.log(`       * Model ID: ${model.id}, Floors: ${model.floors_count}`)
          })
        }
      })
    }
    
    // 4. Ako nema zgrada, kreiraj test zgradu
    if (!buildings || buildings.length === 0) {
      console.log('\n🏗️ Kreiranje test zgrade...')
      const { data: newBuilding, error: createError } = await supabase
        .from('buildings')
        .insert([{
          name: 'Demo Zgrada Firma',
          address: 'Bulevar Kralja Aleksandra 123, Beograd',
          description: 'Test zgrada za demo firmu'
        }])
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Greška pri kreiranju zgrade:', createError)
      } else {
        console.log('✅ Zgrada kreirana uspešno!')
        console.log('   ID:', newBuilding.id)
        console.log('   Naziv:', newBuilding.name)
        console.log('   User ID:', newBuilding.user_id)
        
        // Kreiraj building model
        console.log('\n🏗️ Kreiranje building model...')
        const { data: model, error: modelError } = await supabase
          .from('building_models')
          .insert([{
            building_id: newBuilding.id,
            floors_count: 4,
            model_config: {
              floors: [
                { number: 1, height: 3.0, position: { x: 0, y: 0, z: 0 } },
                { number: 2, height: 3.0, position: { x: 0, y: 3.5, z: 0 } },
                { number: 3, height: 3.0, position: { x: 0, y: 7.0, z: 0 } },
                { number: 4, height: 3.0, position: { x: 0, y: 10.5, z: 0 } }
              ]
            }
          }])
          .select()
          .single()
        
        if (modelError) {
          console.error('❌ Greška pri kreiranju modela:', modelError)
        } else {
          console.log('✅ Building model kreiran uspešno!')
          console.log('   Model ID:', model.id)
          console.log('   Broj spratova:', model.floors_count)
        }
      }
    }
    
    // 5. Odjavi se
    await supabase.auth.signOut()
    console.log('\n✅ Debug završen!')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugSimpleLogin()