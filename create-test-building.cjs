const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createTestBuilding() {
  console.log('🏗️ Kreiranje test zgrade za demo firmu...')
  
  try {
    // 1. Prijavi se kao firma
    console.log('🔐 Prijavljivanje kao demo@firma.com...')
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
    
    // 2. Kreiraj test zgradu
    console.log('\n🏢 Kreiranje test zgrade...')
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .insert([{
        name: 'Demo Zgrada',
        address: 'Bulevar Kralja Aleksandra 123, Beograd',
        description: 'Test zgrada za demo firmu'
      }])
      .select()
      .single()
    
    if (buildingError) {
      console.error('❌ Greška pri kreiranju zgrade:', buildingError)
      return
    }
    
    console.log('✅ Zgrada kreirana uspešno!')
    console.log('   ID:', building.id)
    console.log('   Naziv:', building.name)
    console.log('   User ID:', building.user_id)
    
    // 3. Kreiraj building model
    console.log('\n🏗️ Kreiranje building model...')
    const { data: model, error: modelError } = await supabase
      .from('building_models')
      .insert([{
        building_id: building.id,
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
    
    // 4. Kreiraj nekoliko test problema
    console.log('\n🔧 Kreiranje test problema...')
    const issues = [
      {
        building_id: building.id,
        floor_number: 1,
        title: 'Curenje vode u kuhinji',
        description: 'Voda curi iz slavine u kuhinji stana 12',
        priority: 'high',
        status: 'open',
        position: { x: 5, y: 3 }
      },
      {
        building_id: building.id,
        floor_number: 2,
        title: 'Prekidač ne radi',
        description: 'Prekidač za svetlo u hodniku drugog sprata ne radi',
        priority: 'medium',
        status: 'open',
        position: { x: 8, y: 2 }
      },
      {
        building_id: building.id,
        floor_number: 3,
        title: 'Vrata lifta se ne zatvaraju',
        description: 'Vrata lifta na trećem spratu se ne zatvaraju potpuno',
        priority: 'high',
        status: 'in_progress',
        position: { x: 2, y: 5 }
      }
    ]
    
    const { data: createdIssues, error: issuesError } = await supabase
      .from('issues')
      .insert(issues)
      .select()
    
    if (issuesError) {
      console.error('❌ Greška pri kreiranju problema:', issuesError)
    } else {
      console.log(`✅ Kreirano ${createdIssues.length} test problema`)
    }
    
    // 5. Testiraj dohvatanje zgrada kao u Dashboard-u
    console.log('\n🔍 Testiranje dohvatanja zgrada...')
    const { data: buildings, error: fetchError } = await supabase
      .from('buildings')
      .select(`
        *,
        building_models (
          id,
          floors_count,
          model_config
        )
      `)
    
    if (fetchError) {
      console.error('❌ Greška pri dohvatanju zgrada:', fetchError)
    } else {
      console.log(`✅ Dohvaćeno ${buildings.length} zgrada:`)
      buildings.forEach(b => {
        console.log(`   - ${b.name} (${b.address})`)
        console.log(`     User ID: ${b.user_id}`)
        console.log(`     Modeli: ${b.building_models?.length || 0}`)
      })
    }
    
    // 6. Odjavi se
    await supabase.auth.signOut()
    console.log('\n✅ Test završen uspešno!')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

createTestBuilding()