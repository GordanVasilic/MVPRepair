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

async function fixRLSPolicies() {
  console.log('🔧 Popravljam RLS politike za building_tenants tabelu...')
  
  try {
    // Prvo testiraj pristup sa admin klijentom
    console.log('🔍 Testiram admin pristup...')
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .limit(5)

    if (adminError) {
      console.error('❌ Admin pristup neuspešan:', adminError.message)
      return
    }

    console.log(`✅ Admin pristup uspešan - pronađeno ${adminData?.length || 0} zapisa`)
    
    if (adminData && adminData.length > 0) {
      console.log('📋 Primer zapisa:')
      adminData.forEach((record, index) => {
        console.log(`   ${index + 1}. Tenant: ${record.tenant_id}, Building: ${record.building_id}, Status: ${record.status}`)
      })
    }

    // Testiraj pristup kao demo@stanar.com
    console.log('\n🔍 Testiram pristup kao demo@stanar.com...')
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
    console.log('👤 User ID:', authData.user.id)

    // Testiraj pristup building_tenants sa RLS
    const { data: userBuildingTenants, error: userError } = await supabaseUser
      .from('building_tenants')
      .select(`
        id,
        building_id,
        apartment_number,
        floor_number,
        status,
        buildings!inner(
          id,
          name,
          address
        )
      `)
      .eq('tenant_id', authData.user.id)
      .eq('status', 'active')

    if (userError) {
      console.error('❌ Korisničko dohvatanje neuspešno:', userError.message)
      
      // Pokušaj da popraviš RLS politike
      console.log('\n🔧 Pokušavam da popravim RLS politike...')
      
      // Odjavi korisnika pre admin operacija
      await supabaseUser.auth.signOut()
      
      // Kreiraj ili ažuriraj RLS politike
      const createPolicySQL = `
        -- Obriši postojeće politike
        DROP POLICY IF EXISTS "Tenants can view their own records" ON building_tenants;
        DROP POLICY IF EXISTS "Company owners can view their building tenants" ON building_tenants;
        DROP POLICY IF EXISTS "Company owners can manage their building tenants" ON building_tenants;
        
        -- Kreiraj nove politike
        CREATE POLICY "Tenants can view their own records" ON building_tenants
          FOR SELECT USING (tenant_id = auth.uid());
          
        CREATE POLICY "Company owners can view their building tenants" ON building_tenants
          FOR SELECT USING (
            building_id IN (
              SELECT id FROM buildings WHERE user_id = auth.uid()
            )
          );
          
        CREATE POLICY "Company owners can manage their building tenants" ON building_tenants
          FOR ALL USING (
            building_id IN (
              SELECT id FROM buildings WHERE user_id = auth.uid()
            )
          );
      `
      
      // Pokušaj direktno sa SQL komandom preko HTTP API-ja
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          sql: createPolicySQL
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HTTP greška pri kreiranju politika:', response.status, errorText)
      } else {
        console.log('✅ RLS politike uspešno ažurirane')
        
        // Testiraj ponovo
        console.log('\n🔍 Testiram ponovo nakon ažuriranja politika...')
        
        // Autentifikuj se ponovo
        const { data: authData2, error: authError2 } = await supabaseUser.auth.signInWithPassword({
          email: 'demo@stanar.com',
          password: 'demo123'
        })

        if (authError2) {
          console.error('❌ Ponovna autentifikacija neuspešna:', authError2.message)
          return
        }

        // Testiraj pristup ponovo
        const { data: userBuildingTenants2, error: userError2 } = await supabaseUser
          .from('building_tenants')
          .select(`
            id,
            building_id,
            apartment_number,
            floor_number,
            status,
            buildings!inner(
              id,
              name,
              address
            )
          `)
          .eq('tenant_id', authData2.user.id)
          .eq('status', 'active')

        if (userError2) {
          console.error('❌ Ponovno dohvatanje neuspešno:', userError2.message)
        } else {
          console.log(`✅ Ponovno dohvatanje uspešno - pronađeno ${userBuildingTenants2?.length || 0} zapisa`)
          if (userBuildingTenants2 && userBuildingTenants2.length > 0) {
            userBuildingTenants2.forEach((bt, index) => {
              console.log(`   ${index + 1}. Building: ${bt.buildings.name}, Apartment: ${bt.apartment_number}`)
            })
          }
        }
      }
      
    } else {
      console.log(`✅ Korisničko dohvatanje uspešno - pronađeno ${userBuildingTenants?.length || 0} zapisa`)
      if (userBuildingTenants && userBuildingTenants.length > 0) {
        userBuildingTenants.forEach((bt, index) => {
          console.log(`   ${index + 1}. Building: ${bt.buildings.name}, Apartment: ${bt.apartment_number}`)
        })
      }
    }

    // Odjavi korisnika
    await supabaseUser.auth.signOut()

  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

fixRLSPolicies()