const { createClient } = require('@supabase/supabase-js')

async function simpleBuildingTest() {
  console.log('🔍 Simple building update test...')
  
  const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'
  
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Find any building
    console.log('\n1. Finding buildings...')
    
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name, address, description, floors_count, garage_levels')
      .limit(3)
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ No buildings found')
      return
    }
    
    console.log('✅ Found buildings:', buildings.length)
    buildings.forEach(b => console.log(`  - ${b.name} (${b.id}) - floors: ${b.floors_count}`))
    
    const testBuilding = buildings[0]
    
    // 2. Test building update
    console.log(`\n2. Testing update on building: ${testBuilding.name}`)
    
    const updateData = {
      name: testBuilding.name,
      address: testBuilding.address,
      description: (testBuilding.description || '') + ' - Updated at ' + new Date().toISOString(),
      floors_count: (testBuilding.floors_count || 2),
      garage_levels: testBuilding.garage_levels || 0
    }
    
    console.log('Update data:', updateData)
    
    const { data: updatedBuilding, error: updateError } = await supabaseService
      .from('buildings')
      .update(updateData)
      .eq('id', testBuilding.id)
      .select()
    
    if (updateError) {
      console.error('❌ Building update failed:', updateError)
    } else {
      console.log('✅ Building update successful:', updatedBuilding)
    }
    
    // 3. Check building_models table
    console.log('\n3. Checking building_models...')
    
    const { data: models, error: modelsError } = await supabaseService
      .from('building_models')
      .select('*')
      .eq('building_id', testBuilding.id)
    
    if (modelsError) {
      console.error('❌ Error checking building_models:', modelsError)
    } else {
      console.log('✅ Building models found:', models?.length || 0)
      if (models && models.length > 0) {
        console.log('Model details:', models[0])
      }
    }
    
    // 4. Test building_models operations
    if (models && models.length > 0) {
      console.log('\n4. Testing building_models update...')
      
      const modelConfig = {
        floors: Array.from({ length: updateData.floors_count }, (_, i) => ({
          number: i + 1,
          height: 3.0,
          position: { x: 0, y: i * 3.5, z: 0 }
        }))
      }
      
      const { data: modelUpdate, error: modelUpdateError } = await supabaseService
        .from('building_models')
        .update({
          floors_count: updateData.floors_count,
          model_config: modelConfig
        })
        .eq('building_id', testBuilding.id)
        .select()
      
      if (modelUpdateError) {
        console.error('❌ Building model update failed:', modelUpdateError)
      } else {
        console.log('✅ Building model update successful')
      }
    } else {
      console.log('\n4. Creating new building_models entry...')
      
      const modelConfig = {
        floors: Array.from({ length: updateData.floors_count }, (_, i) => ({
          number: i + 1,
          height: 3.0,
          position: { x: 0, y: i * 3.5, z: 0 }
        }))
      }
      
      const { data: modelInsert, error: modelInsertError } = await supabaseService
        .from('building_models')
        .insert({
          building_id: testBuilding.id,
          floors_count: updateData.floors_count,
          model_config: modelConfig
        })
        .select()
      
      if (modelInsertError) {
        console.error('❌ Building model creation failed:', modelInsertError)
      } else {
        console.log('✅ Building model created successfully')
      }
    }
    
    // 5. Test API endpoint directly
    console.log('\n5. Testing API endpoint...')
    
    try {
      const response = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // We need a proper auth token, but let's see what happens
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('API Response status:', response.status)
      const responseText = await response.text()
      console.log('API Response:', responseText)
      
    } catch (apiError) {
      console.error('❌ API test failed:', apiError.message)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

simpleBuildingTest()