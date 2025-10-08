const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hszbpaoqoijzkileutnu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzemJwYW9xb2lqemtpbGV1dG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2NDE2NSwiZXhwIjoyMDc0ODQwMTY1fQ.VWKTgCeK4TfWZEm6n3elmEBlz-X1ieumPk0QXN-uN5E'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugIssuesBuildings() {
  console.log('🔍 Debugging issues and buildings connection...')
  console.log('=================================================')
  
  try {
    // 1. Prvo proveravamo demo@firma.com korisnika
    console.log('\n1. Proveravamo demo@firma.com korisnika:')
    const { data: companyUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'demo@firma.com')
      .single()
    
    if (userError || !companyUser) {
      console.log('❌ Greška pri pronalaženju korisnika:', userError)
      return
    }
    
    console.log('✅ Korisnik pronađen:', {
      id: companyUser.id,
      email: companyUser.email,
      name: companyUser.name
    })
    
    // 2. Proveravamo zgrade koje poseduje
    console.log('\n2. Proveravamo zgrade koje poseduje:')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', companyUser.id)
    
    if (buildingsError) {
      console.log('❌ Greška pri pronalaženju zgrada:', buildingsError)
      return
    }
    
    console.log(`✅ Pronađeno ${buildings?.length || 0} zgrada:`)
    buildings?.forEach(building => {
      console.log(`  - ID: ${building.id}, Naziv: ${building.name}`)
    })
    
    if (!buildings || buildings.length === 0) {
      console.log('❌ Nema zgrada za ovog korisnika')
      return
    }
    
    const buildingIds = buildings.map(b => b.id)
    
    // 3. Proveravamo stanove u tim zgradama
    console.log('\n3. Proveravamo stanove u zgradama:')
    const { data: apartments, error: apartmentsError } = await supabase
      .from('apartments')
      .select('*')
      .in('building_id', buildingIds)
    
    if (apartmentsError) {
      console.log('❌ Greška pri pronalaženju stanova:', apartmentsError)
    } else {
      console.log(`✅ Pronađeno ${apartments?.length || 0} stanova:`)
      apartments?.forEach(apt => {
        console.log(`  - ID: ${apt.id}, Zgrada: ${apt.building_id}, Stan: ${apt.apartment_number}`)
      })
    }
    
    // 4. Proveravamo sve kvarove povezane sa tim stanovima
    console.log('\n4. Proveravamo kvarove povezane sa stanovima:')
    const { data: issuesViaApartments, error: issuesError1 } = await supabase
      .from('issues')
      .select(`
        id,
        title,
        status,
        apartment_id,
        apartments!inner (
          id,
          building_id,
          apartment_number
        )
      `)
      .in('apartments.building_id', buildingIds)
    
    if (issuesError1) {
      console.log('❌ Greška pri pronalaženju kvarova preko stanova:', issuesError1)
    } else {
      console.log(`✅ Pronađeno ${issuesViaApartments?.length || 0} kvarova preko stanova:`)
      issuesViaApartments?.forEach(issue => {
        const apartment = Array.isArray(issue.apartments) ? issue.apartments[0] : issue.apartments
        console.log(`  - Kvar ID: ${issue.id}, Naslov: ${issue.title}, Status: ${issue.status}`)
        console.log(`    Stan ID: ${issue.apartment_id}, Zgrada ID: ${apartment?.building_id}, Stan: ${apartment?.apartment_number}`)
      })
    }
    
    // 5. Proveravamo da li postoje kvarovi sa direktnim building_id
    console.log('\n5. Proveravamo kvarove sa direktnim building_id:')
    const { data: issuesDirectBuilding, error: issuesError2 } = await supabase
      .from('issues')
      .select('id, title, status, building_id, apartment_id')
      .in('building_id', buildingIds)
    
    if (issuesError2) {
      console.log('❌ Greška pri pronalaženju kvarova sa direktnim building_id:', issuesError2)
    } else {
      console.log(`✅ Pronađeno ${issuesDirectBuilding?.length || 0} kvarova sa direktnim building_id:`)
      issuesDirectBuilding?.forEach(issue => {
        console.log(`  - Kvar ID: ${issue.id}, Naslov: ${issue.title}, Status: ${issue.status}`)
        console.log(`    Building ID: ${issue.building_id}, Apartment ID: ${issue.apartment_id}`)
      })
    }
    
    // 6. Proveravamo SVE kvarove u bazi
    console.log('\n6. Proveravamo SVE kvarove u bazi:')
    const { data: allIssues, error: allIssuesError } = await supabase
      .from('issues')
      .select(`
        id,
        title,
        status,
        apartment_id,
        building_id,
        apartments (
          id,
          building_id,
          apartment_number
        )
      `)
    
    if (allIssuesError) {
      console.log('❌ Greška pri pronalaženju svih kvarova:', allIssuesError)
    } else {
      console.log(`✅ Ukupno ${allIssues?.length || 0} kvarova u bazi:`)
      allIssues?.forEach(issue => {
        console.log(`  - Kvar ID: ${issue.id}, Naslov: ${issue.title}, Status: ${issue.status}`)
        console.log(`    Apartment ID: ${issue.apartment_id}, Building ID direktno: ${issue.building_id}`)
        if (issue.apartments) {
          console.log(`    Apartment info: Stan ${issue.apartments.apartment_number}, Zgrada ${issue.apartments.building_id}`)
        }
      })
    }
    
    console.log('\n=== ZAVRŠENO ===')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugIssuesBuildings()