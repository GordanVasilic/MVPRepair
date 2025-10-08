const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugActiveIssues() {
  try {
    console.log('🔍 Debugging active issues count...')
    console.log('===========================================')

    // 1. Pronađi demo@firma.com korisnika
    console.log('\n1. Pronalaženje demo@firma.com korisnika...')
    const { data: companyUser, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Greška pri dohvatanju korisnika:', userError.message)
      return
    }

    const demoCompany = companyUser.users.find(u => u.email === 'demo@firma.com')
    if (!demoCompany) {
      console.error('❌ demo@firma.com korisnik nije pronađen')
      return
    }

    console.log('✅ demo@firma.com pronađen:', {
      id: demoCompany.id,
      email: demoCompany.email,
      role: demoCompany.user_metadata?.role
    })

    // 2. Pronađi zgrade koje poseduje
    console.log('\n2. Pronalaženje zgrada koje poseduje...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('user_id', demoCompany.id)

    if (buildingsError) {
      console.error('❌ Greška pri dohvatanju zgrada:', buildingsError.message)
      return
    }

    console.log(`✅ Pronađeno ${buildings?.length || 0} zgrada:`)
    buildings?.forEach(building => {
      console.log(`   - ${building.name} (ID: ${building.id})`)
    })

    if (!buildings || buildings.length === 0) {
      console.log('❌ Nema zgrada za ovog korisnika')
      return
    }

    const buildingIds = buildings.map(b => b.id)

    // 3. Pronađi sve kvarove za te zgrade
    console.log('\n3. Pronalaženje kvarova za te zgrade...')
    const { data: allIssues, error: issuesError } = await supabase
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
        apartment_id,
        apartments!inner (
          id,
          building_id,
          floor,
          apartment_number
        )
      `)
      .in('apartments.building_id', buildingIds)
      .order('created_at', { ascending: false })

    if (issuesError) {
      console.error('❌ Greška pri dohvatanju kvarova:', issuesError.message)
      return
    }

    console.log(`✅ Pronađeno ${allIssues?.length || 0} ukupno kvarova`)

    if (allIssues && allIssues.length > 0) {
      console.log('\n📋 Svi kvarovi:')
      allIssues.forEach(issue => {
        const apartment = Array.isArray(issue.apartments) ? issue.apartments[0] : issue.apartments
        console.log(`   - ${issue.title}`)
        console.log(`     Status: ${issue.status}`)
        console.log(`     Priority: ${issue.priority}`)
        console.log(`     Building ID: ${apartment?.building_id}`)
        console.log(`     Apartment: ${apartment?.apartment_number}`)
        console.log(`     Created: ${issue.created_at}`)
        console.log('')
      })

      // 4. Filtriraj aktivne kvarove
      console.log('4. Filtriranje aktivnih kvarova...')
      const activeIssues = allIssues.filter(issue => 
        issue.status !== 'closed' && issue.status !== 'resolved'
      )

      console.log(`✅ Aktivni kvarovi: ${activeIssues.length}`)
      
      if (activeIssues.length > 0) {
        console.log('\n🔥 Aktivni kvarovi:')
        activeIssues.forEach(issue => {
          console.log(`   - ${issue.title} (Status: ${issue.status})`)
        })
      }

      // 5. Statistike po statusu
      console.log('\n📊 Statistike po statusu:')
      const statusCounts = {}
      allIssues.forEach(issue => {
        statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1
      })

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`)
      })

      console.log('\n🎯 REZULTAT:')
      console.log(`   - Ukupno kvarova: ${allIssues.length}`)
      console.log(`   - Aktivni kvarovi: ${activeIssues.length}`)
      console.log(`   - Pending/Open: ${allIssues.filter(i => i.status === 'pending' || i.status === 'open').length}`)
      console.log(`   - In Progress: ${allIssues.filter(i => i.status === 'in_progress').length}`)
      console.log(`   - Resolved/Closed: ${allIssues.filter(i => i.status === 'closed' || i.status === 'resolved').length}`)
    }

    console.log('\n=== ZAVRŠENO ===')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

debugActiveIssues()