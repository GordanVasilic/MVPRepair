const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugTenantsView() {
  console.log('🔍 Checking apartment_tenants_with_details view...')
  
  try {
    // First check if the view exists
    const { data: viewData, error: viewError } = await supabase
      .from('apartment_tenants_with_details')
      .select('*')
      .limit(5)
    
    console.log('📊 View query result:', { viewData, viewError })
    
    if (viewError) {
      console.log('❌ View does not exist or has error. Checking individual tables...')
      
      // Check apartment_tenants table
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('apartment_tenants')
        .select('*')
        .limit(5)
      
      console.log('🏠 apartment_tenants table:', { tenantsData, tenantsError })
      
      // Check apartments table
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select('*')
        .limit(5)
      
      console.log('🏢 apartments table:', { apartmentsData, apartmentsError })
      
      // Check buildings table
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .limit(5)
      
      console.log('🏗️ buildings table:', { buildingsData, buildingsError })
      
      // Check user_profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(5)
      
      console.log('👤 user_profiles table:', { profilesData, profilesError })
    }
    
    // Check for demo@firma.com user
    const { data: demoUser, error: demoError } = await supabase
      .auth.admin.listUsers()
    
    console.log('👥 All users:', demoUser?.users?.map(u => ({ email: u.email, id: u.id })))
    
    const demoFirmaUser = demoUser?.users?.find(u => u.email === 'demo@firma.com')
    console.log('🎯 demo@firma.com user:', demoFirmaUser)
    
    if (demoFirmaUser) {
      // Check buildings for demo@firma.com
      const { data: demoBuildings, error: demoBuildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('user_id', demoFirmaUser.id)
      
      console.log('🏢 Buildings for demo@firma.com:', { demoBuildings, demoBuildingsError })
      
      if (demoBuildings && demoBuildings.length > 0) {
        const buildingIds = demoBuildings.map(b => b.id)
        
        // Check apartments in those buildings
        const { data: demoApartments, error: demoApartmentsError } = await supabase
          .from('apartments')
          .select('*')
          .in('building_id', buildingIds)
        
        console.log('🏠 Apartments in demo buildings:', { demoApartments, demoApartmentsError })
        
        if (demoApartments && demoApartments.length > 0) {
          const apartmentIds = demoApartments.map(a => a.id)
          
          // Check tenants in those apartments
          const { data: demoTenants, error: demoTenantsError } = await supabase
            .from('apartment_tenants')
            .select('*')
            .in('apartment_id', apartmentIds)
          
          console.log('👥 Tenants in demo apartments:', { demoTenants, demoTenantsError })
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugTenantsView()