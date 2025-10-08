const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Nedostaju environment varijable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAdminIssuesQuery() {
  console.log('🔍 Testira AdminIssues query...')
  
  try {
    // 1. Pronađi demo@firma.com
    const { data: companyUser, error: companyError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', 'demo@firma.com')
      .single()

    if (companyError || !companyUser) {
      console.error('❌ Nije pronađen demo@firma.com:', companyError)
      return
    }

    console.log('✅ Pronađen demo@firma.com:', companyUser.id)

    // 2. Testiraj AdminIssues query - identičan kao u komponenti
    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        apartment:apartments!inner (
          id,
          apartment_number,
          floor,
          building_id,
          building:buildings!inner (
            id,
            name,
            user_id
          ),
          apartment_tenants!inner (
            invited_by
          )
        ),
        user_profiles (
          name,
          email
        )
      `)
      .eq('apartment.apartment_tenants.invited_by', companyUser.id)
      .order('created_at', { ascending: false })

    console.log('📊 AdminIssues query rezultat:')
    console.log('  - Error:', error)
    console.log('  - Data length:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('📋 Pronađeni kvarovi:')
      data.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.title} (${issue.status}) - Apartman: ${issue.apartment?.apartment_number}`)
      })
    } else {
      console.log('❌ Nema kvarova za demo@firma.com')
    }

    // 3. Alternativno - testiraj kroz buildings
    console.log('\n🔄 Testiram alternativni query kroz buildings...')
    const { data: altData, error: altError } = await supabase
      .from('issues')
      .select(`
        *,
        apartment:apartments!inner (
          id,
          apartment_number,
          floor,
          building_id,
          building:buildings!inner (
            id,
            name,
            user_id
          )
        ),
        user_profiles (
          name,
          email
        )
      `)
      .eq('apartment.building.user_id', companyUser.id)
      .order('created_at', { ascending: false })

    console.log('📊 Alternativni query rezultat:')
    console.log('  - Error:', altError)
    console.log('  - Data length:', altData?.length || 0)
    
    if (altData && altData.length > 0) {
      console.log('📋 Pronađeni kvarovi (alternativno):')
      altData.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.title} (${issue.status}) - Apartman: ${issue.apartment?.apartment_number}`)
      })
    }

  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

testAdminIssuesQuery()