import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hszbpaoqoijzkileutnu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'
)

async function testBuildings() {
  console.log('🔍 Testiranje buildings tabele...')
  
  try {
    // Test 1: Dohvati sve zgrade
    console.log('\n1. Dohvatanje svih zgrada...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
    
    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError)
    } else {
      console.log(`✅ Pronađeno ${buildings?.length || 0} zgrada:`)
      buildings?.forEach(building => {
        console.log(`   - ${building.name} (ID: ${building.id}, User: ${building.user_id})`)
      })
    }
    
    // Test 2: Dohvati building models
    console.log('\n2. Dohvatanje building models...')
    const { data: models, error: modelsError } = await supabase
      .from('building_models')
      .select('*')
    
    if (modelsError) {
      console.error('❌ Greška pri dohvatanju modela:', modelsError)
    } else {
      console.log(`✅ Pronađeno ${models?.length || 0} modela:`)
      models?.forEach(model => {
        console.log(`   - Building ID: ${model.building_id}, Floors: ${model.floors_count}`)
      })
    }
    
    // Test 3: Testiraj join query kao u Dashboard-u
    console.log('\n3. Testiranje join query...')
    const { data: joinData, error: joinError } = await supabase
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
      console.log(`✅ Join query uspešan, ${joinData?.length || 0} rezultata:`)
      joinData?.forEach(building => {
        console.log(`   - ${building.name}: ${building.building_models?.length || 0} modela`)
      })
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

testBuildings()