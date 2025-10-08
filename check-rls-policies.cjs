const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Kreiranje Supabase klijenta sa service role ključem za admin operacije
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkRLSPolicies() {
  console.log('🔒 Proveravam RLS politike za building_tenants tabelu...')
  
  try {
    // Proverava postojanje tabele direktno pokušajem pristupa
    console.log('🔍 Proveravam postojanje building_tenants tabele...')
    const { data: testData, error: testError } = await supabaseAdmin
      .from('building_tenants')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ building_tenants tabela ne postoji ili je nedostupna:', testError.message)
      return
    }

    console.log('✅ building_tenants tabela postoji i dostupna je')

    // Testiraj direktan pristup sa admin klijentom
    console.log('\n🔍 Testiram direktan pristup sa admin klijentom...')
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .limit(5)

    if (adminError) {
      console.error('❌ Greška pri admin pristupu:', adminError.message)
    } else {
      console.log(`✅ Admin pristup uspešan - pronađeno ${adminData?.length || 0} zapisa`)
    }

    // Testiraj pristup sa anon klijentom
    console.log('\n🔍 Testiram pristup sa anon klijentom...')
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    const { data: anonData, error: anonError } = await supabaseAnon
      .from('building_tenants')
      .select('*')
      .limit(5)

    if (anonError) {
      console.log('❌ Anon pristup blokiran (očekivano):', anonError.message)
    } else {
      console.log(`⚠️ Anon pristup dozvoljen - pronađeno ${anonData?.length || 0} zapisa`)
    }

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

checkRLSPolicies()