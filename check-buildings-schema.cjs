const { createClient } = require('@supabase/supabase-js')

async function checkBuildingsSchema() {
  console.log('🔍 Checking buildings table schema...')
  
  const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'
  
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Get buildings table structure
    console.log('\n1. Getting buildings table structure...')
    
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('*')
      .limit(1)
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
      return
    }
    
    if (buildings && buildings.length > 0) {
      console.log('✅ Buildings table columns:')
      Object.keys(buildings[0]).forEach(col => console.log(`  - ${col}`))
      console.log('\nSample building:', buildings[0])
    } else {
      console.log('❌ No buildings found')
    }
    
    // 2. Check building_models table
    console.log('\n2. Checking building_models table...')
    
    const { data: models, error: modelsError } = await supabaseService
      .from('building_models')
      .select('*')
      .limit(1)
    
    if (modelsError) {
      console.error('❌ Error fetching building_models:', modelsError)
    } else if (models && models.length > 0) {
      console.log('✅ Building_models table columns:')
      Object.keys(models[0]).forEach(col => console.log(`  - ${col}`))
      console.log('\nSample model:', models[0])
    } else {
      console.log('❌ No building models found')
    }
    
    // 3. Check if floors_count exists in buildings table
    console.log('\n3. Testing floors_count column...')
    
    const { data: testFloors, error: floorsError } = await supabaseService
      .from('buildings')
      .select('id, name, floors_count')
      .limit(1)
    
    if (floorsError) {
      console.error('❌ floors_count column does not exist in buildings table:', floorsError.message)
    } else {
      console.log('✅ floors_count column exists in buildings table')
    }
    
  } catch (error) {
    console.error('❌ Schema check error:', error)
  }
}

checkBuildingsSchema()