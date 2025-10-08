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

async function removeFloorNumberColumn() {
  console.log('🔧 Pokušavam da uklonim floor_number kolonu direktno...')
  
  try {
    // Prvo proveravamo da li kolona postoji
    console.log('1. Proveravam da li floor_number kolona postoji...')
    const { data: testData, error: testError } = await supabase
      .from('issues')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Greška pri čitanju issues tabele:', testError)
      return
    }

    if (testData && testData.length > 0) {
      const columns = Object.keys(testData[0])
      console.log('📋 Trenutne kolone u issues tabeli:')
      columns.forEach(col => console.log('  -', col))
      
      if (!columns.includes('floor_number')) {
        console.log('✅ floor_number kolona već ne postoji!')
        return
      }
    }

    // Pokušajmo da kreiramo test issue bez floor_number
    console.log('2. Testiram kreiranje issue-a bez floor_number...')
    const { data: testIssue, error: createError } = await supabase
      .from('issues')
      .insert({
        title: 'Test issue - bez floor_number',
        description: 'Test da vidim da li mogu da kreiram issue bez floor_number kolone',
        category: 'Ostalo',
        priority: 'low',
        status: 'open',
        user_id: '00000000-0000-0000-0000-000000000000', // dummy user id
        location_details: {
          test: true
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Greška pri kreiranju test issue-a:', createError)
      
      if (createError.message.includes('floor_number')) {
        console.log('🔍 Kolona floor_number još uvek postoji i pravi probleme')
        console.log('💡 Potrebno je da se kolona ukloni iz baze podataka')
        console.log('📝 Možete pokušati sa SQL komandom direktno u Supabase dashboard-u:')
        console.log('   ALTER TABLE issues DROP COLUMN IF EXISTS floor_number;')
      }
    } else {
      console.log('✅ Test issue kreiran uspešno!')
      console.log('🧹 Brišem test issue...')
      
      // Obriši test issue
      await supabase
        .from('issues')
        .delete()
        .eq('id', testIssue.id)
      
      console.log('✅ Test završen uspešno - floor_number kolona ne pravi probleme')
    }

  } catch (err) {
    console.error('❌ Neočekivana greška:', err)
  }
}

removeFloorNumberColumn()