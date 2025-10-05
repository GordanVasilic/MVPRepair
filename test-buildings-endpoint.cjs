const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testBuildingsEndpoint() {
  try {
    console.log('Testing buildings endpoint...')
    
    // Test Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Anon Key exists:', !!supabaseAnonKey)
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test database connection by fetching buildings
    console.log('\nTesting database connection...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(1)
    
    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
    } else {
      console.log('Buildings query successful. Count:', buildings?.length || 0)
    }
    
    // Test auth
    console.log('\nTesting auth...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('No authenticated user (expected for anon key):', authError.message)
    } else {
      console.log('User:', user)
    }
    
    // Test table structure
    console.log('\nTesting table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('buildings')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('Error checking table structure:', tableError)
    } else {
      console.log('Table structure check successful')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testBuildingsEndpoint()