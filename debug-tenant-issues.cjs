const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugTenantIssues() {
  try {
    console.log('🔍 Debugging tenant issues for demo@stanar.com...')
    console.log('=======================================================')

    // 1. Pronađi demo@stanar.com korisnika
    console.log('\n1. Pronalaženje demo@stanar.com korisnika...')
    const { data: allUsers, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Greška pri dohvatanju korisnika:', userError.message)
      return
    }

    const tenantUser = allUsers.users.find(u => u.email === 'demo@stanar.com')
    if (!tenantUser) {
      console.error('❌ demo@stanar.com korisnik nije pronađen')
      return
    }

    console.log('✅ demo@stanar.com pronađen:', {
      id: tenantUser.id,
      email: tenantUser.email,
      role: tenantUser.user_metadata?.role
    })

    // 2. Pronađi sve kvarove koje je prijavio ovaj korisnik
    console.log('\n2. Pronalaženje svih kvarova koje je prijavio demo@stanar.com...')
    const { data: userIssues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        category,
        created_at,
        user_id,
        apartment_id
      `)
      .eq('user_id', tenantUser.id)
      .order('created_at', { ascending: false })

    if (issuesError) {
      console.error('❌ Greška pri dohvatanju kvarova:', issuesError.message)
      return
    }

    console.log(`✅ Pronađeno ${userIssues?.length || 0} kvarova prijavljenih od strane demo@stanar.com`)

    if (!userIssues || userIssues.length === 0) {
      console.log('❌ Nema kvarova za ovog korisnika')
      return
    }

    // 3. Prikaži sve kvarove
    console.log('\n📋 SVI KVAROVI PRIJAVLJENI OD STRANE demo@stanar.com:')
    userIssues.forEach((issue, index) => {
      console.log(`\n   ${index + 1}. "${issue.title}"`)
      console.log(`      ID: ${issue.id}`)
      console.log(`      Status: ${issue.status}`)
      console.log(`      Priority: ${issue.priority}`)
      console.log(`      Category: ${issue.category}`)
      console.log(`      Apartment ID: ${issue.apartment_id}`)
      console.log(`      Created: ${issue.created_at}`)
    })

    // 4. Specifično traži "Curenje vode u kupatilu" i "pukla pločica"
    console.log('\n4. Tražim specifične kvarove...')
    const curenjeKvar = userIssues.find(issue => 
      issue.title.toLowerCase().includes('curenje') || 
      issue.title.toLowerCase().includes('vode')
    )
    
    const plocikaKvar = userIssues.find(issue => 
      issue.title.toLowerCase().includes('pločica') || 
      issue.title.toLowerCase().includes('pukla')
    )

    console.log('\n🔍 SPECIFIČNI KVAROVI:')
    
    if (curenjeKvar) {
      console.log('\n✅ PRONAĐEN "Curenje vode" kvar:')
      console.log(`   ID: ${curenjeKvar.id}`)
      console.log(`   Title: ${curenjeKvar.title}`)
      console.log(`   Apartment ID: ${curenjeKvar.apartment_id}`)
      console.log(`   Status: ${curenjeKvar.status}`)
    } else {
      console.log('\n❌ NIJE PRONAĐEN "Curenje vode" kvar')
    }

    if (plocikaKvar) {
      console.log('\n✅ PRONAĐEN "Pukla pločica" kvar:')
      console.log(`   ID: ${plocikaKvar.id}`)
      console.log(`   Title: ${plocikaKvar.title}`)
      console.log(`   Apartment ID: ${plocikaKvar.apartment_id}`)
      console.log(`   Status: ${plocikaKvar.status}`)
    } else {
      console.log('\n❌ NIJE PRONAĐEN "Pukla pločica" kvar')
    }

    // 5. Proverava apartment asocijacije za svaki kvar
    console.log('\n5. Proverava apartment asocijacije...')
    
    for (const issue of userIssues) {
      console.log(`\n🏠 Kvar: "${issue.title}" (ID: ${issue.id})`)
      
      if (!issue.apartment_id) {
        console.log('   ❌ NEMA APARTMENT_ID!')
        continue
      }

      // Dohvati apartment podatke
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .select(`
          id,
          apartment_number,
          floor,
          building_id,
          building:buildings (
            id,
            name,
            address,
            user_id
          )
        `)
        .eq('id', issue.apartment_id)
        .single()

      if (apartmentError) {
        console.log(`   ❌ Greška pri dohvatanju apartment podataka: ${apartmentError.message}`)
        continue
      }

      if (!apartment) {
        console.log('   ❌ APARTMENT NE POSTOJI!')
        continue
      }

      console.log(`   ✅ Apartment: ${apartment.apartment_number}`)
      console.log(`   ✅ Floor: ${apartment.floor}`)
      console.log(`   ✅ Building ID: ${apartment.building_id}`)
      
      if (apartment.building) {
        console.log(`   ✅ Building: ${apartment.building.name}`)
        console.log(`   ✅ Address: ${apartment.building.address}`)
        console.log(`   ✅ Building Owner ID: ${apartment.building.user_id}`)
      } else {
        console.log('   ❌ BUILDING PODACI NISU DOSTUPNI!')
      }
    }

    // 6. Proverava da li postoji demo@firma.com i njegove zgrade
    console.log('\n6. Proverava demo@firma.com i njegove zgrade...')
    const companyUser = allUsers.users.find(u => u.email === 'demo@firma.com')
    
    if (!companyUser) {
      console.log('❌ demo@firma.com ne postoji!')
      return
    }

    console.log(`✅ demo@firma.com pronađen: ${companyUser.id}`)

    const { data: companyBuildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('user_id', companyUser.id)

    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada firme:', buildingsError.message)
      return
    }

    console.log(`✅ demo@firma.com ima ${companyBuildings?.length || 0} zgrada:`)
    companyBuildings?.forEach(building => {
      console.log(`   - ${building.name} (ID: ${building.id})`)
    })

    // 7. Proverava da li su kvarovi povezani sa zgradama firme
    console.log('\n7. Proverava povezanost kvarova sa zgradama firme...')
    const companyBuildingIds = companyBuildings?.map(b => b.id) || []
    
    for (const issue of userIssues) {
      console.log(`\n🔗 Kvar: "${issue.title}"`)
      
      if (!issue.apartment_id) {
        console.log('   ❌ Nema apartment_id - NEĆE SE PRIKAZATI U DASHBOARD-U!')
        continue
      }

      const { data: apartment } = await supabase
        .from('apartments')
        .select('building_id')
        .eq('id', issue.apartment_id)
        .single()

      if (!apartment) {
        console.log('   ❌ Apartment ne postoji - NEĆE SE PRIKAZATI U DASHBOARD-U!')
        continue
      }

      const isConnectedToCompany = companyBuildingIds.includes(apartment.building_id)
      
      if (isConnectedToCompany) {
        console.log('   ✅ POVEZAN SA FIRMOM - TREBAO BI SE PRIKAZATI U DASHBOARD-U!')
      } else {
        console.log('   ❌ NIJE POVEZAN SA FIRMOM - NEĆE SE PRIKAZATI U DASHBOARD-U!')
      }
    }

    console.log('\n=== ZAVRŠENO ===')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugTenantIssues()