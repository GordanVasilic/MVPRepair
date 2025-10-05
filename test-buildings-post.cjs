const fetch = require('node-fetch')
require('dotenv').config()

async function testBuildingsPost() {
  try {
    console.log('Testing POST /api/buildings endpoint...')
    
    // Test without auth token
    console.log('\n1. Testing without auth token...')
    const response1 = await fetch('http://localhost:3001/api/buildings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Building',
        address: 'Test Address',
        floors_count: 2,
        garage_levels: 1
      })
    })
    
    console.log('Status:', response1.status)
    const result1 = await response1.text()
    console.log('Response:', result1)
    
    // Test with invalid auth token
    console.log('\n2. Testing with invalid auth token...')
    const response2 = await fetch('http://localhost:3001/api/buildings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        name: 'Test Building',
        address: 'Test Address',
        floors_count: 2,
        garage_levels: 1
      })
    })
    
    console.log('Status:', response2.status)
    const result2 = await response2.text()
    console.log('Response:', result2)
    
    // Test with missing required fields
    console.log('\n3. Testing with missing required fields...')
    const response3 = await fetch('http://localhost:3001/api/buildings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        floors_count: 2
      })
    })
    
    console.log('Status:', response3.status)
    const result3 = await response3.text()
    console.log('Response:', result3)
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testBuildingsPost()