const { createClient } = require('@supabase/supabase-js')

async function testBuildingUpdate() {
  console.log('🔍 Testing building update with actual API call...')
  
  // Get Supabase config
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hszbpaoqoijzkileutnu.supabase.co'
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjQxNjUsImV4cCI6MjA3NDg0MDE2NX0.240dHMzBAZZU6xEJCDL7NJtVqnz6ZKn3A6_XqkEttd8'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Find a company user
    console.log('\n1. Finding company user...')
    
    const { data: users, error: usersError } = await supabaseService
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('raw_user_meta_data->>role', 'company')
      .limit(1)
    
    if (usersError) {
      console.log('Trying alternative user query...')
      // Try getting users from companies table
      const { data: companies, error: companiesError } = await supabaseService
        .from('companies')
        .select('user_id, name')
        .limit(1)
      
      if (companiesError || !companies || companies.length === 0) {
        console.error('❌ No company users found')
        return
      }
      
      const companyUserId = companies[0].user_id
      console.log('✅ Found company user ID:', companyUserId)
      
      // Get auth token for this user (simulate login)
      const { data: authData, error: authError } = await supabaseService.auth.admin.generateLink({
        type: 'magiclink',
        email: 'company@example.com' // We'll need to find the actual email
      })
      
      if (authError) {
        console.log('Auth simulation failed, using service role for testing')
      }
    }
    
    // 2. Find a building to update
    console.log('\n2. Finding building to update...')
    
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name, address, description, floors_count, garage_levels, company_id')
      .limit(1)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.error('❌ No buildings found:', buildingsError)
      return
    }
    
    const building = buildings[0]
    console.log('✅ Found building:', building.name, building.id)
    console.log('Current floors_count:', building.floors_count)
    
    // 3. Test the actual API endpoint
    console.log('\n3. Testing API endpoint...')
    
    const updateData = {
      name: building.name,
      address: building.address,
      description: building.description || 'Updated description',
      floors_count: (building.floors_count || 2) + 1, // Increment floors
      garage_levels: building.garage_levels || 0
    }
    
    console.log('Update data:', updateData)
    
    try {
      const response = await fetch(`http://localhost:3001/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}` // This won't work, but let's see the error
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('Response body:', responseText)
      
      if (!response.ok) {
        console.error('❌ API call failed')
      } else {
        console.log('✅ API call successful')
      }
      
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message)
    }
    
    // 4. Test direct database operations
    console.log('\n4. Testing direct database operations...')
    
    // Test building update
    const { data: updatedBuilding, error: updateError } = await supabaseService
      .from('buildings')
      .update({
        name: building.name,
        address: building.address,
        description: building.description || 'Test update',
        floors_count: updateData.floors_count,
        garage_levels: updateData.garage_levels
      })
      .eq('id', building.id)
      .select()
    
    if (updateError) {
      console.error('❌ Direct building update failed:', updateError)
    } else {
      console.log('✅ Direct building update successful:', updatedBuilding)
    }
    
    // Test building_models operations
    console.log('\n5. Testing building_models operations...')
    
    // Check if building_models exists
    const { data: existingModel, error: modelSelectError } = await supabaseService
      .from('building_models')
      .select('*')
      .eq('building_id', building.id)
      .single()
    
    console.log('Existing model check:', { existingModel, modelSelectError })
    
    if (modelSelectError && modelSelectError.code !== 'PGRST116') {
      console.error('❌ Error checking building_models:', modelSelectError)
    } else if (existingModel) {
      // Update existing model
      const { data: modelUpdate, error: modelUpdateError } = await supabaseService
        .from('building_models')
        .update({
          floors_count: updateData.floors_count,
          model_config: {
            floors: Array.from({ length: updateData.floors_count }, (_, i) => ({
              number: i + 1,
              height: 3.0,
              position: { x: 0, y: i * 3.5, z: 0 }
            }))
          }
        })
        .eq('building_id', building.id)
        .select()
      
      console.log('Model update result:', { modelUpdate, modelUpdateError })
    } else {
      // Create new model
      const { data: modelInsert, error: modelInsertError } = await supabaseService
        .from('building_models')
        .insert({
          building_id: building.id,
          floors_count: updateData.floors_count,
          model_config: {
            floors: Array.from({ length: updateData.floors_count }, (_, i) => ({
              number: i + 1,
              height: 3.0,
              position: { x: 0, y: i * 3.5, z: 0 }
            }))
          }
        })
        .select()
      
      console.log('Model insert result:', { modelInsert, modelInsertError })
    }
    
  } catch (error) {
    console.error('❌ Test script error:', error)
  }
}

testBuildingUpdate()