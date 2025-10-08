const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugTenantStats() {
  console.log('🔍 DEBUG TENANT STATS')
  console.log('====================')
  
  try {
    // 1. Check demo@firma.com user
    console.log('\n1. Checking demo@firma.com user...')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    const demoCompany = users.users.find(u => u.email === 'demo@firma.com')
    if (!demoCompany) {
      console.log('❌ demo@firma.com user not found!')
      return
    }
    
    console.log('✅ Found demo@firma.com user:')
    console.log('   ID:', demoCompany.id)
    console.log('   Email:', demoCompany.email)
    console.log('   Role (app_metadata):', demoCompany.app_metadata?.role)
    console.log('   Role (user_metadata):', demoCompany.user_metadata?.role)
    
    // 2. Check buildings owned by demo@firma.com
    console.log('\n2. Checking buildings owned by demo@firma.com...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', demoCompany.id)
    
    console.log('Buildings result:', { buildings, buildingsError })
    
    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return
    }
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ No buildings found for demo@firma.com')
      return
    }
    
    console.log(`✅ Found ${buildings.length} buildings:`)
    buildings.forEach((building, index) => {
      console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`)
    })
    
    const buildingIds = buildings.map(b => b.id)
    
    // 3. Check building_tenants table
    console.log('\n3. Checking building_tenants table...')
    const { data: allTenants, error: allTenantsError } = await supabase
      .from('building_tenants')
      .select('*')
      .in('building_id', buildingIds)
    
    console.log('All tenants result:', { allTenants, allTenantsError })
    
    if (allTenantsError) {
      console.error('Error fetching tenants:', allTenantsError)
      return
    }
    
    if (!allTenants || allTenants.length === 0) {
      console.log('❌ No tenants found in building_tenants table for these buildings')
      
      // Let's check if the table exists at all
      console.log('\n4. Checking if building_tenants table exists...')
      const { data: tableCheck, error: tableError } = await supabase
        .from('building_tenants')
        .select('*', { count: 'exact', head: true })
      
      if (tableError) {
        console.error('❌ building_tenants table does not exist or has permission issues:', tableError)
      } else {
        console.log('✅ building_tenants table exists, total records:', tableCheck)
      }
      
      return
    }
    
    console.log(`✅ Found ${allTenants.length} tenants in building_tenants table:`)
    allTenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. Tenant ID: ${tenant.tenant_id}`)
      console.log(`      Building ID: ${tenant.building_id}`)
      console.log(`      Apartment: ${tenant.apartment_number}`)
      console.log(`      Status: ${tenant.status}`)
      console.log(`      Created: ${tenant.created_at}`)
    })
    
    // 4. Count active tenants
    console.log('\n4. Counting active tenants...')
    const activeTenants = allTenants.filter(t => t.status === 'active')
    console.log(`✅ Active tenants: ${activeTenants.length}`)
    
    // 5. Check with count query (same as frontend)
    console.log('\n5. Testing count query (same as frontend)...')
    const { count, error: countError } = await supabase
      .from('building_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('building_id', buildingIds)
    
    console.log('Count query result:', { count, countError })
    
    if (countError) {
      console.error('❌ Count query failed:', countError)
    } else {
      console.log(`✅ Count query returned: ${count}`)
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugTenantStats()