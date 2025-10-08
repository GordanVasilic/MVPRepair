const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testDirectAPI() {
  try {
    console.log('Testing direct API call to building update endpoint...')
    
    const buildingId = '6a913846-9f0e-456b-b7e9-4d7384aeb7d0'
    const updateData = {
      name: 'Test Building Update',
      floors_count: 3,
      garage_levels: 1
    }
    
    console.log('Making PUT request to API without auth...')
    const response = await fetch(`http://localhost:3001/api/buildings/${buildingId}`, {
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
    
    if (response.status === 500) {
      console.log('Got 500 error - this is the issue we need to debug!')
    }
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

testDirectAPI()