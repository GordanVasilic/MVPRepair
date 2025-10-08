const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugAuthUID() {
  console.log('🔍 Debugujem auth.uid() problem...')
  
  try {
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Autentifikuj se kao demo@stanar.com
    const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
      email: 'demo@stanar.com',
      password: 'demo123'
    })

    if (authError) {
      console.error('❌ Autentifikacija neuspešna:', authError.message)
      return
    }

    console.log('✅ Uspešno autentifikovan kao demo@stanar.com')
    console.log('👤 User ID iz auth objekta:', authData.user.id)
    console.log('🔑 Access token postoji:', !!authData.session?.access_token)

    // Testiraj auth.uid() funkciju direktno
    console.log('\n🔍 Testiram auth.uid() funkciju...')
    
    // Pokušaj sa jednostavnim SELECT-om koji koristi auth.uid()
    const { data: authUidTest, error: authUidError } = await supabaseUser
      .from('building_tenants')
      .select('tenant_id, auth.uid() as current_uid')
      .limit(1)

    if (authUidError) {
      console.log('❌ auth.uid() test neuspešan:', authUidError.message)
    } else {
      console.log('✅ auth.uid() test rezultat:', authUidTest)
    }

    // Testiraj bez RLS - direktno dohvatanje svih zapisa za ovog korisnika
    console.log('\n🔍 Testiram direktno dohvatanje bez RLS filtera...')
    const { data: allRecords, error: allError } = await supabaseUser
      .from('building_tenants')
      .select('*')
      .eq('tenant_id', authData.user.id)

    if (allError) {
      console.log('❌ Direktno dohvatanje neuspešno:', allError.message)
    } else {
      console.log(`✅ Direktno dohvatanje uspešno - pronađeno ${allRecords?.length || 0} zapisa`)
      if (allRecords && allRecords.length > 0) {
        allRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. ID: ${record.id}, Tenant: ${record.tenant_id}, Building: ${record.building_id}`)
        })
      }
    }

    // Testiraj sa eksplicitnim WHERE uslovom
    console.log('\n🔍 Testiram sa eksplicitnim WHERE tenant_id = current_user_id...')
    const { data: explicitRecords, error: explicitError } = await supabaseUser
      .from('building_tenants')
      .select('*')
      .eq('tenant_id', authData.user.id)
      .eq('status', 'active')

    if (explicitError) {
      console.log('❌ Eksplicitno dohvatanje neuspešno:', explicitError.message)
    } else {
      console.log(`✅ Eksplicitno dohvatanje uspešno - pronađeno ${explicitRecords?.length || 0} zapisa`)
    }

    // Odjavi korisnika
    await supabaseUser.auth.signOut()

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

debugAuthUID()