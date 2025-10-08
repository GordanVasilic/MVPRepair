const { createClient } = require('@supabase/supabase-js')

async function testSimpleApi() {
  console.log('🔍 Testing API with simple approach...')
  
  const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'
  
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Find a building to test with
    console.log('\n1. Finding building...')
    
    const { data: buildings, error: buildingsError } = await supabaseService
      .from('buildings')
      .select('id, name, address, description, garage_levels')
      .limit(1)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.error('❌ No buildings found:', buildingsError)
      return
    }
    
    const testBuilding = buildings[0]
    console.log('✅ Found building:', testBuilding.name, testBuilding.id)
    
    // 2. Test API call without auth to see the exact error
    console.log('\n2. Testing API without auth...')
    
    const updateData = {
      name: testBuilding.name,
      address: testBuilding.address,
      description: (testBuilding.description || '') + ' - Test',
      floors_count: 3,
      garage_levels: testBuilding.garage_levels || 0
    }
    
    console.log('Update data:', updateData)
    
    try {
      const response = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('Response body:', responseText)
      
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message)
    }
    
    // 3. Test with service role key (wrong usage but let's see)
    console.log('\n3. Testing with service role key...')
    
    try {
      const response2 = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('Service role response status:', response2.status)
      const responseText2 = await response2.text()
      console.log('Service role response:', responseText2)
      
    } catch (fetchError2) {
      console.error('❌ Service role fetch error:', fetchError2.message)
    }
    
    // 4. Check if server is running
    console.log('\n4. Checking if server is running...')
    
    try {
      const healthResponse = await fetch('http://localhost:3001/health')
      console.log('Health check status:', healthResponse.status)
      const healthText = await healthResponse.text()
      console.log('Health response:', healthText)
    } catch (healthError) {
      console.error('❌ Health check error:', healthError.message)
    }
    
    // 5. Try GET request to see if API is working
    console.log('\n5. Testing GET request...')
    
    try {
      const getResponse = await fetch(`http://localhost:3001/api/buildings/${testBuilding.id}`)
      console.log('GET response status:', getResponse.status)
      const getText = await getResponse.text()
      console.log('GET response:', getText.substring(0, 200) + '...')
    } catch (getError) {
      console.error('❌ GET error:', getError.message)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testSimpleApi()