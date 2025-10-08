const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugPlociceIssue() {
  console.log('🔍 DEBUG: Analiza problema sa kvarom "Pločice"\n')
  
  try {
    // 1. Pronađi najnoviji kvar "Pločice"
    console.log('1️⃣ Tražim najnoviji kvar "Pločice"...')
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .ilike('title', '%pločice%')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (issuesError) {
      console.error('❌ Greška pri dohvatanju kvarova:', issuesError)
      return
    }
    
    if (!issues || issues.length === 0) {
      console.log('❌ Nema kvarova sa nazivom "Pločice"')
      return
    }
    
    console.log(`✅ Pronađeno ${issues.length} kvarova sa "Pločice":`)
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ID: ${issue.id}, Title: ${issue.title}`)
      console.log(`      Created: ${issue.created_at}`)
      console.log(`      Apartment ID: ${issue.apartment_id}`)
      console.log(`      Building ID: ${issue.building_id}`)
      console.log(`      Company ID: ${issue.company_id}`)
      console.log(`      Location Details Type: ${typeof issue.location_details}`)
      console.log(`      Location Details: ${issue.location_details}`)
      console.log('')
    })
    
    const latestIssue = issues[0]
    console.log(`🎯 Analiziram najnoviji kvar: ${latestIssue.title} (ID: ${latestIssue.id})\n`)
    
    // 2. Proverava apartment_id
    console.log('2️⃣ Proveravam apartment_id...')
    if (!latestIssue.apartment_id) {
      console.log('❌ PROBLEM: Kvar nema apartment_id!')
    } else {
      console.log(`✅ Apartment ID: ${latestIssue.apartment_id}`)
      
      // Proverava da li apartment postoji
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', latestIssue.apartment_id)
        .single()
      
      if (apartmentError || !apartment) {
        console.log(`❌ PROBLEM: Apartment sa ID ${latestIssue.apartment_id} ne postoji!`)
        console.log('   Error:', apartmentError)
      } else {
        console.log(`✅ Apartment pronađen:`)
        console.log(`   Building ID: ${apartment.building_id}`)
        console.log(`   Apartment Number: ${apartment.apartment_number}`)
        console.log(`   Floor: ${apartment.floor_number}`)
      }
    }
    
    // 3. Proverava building_id i company povezanost
    console.log('\n3️⃣ Proveravam building_id i company povezanost...')
    let buildingId = latestIssue.building_id
    
    // Pokušaj da parsiraš location_details ako je string
    if (!buildingId && latestIssue.location_details) {
      try {
        const locationDetails = typeof latestIssue.location_details === 'string' 
          ? JSON.parse(latestIssue.location_details) 
          : latestIssue.location_details
        buildingId = locationDetails.building_id
      } catch (error) {
        console.log('❌ Greška pri parsiranju location_details:', error.message)
        console.log('   Raw location_details:', latestIssue.location_details)
      }
    }
    
    if (!buildingId) {
      console.log('❌ PROBLEM: Kvar nema building_id!')
    } else {
      console.log(`✅ Building ID: ${buildingId}`)
      
      // Proverava building
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single()
      
      if (buildingError || !building) {
        console.log(`❌ PROBLEM: Building sa ID ${buildingId} ne postoji!`)
        console.log('   Error:', buildingError)
      } else {
        console.log(`✅ Building pronađen:`)
        console.log(`   Address: ${building.address}`)
        console.log(`   City: ${building.city}`)
        console.log(`   Company ID: ${building.company_id}`)
        
        if (building.company_id !== latestIssue.company_id) {
          console.log(`❌ PROBLEM: Building company_id (${building.company_id}) != Issue company_id (${latestIssue.company_id})`)
        }
      }
    }
    
    // 4. Proverava company_id
    console.log('\n4️⃣ Proveravam company_id...')
    if (!latestIssue.company_id) {
      console.log('❌ PROBLEM: Kvar nema company_id!')
    } else {
      console.log(`✅ Company ID: ${latestIssue.company_id}`)
      
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', latestIssue.company_id)
        .single()
      
      if (companyError || !company) {
        console.log(`❌ PROBLEM: Company sa ID ${latestIssue.company_id} ne postoji!`)
        console.log('   Error:', companyError)
      } else {
        console.log(`✅ Company pronađena: ${company.name}`)
      }
    }
    
    // 5. Simulira AdminDashboard query
    console.log('\n5️⃣ Simuliram AdminDashboard query...')
    const { data: dashboardIssues, error: dashboardError } = await supabase
      .from('issues')
      .select(`
        *,
        apartments (
          id,
          apartment_number,
          floor_number,
          buildings (
            id,
            address,
            city,
            company_id
          )
        )
      `)
      .eq('company_id', latestIssue.company_id)
      .order('created_at', { ascending: false })
    
    if (dashboardError) {
      console.log('❌ PROBLEM: AdminDashboard query failed!')
      console.log('   Error:', dashboardError)
    } else {
      console.log(`✅ AdminDashboard query uspešan, pronađeno ${dashboardIssues.length} kvarova`)
      
      const plociceInDashboard = dashboardIssues.find(issue => 
        issue.title.toLowerCase().includes('pločice') || 
        issue.title.toLowerCase().includes('ploce')
      )
      
      if (plociceInDashboard) {
        console.log('✅ Kvar "Pločice" se NALAZI u AdminDashboard rezultatima!')
        console.log(`   Issue ID: ${plociceInDashboard.id}`)
        console.log(`   Apartment data: ${JSON.stringify(plociceInDashboard.apartments)}`)
      } else {
        console.log('❌ PROBLEM: Kvar "Pločice" se NE NALAZI u AdminDashboard rezultatima!')
        console.log('   Mogući uzroci:')
        console.log('   - company_id ne odgovara')
        console.log('   - apartment_id ne postoji ili nije povezan sa building-om')
        console.log('   - RLS policy blokira pristup')
      }
    }
    
    // 6. Proverava RLS policies
    console.log('\n6️⃣ Proveravam RLS policies za issues tabelu...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'issues')
    
    if (policiesError) {
      console.log('❌ Ne mogu da dohvatim RLS policies:', policiesError)
    } else {
      console.log(`✅ Pronađeno ${policies.length} RLS policies za issues tabelu:`)
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`)
      })
    }
    
    // 7. Finalni zaključak
    console.log('\n🎯 FINALNI ZAKLJUČAK:')
    console.log('=====================================')
    
    if (!latestIssue.apartment_id) {
      console.log('❌ GLAVNI PROBLEM: Kvar nema apartment_id!')
      console.log('   Rešenje: Proveriti ReportIssue.tsx logiku za setovanje apartment_id')
    } else if (!latestIssue.company_id) {
      console.log('❌ GLAVNI PROBLEM: Kvar nema company_id!')
      console.log('   Rešenje: Proveriti kako se company_id postavlja pri kreiranju kvara')
    } else {
      console.log('✅ Osnovni podaci su OK, možda je problem u RLS policies ili query logici')
    }
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

// Pokreni debug
debugPlociceIssue()