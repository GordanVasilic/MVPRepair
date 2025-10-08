const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testServerLogs() {
  try {
    console.log('Testing API to trigger server logs...')
    
    const buildingId = '6a913846-9f0e-456b-b7e9-4d7384aeb7d0'
    const updateData = {
      name: 'Test Building Update',
      floors_count: 3,
      garage_levels: 1
    }
    
    console.log('Making PUT request to trigger 500 error and see server logs...')
    
    // First test without auth to see the 401 response
    console.log('1. Testing without auth (should get 401):')
    const response1 = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })
    
    console.log('Response status:', response1.status)
    const responseText1 = await response1.text()
    console.log('Response body:', responseText1)
    
    // Now test with invalid auth to see what happens
    console.log('\n2. Testing with invalid auth token:')
    const response2 = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-here'
      },
      body: JSON.stringify(updateData)
    })
    
    console.log('Response status:', response2.status)
    const responseText2 = await response2.text()
    console.log('Response body:', responseText2)
    
    // Test with service role key (this might work differently)
    console.log('\n3. Testing with service role key:')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const response3 = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('Response status:', response3.status)
      const responseText3 = await response3.text()
      console.log('Response body:', responseText3)
    } else {
      console.log('No service role key available')
    }
    
    console.log('\nCheck the server terminal for error logs!')
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

testServerLogs()