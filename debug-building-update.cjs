const { createClient } = require('@supabase/supabase-js')

async function debugBuildingUpdate() {
  console.log('🔍 Debugging building update issue...')
  
  // Load environment variables
  require('dotenv').config()
  
  // Get Supabase config
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('Supabase URL:', supabaseUrl)
  console.log('Anon key exists:', !!supabaseAnonKey)
  console.log('Service key exists:', !!supabaseServiceKey)
  
  if (!supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Missing Supabase keys')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. First, let's find the demo company user
    console.log('\n1. Finding demo company user...')
    
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'demo@firma.com',
      password: 'demo123'
    })
    
    if (authError) {
      console.error('❌ Error signing in as demo company:', authError)
      return
    }
    
    if (!user) {
      console.log('❌ No user found')
      return
    }
    
    console.log('✅ Found demo user:', user.email, user.id)
    
    // 2. Find a building owned by this user
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name, address, description, garage_levels, user_id')
      .eq('user_id', user.id)
      .limit(1)
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ No buildings found for user')
      return
    }
    
    const building = buildings[0]
    console.log('✅ Found building:', building.name, building.id)
    
    // 3. Check building_models for this building
    console.log('\n2. Checking building_models...')
    const { data: models, error: modelsError } = await supabaseService
      .from('building_models')
      .select('*')
      .eq('building_id', building.id)
    
    if (modelsError) {
      console.error('❌ Error fetching building models:', modelsError)
    } else {
      console.log('✅ Building models found:', models?.length || 0)
      if (models && models.length > 0) {
        console.log('Model details:', models[0])
      }
    }
    
    // 4. Try to update the building directly via Supabase
    console.log('\n3. Testing direct building update...')
    
    const updateData = {
      name: building.name + ' (Updated)',
      address: building.address,
      description: (building.description || '') + ' - Test update',
      garage_levels: building.garage_levels
    }
    
    const { data: updatedBuilding, error: updateError } = await supabaseService
      .from('buildings')
      .update(updateData)
      .eq('id', building.id)
      .select()
    
    if (updateError) {
      console.error('❌ Direct update failed:', updateError)
    } else {
      console.log('✅ Direct update successful:', updatedBuilding)
    }
    
    // 5. Test building_models update if it exists
    if (models && models.length > 0) {
      console.log('\n4. Testing building_models update...')
      
      const modelUpdateData = {
        model_data: models[0].model_data // Keep existing data
      }
      
      const { data: updatedModel, error: modelUpdateError } = await supabaseService
        .from('building_models')
        .update(modelUpdateData)
        .eq('building_id', building.id)
        .select()
      
      if (modelUpdateError) {
        console.error('❌ Building model update failed:', modelUpdateError)
      } else {
        console.log('✅ Building model update successful')
      }
    }
    
    // 6. Check RLS policies
    console.log('\n5. Checking RLS policies...')
    
    const { data: policies, error: policiesError } = await supabaseService
      .rpc('get_policies', { table_name: 'buildings' })
      .catch(() => null)
    
    if (policies) {
      console.log('✅ RLS policies for buildings:', policies)
    }
    
    // 7. Test API endpoint simulation
    console.log('\n6. Simulating API endpoint logic...')
    
    // Simulate what the API does
    try {
      // Update building
      const { error: apiUpdateError } = await supabaseService
        .from('buildings')
        .update(updateData)
        .eq('id', building.id)
      
      if (apiUpdateError) {
        console.error('❌ API simulation - building update failed:', apiUpdateError)
        return
      }
      
      // Update building_models if exists
      if (models && models.length > 0) {
        const { error: apiModelError } = await supabaseService
          .from('building_models')
          .update({ model_data: models[0].model_data })
          .eq('building_id', building.id)
        
        if (apiModelError) {
          console.error('❌ API simulation - model update failed:', apiModelError)
          return
        }
      }
      
      console.log('✅ API simulation successful')
      
    } catch (apiError) {
      console.error('❌ API simulation error:', apiError)
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

debugBuildingUpdate()