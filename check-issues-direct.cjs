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

async function checkIssuesTable() {
  console.log('🔍 Proveravam issues tabelu direktno...')
  
  try {
    // Pokušajmo da pročitamo podatke iz issues tabele
    console.log('📋 Pokušavam da pročitam issues tabelu...')
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Greška pri čitanju issues tabele:', error)
      
      // Pokušajmo da vidimo koje tabele postoje
      console.log('\n🔍 Proveravam koje tabele postoje...')
      const { data: tablesData, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')

      if (tablesError) {
        console.error('❌ Greška pri čitanju tabela:', tablesError)
      } else {
        console.log('📋 Dostupne tabele:')
        tablesData.forEach(table => console.log('  -', table.tablename))
      }
      return
    }

    console.log('✅ Uspešno pročitana issues tabela')
    
    if (data && data.length > 0) {
      console.log('📄 Kolone u issues tabeli:')
      const columns = Object.keys(data[0])
      columns.forEach(col => console.log('  -', col))
      
      // Proveravamo da li postoji floor_number
      if (columns.includes('floor_number')) {
        console.log('✅ floor_number kolona POSTOJI')
      } else {
        console.log('❌ floor_number kolona NE POSTOJI')
      }
    } else {
      console.log('📄 Issues tabela je prazna, pokušavam da vidim strukturu drugačije...')
      
      // Pokušajmo da insertujemo test podatak da vidimo grešku
      const { error: insertError } = await supabase
        .from('issues')
        .insert({
          title: 'Test',
          description: 'Test description',
          status: 'open',
          floor_number: 1
        })

      if (insertError) {
        console.log('❌ Greška pri test insertu (očekivano):', insertError.message)
        if (insertError.message.includes('floor_number')) {
          console.log('❌ Potvrđeno: floor_number kolona ne postoji')
        }
      } else {
        console.log('✅ Test insert prošao - floor_number kolona postoji')
        // Obrisati test podatak
        await supabase.from('issues').delete().eq('title', 'Test')
      }
    }

  } catch (err) {
    console.error('❌ Neočekivana greška:', err)
  }
}

checkIssuesTable()