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
  console.log('🔧 Uklanjam floor_number kolonu iz issues tabele...')
  
  try {
    // Drop the trigger and function first
    console.log('1. Uklanjam trigger i funkciju...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_set_issue_floor_number ON issues;
        DROP FUNCTION IF EXISTS set_issue_floor_number();
      `
    })

    if (triggerError) {
      console.error('❌ Greška pri uklanjanju trigger-a:', triggerError)
      // Nastavi dalje, možda trigger ne postoji
    } else {
      console.log('✅ Trigger i funkcija uklonjeni')
    }

    // Remove the floor_number column from issues table
    console.log('2. Uklanjam floor_number kolonu...')
    const { error: columnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE issues DROP COLUMN IF EXISTS floor_number;'
    })

    if (columnError) {
      console.error('❌ Greška pri uklanjanju kolone:', columnError)
      return
    }

    console.log('✅ floor_number kolona uspešno uklonjena')

    // Verify the column is gone
    console.log('3. Verifikujem da je kolona uklonjena...')
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Greška pri verifikaciji:', error)
      return
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log('📋 Trenutne kolone u issues tabeli:')
      columns.forEach(col => console.log('  -', col))
      
      if (columns.includes('floor_number')) {
        console.log('❌ floor_number kolona još uvek postoji!')
      } else {
        console.log('✅ floor_number kolona je uspešno uklonjena!')
      }
    }

  } catch (err) {
    console.error('❌ Neočekivana greška:', err)
  }
}

removeFloorNumberColumn()