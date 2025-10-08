const { createClient } = require('@supabase/supabase-js')

async function checkBuildingModels() {
  console.log('🔍 Checking building_models table and RLS policies...')
  
  // Get Supabase config
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    console.error('❌ Missing Supabase service key')
    return
  }
  
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Check if building_models table exists and its structure
    console.log('\n1. Checking building_models table structure...')
    
    const { data: tableInfo, error: tableError } = await supabaseService
      .from('building_models')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error accessing building_models table:', tableError)
      
      // Check if table exists at all
      const { data: tables, error: tablesError } = await supabaseService
        .rpc('get_table_info', { table_name: 'building_models' })
        .catch(() => null)
      
      if (!tables) {
        console.log('❌ building_models table might not exist')
      }
    } else {
      console.log('✅ building_models table accessible')
      if (tableInfo && tableInfo.length > 0) {
        console.log('Sample record:', tableInfo[0])
      }
    }
    
    // 2. Check RLS policies on building_models
    console.log('\n2. Checking RLS policies...')
    
    // Try to get RLS status
    const { data: rlsStatus, error: rlsError } = await supabaseService
      .rpc('pg_get_table_rls_status', { table_name: 'building_models' })
      .catch(() => null)
    
    if (rlsStatus) {
      console.log('RLS status:', rlsStatus)
    }
    
    // 3. Test direct operations on building_models
    console.log('\n3. Testing building_models operations...')
    
    // Find a building to test with
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name')
      .limit(1)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.log('❌ No buildings found for testing')
      return
    }
    
    const testBuilding = buildings[0]
    console.log('Using test building:', testBuilding.name, testBuilding.id)
    
    // Check existing model for this building
    const { data: existingModel, error: modelError } = await supabaseService
      .from('building_models')
      .select('*')
      .eq('building_id', testBuilding.id)
      .single()
    
    console.log('Existing model query result:', { existingModel, modelError })
    
    if (existingModel) {
      // Try to update existing model
      console.log('Testing model update...')
      const { data: updateResult, error: updateError } = await supabaseService
        .from('building_models')
        .update({ 
          floors_count: existingModel.floors_count,
          model_config: existingModel.model_config 
        })
        .eq('building_id', testBuilding.id)
        .select()
      
      console.log('Update result:', { updateResult, updateError })
    } else {
      // Try to create a new model
      console.log('Testing model creation...')
      const testModelConfig = {
        floors: [
          { number: 1, height: 3.0, position: { x: 0, y: 0, z: 0 } },
          { number: 2, height: 3.0, position: { x: 0, y: 3.5, z: 0 } }
        ]
      }
      
      const { data: insertResult, error: insertError } = await supabaseService
        .from('building_models')
        .insert({
          building_id: testBuilding.id,
          floors_count: 2,
          model_config: testModelConfig
        })
        .select()
      
      console.log('Insert result:', { insertResult, insertError })
      
      // Clean up - delete the test record
      if (insertResult && insertResult.length > 0) {
        await supabaseService
          .from('building_models')
          .delete()
          .eq('id', insertResult[0].id)
        console.log('Test record cleaned up')
      }
    }
    
    // 4. Check table permissions
    console.log('\n4. Checking table permissions...')
    
    const { data: permissions, error: permError } = await supabaseService
      .rpc('get_table_permissions', { table_name: 'building_models' })
      .catch(() => null)
    
    if (permissions) {
      console.log('Table permissions:', permissions)
    } else if (permError) {
      console.log('Permission check error:', permError)
    }
    
  } catch (error) {
    console.error('❌ Check script error:', error)
  }
}

checkBuildingModels()