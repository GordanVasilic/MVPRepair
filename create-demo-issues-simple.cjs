const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Nedostaju environment varijable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDemoIssues() {
  console.log('🔍 Kreiranje demo kvarova...')
  
  try {
    // 1. Pronađi demo@stanar.com korisnika
    const { data: tenantUser, error: tenantError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', 'demo@stanar.com')
      .single()

    if (tenantError || !tenantUser) {
      console.error('❌ Nije pronađen demo@stanar.com:', tenantError)
      return
    }

    console.log('✅ Pronađen demo@stanar.com:', tenantUser.id)

    // 2. Pronađi apartmane
    const { data: apartments, error: apartmentsError } = await supabase
      .from('apartments')
      .select('id, apartment_number, building_id')
      .limit(3)

    if (apartmentsError || !apartments || apartments.length === 0) {
      console.error('❌ Nisu pronađeni apartmani:', apartmentsError)
      return
    }

    console.log('✅ Pronađeno', apartments.length, 'apartmana')

    // 3. Kreiraj test kvarove
    const testIssues = [
      {
        user_id: tenantUser.id,
        apartment_id: apartments[0].id,
        title: 'Curenje vode u kupatilu',
        description: 'Voda curi iz slavine u kupatilu već nekoliko dana. Potrebna je hitna intervencija.',
        priority: 'high',
        status: 'open',
        category: 'plumbing'
      },
      {
        user_id: tenantUser.id,
        apartment_id: apartments[1] ? apartments[1].id : apartments[0].id,
        title: 'Pokvarena sijalica u hodniku',
        description: 'Sijalica u hodniku ne radi. Potrebna je zamena.',
        priority: 'medium',
        status: 'open',
        category: 'electrical'
      }
    ]

    for (let i = 0; i < testIssues.length; i++) {
      const issue = testIssues[i]
      console.log(`📝 Kreiram kvar ${i + 1}: ${issue.title}`)
      
      const { data, error } = await supabase
        .from('issues')
        .insert(issue)
        .select()

      if (error) {
        console.error(`❌ Greška pri kreiranju kvara ${i + 1}:`, error)
      } else {
        console.log(`✅ Kreiran kvar ${i + 1}:`, data[0].id)
      }
    }

    // 4. Proveri ukupan broj kvarova
    const { data: allIssues, error: allIssuesError } = await supabase
      .from('issues')
      .select('id, title, status')

    if (!allIssuesError && allIssues) {
      console.log(`\n📊 Ukupno kvarova u bazi: ${allIssues.length}`)
      allIssues.forEach(issue => {
        console.log(`  - ${issue.title} (${issue.status})`)
      })
    }

  } catch (error) {
    console.error('❌ Neočekivana greška:', error)
  }
}

createDemoIssues()