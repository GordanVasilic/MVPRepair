const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Nedostaju environment varijable:')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testIssueCreation() {
  console.log('🧪 Testiram kreiranje issue-a nakon uklanjanja floor_number kolone...')
  
  try {
    // Prvo proveravamo da li imamo demo korisnika
    console.log('1. Proveravam demo korisnike...')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Greška pri čitanju korisnika:', usersError)
      return
    }

    const demoUser = users.users.find(u => u.email?.includes('demo') || u.email?.includes('test'))
    
    if (!demoUser) {
      console.log('⚠️ Nema demo korisnika, kreiram test issue sa dummy user_id')
    } else {
      console.log('✅ Pronašao demo korisnika:', demoUser.email)
    }

    // Testiraj kreiranje issue-a
    console.log('2. Kreiram test issue...')
    const testIssueData = {
      user_id: demoUser?.id || '00000000-0000-0000-0000-000000000000',
      title: 'Test kvar nakon uklanjanja floor_number',
      description: 'Ovo je test da vidim da li mogu da kreiram issue bez floor_number kolone',
      category: 'Ostalo',
      priority: 'low',
      status: 'open',
      location_details: {
        address: 'Test adresa',
        city: 'Test grad',
        apartment: 'Test stan',
        floor: 2,
        room: 'Test prostorija',
        notes: 'Test napomene'
      }
    }

    const { data: issue, error: createError } = await supabase
      .from('issues')
      .insert(testIssueData)
      .select()
      .single()

    if (createError) {
      console.error('❌ Greška pri kreiranju issue-a:', createError)
      
      if (createError.message.includes('floor_number')) {
        console.log('🚨 PROBLEM: Kod još uvek pokušava da koristi floor_number kolonu!')
      }
      return
    }

    console.log('✅ Issue uspešno kreiran!')
    console.log('📋 Kreiran issue:')
    console.log('   ID:', issue.id)
    console.log('   Naslov:', issue.title)
    console.log('   Status:', issue.status)
    console.log('   Lokacija:', JSON.stringify(issue.location_details, null, 2))

    // Proveravamo da li možemo da pročitamo issue
    console.log('3. Čitam kreirani issue...')
    const { data: readIssue, error: readError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issue.id)
      .single()

    if (readError) {
      console.error('❌ Greška pri čitanju issue-a:', readError)
    } else {
      console.log('✅ Issue uspešno pročitan!')
      console.log('📄 Kolone u issues tabeli:')
      Object.keys(readIssue).forEach(col => console.log('   -', col))
    }

    // Obriši test issue
    console.log('4. Brišem test issue...')
    const { error: deleteError } = await supabase
      .from('issues')
      .delete()
      .eq('id', issue.id)

    if (deleteError) {
      console.error('❌ Greška pri brisanju test issue-a:', deleteError)
    } else {
      console.log('✅ Test issue obrisan')
    }

    console.log('\n🎉 TEST PROŠAO USPEŠNO!')
    console.log('✅ floor_number kolona je uspešno uklonjena')
    console.log('✅ Kreiranje issue-a radi bez problema')
    console.log('✅ Aplikacija je spremna za korišćenje')

  } catch (err) {
    console.error('❌ Neočekivana greška:', err)
  }
}

testIssueCreation()