const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Nedostaju environment varijable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkApartmentTenantsConnection() {
  console.log('🔍 Proverava apartment_tenants konekciju...')
  
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

    // 2. Proveri apartment_tenants tabelu
    const { data: apartmentTenants, error: atError } = await supabase
      .from('apartment_tenants')
      .select('*')
      .eq('company_id', companyUser.id)

    if (atError) {
      console.error('❌ Greška pri čitanju apartment_tenants:', atError)
      return
    }

    console.log('📋 apartment_tenants za demo@firma.com:', apartmentTenants?.length || 0)
    if (apartmentTenants && apartmentTenants.length > 0) {
      apartmentTenants.forEach(at => {
        console.log(`  - Apartment: ${at.apartment_id}, Tenant: ${at.tenant_id}`)
      })
    }

    // 3. Proveri kvarove kroz apartment_tenants
    const { data: issuesViaApartmentTenants, error: issuesError } = await supabase
      .from('issues')
      .select(`
        *,
        apartment:apartments!inner (
          id,
          apartment_number,
          apartment_tenants!inner (
            company_id
          )
        )
      `)
      .eq('apartment.apartment_tenants.company_id', companyUser.id)

    if (issuesError) {
      console.error('❌ Greška pri čitanju kvarova kroz apartment_tenants:', issuesError)
    } else {
      console.log('📊 Kvarovi kroz apartment_tenants:', issuesViaApartmentTenants?.length || 0)
    }

    // 4. Alternativno - proveri kvarove kroz buildings
    const { data: issuesViaBuildings, error: buildingsError } = await supabase
      .from('issues')
      .select(`
        *,
        apartment:apartments!inner (
          id,
          apartment_number,
          building:buildings!inner (
            id,
            name,
            user_id
          )
        )
      `)
      .eq('apartment.building.user_id', companyUser.id)

    if (buildingsError) {
      console.error('❌ Greška pri čitanju kvarova kroz buildings:', buildingsError)
    } else {
      console.log('📊 Kvarovi kroz buildings:', issuesViaBuildings?.length || 0)
    }

    // 5. Proveri sve apartmane kompanije
    const { data: companyApartments, error: apartmentsError } = await supabase
      .from('apartments')
      .select(`
        id,
        apartment_number,
        building:buildings!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('building.user_id', companyUser.id)

    if (apartmentsError) {
      console.error('❌ Greška pri čitanju apartmana:', apartmentsError)
    } else {
      console.log('🏠 Apartmani kompanije:', companyApartments?.length || 0)
      if (companyApartments && companyApartments.length > 0) {
        companyApartments.slice(0, 3).forEach(apt => {
          console.log(`  - ${apt.apartment_number} u zgradi ${apt.building.name}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

checkApartmentTenantsConnection()