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

async function fixDuplicateTenants() {
  console.log('🔧 Popravljam duplikate u building_tenants tabeli...')
  console.log('=====================================================')
  
  try {
    // 1. Dohvati sve building_tenants zapise
    console.log('\n📋 1. Dohvatam sve building_tenants zapise...')
    const { data: allTenants, error: tenantsError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (tenantsError) {
      console.error('❌ Greška pri dohvatanju building_tenants:', tenantsError.message)
      return
    }
    
    console.log(`✅ Pronađeno ukupno ${allTenants?.length || 0} building_tenants zapisa`)
    
    // 2. Grupiši po tenant_id + building_id kombinaciji
    console.log('\n🔍 2. Analiziram duplikate...')
    const groupedTenants = {}
    
    allTenants?.forEach(tenant => {
      const key = `${tenant.tenant_id}_${tenant.building_id}`
      if (!groupedTenants[key]) {
        groupedTenants[key] = []
      }
      groupedTenants[key].push(tenant)
    })
    
    // 3. Pronađi duplikate
    const duplicates = Object.entries(groupedTenants).filter(([key, tenants]) => tenants.length > 1)
    
    console.log(`🎯 Pronađeno ${duplicates.length} grupa duplikata`)
    
    if (duplicates.length === 0) {
      console.log('✅ Nema duplikata u building_tenants tabeli!')
      return
    }
    
    // 4. Prikaži duplikate
    console.log('\n📊 Detalji duplikata:')
    let totalDuplicatesToRemove = 0
    
    for (const [key, tenants] of duplicates) {
      console.log(`\n🔸 Grupa: ${key}`)
      console.log(`   Broj zapisa: ${tenants.length}`)
      
      // Dohvati user info za tenant_id
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const tenantUser = users?.users?.find(u => u.id === tenants[0].tenant_id)
      
      console.log(`   Email: ${tenantUser?.email || 'Nepoznat'}`)
      console.log(`   Ime: ${tenantUser?.user_metadata?.name || tenantUser?.email?.split('@')[0] || 'Nepoznato'}`)
      
      tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ID: ${tenant.id}, Kreiran: ${tenant.created_at}, Apartman: ${tenant.apartment_number}`)
      })
      
      totalDuplicatesToRemove += tenants.length - 1
    }
    
    console.log(`\n🗑️ Ukupno zapisa za brisanje: ${totalDuplicatesToRemove}`)
    
    // 5. Posebno proveri demo@stanar.com
    console.log('\n🔍 5. Posebna provera za demo@stanar.com...')
    const { data: demoUsers } = await supabaseAdmin.auth.admin.listUsers()
    const demoTenant = demoUsers?.users?.find(u => u.email === 'demo@stanar.com')
    
    if (demoTenant) {
      const demoTenantRecords = allTenants?.filter(t => t.tenant_id === demoTenant.id) || []
      console.log(`   demo@stanar.com ima ${demoTenantRecords.length} zapisa u building_tenants`)
      
      if (demoTenantRecords.length > 1) {
        console.log('   ⚠️ demo@stanar.com ima duplikate!')
        demoTenantRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. Building: ${record.building_id}, Apartman: ${record.apartment_number}, Kreiran: ${record.created_at}`)
        })
      } else {
        console.log('   ✅ demo@stanar.com nema duplikate')
      }
    } else {
      console.log('   ❌ demo@stanar.com ne postoji u sistemu')
    }
    
    // 6. Ukloni duplikate (zadrži najnoviji)
    console.log('\n🗑️ 6. Uklanjam duplikate...')
    let removedCount = 0
    
    for (const [key, tenants] of duplicates) {
      // Sortiraj po created_at (najnoviji poslednji)
      const sortedTenants = tenants.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      // Ukloni sve osim poslednjeg (najnovijeg)
      const toRemove = sortedTenants.slice(0, -1)
      
      console.log(`\n🔸 Grupa ${key}:`)
      console.log(`   Zadržavam: ID ${sortedTenants[sortedTenants.length - 1].id} (najnoviji)`)
      console.log(`   Uklanjam: ${toRemove.length} starijih zapisa`)
      
      for (const tenant of toRemove) {
        const { error: deleteError } = await supabaseAdmin
          .from('building_tenants')
          .delete()
          .eq('id', tenant.id)
        
        if (deleteError) {
          console.error(`   ❌ Greška pri brisanju ${tenant.id}:`, deleteError.message)
        } else {
          console.log(`   ✅ Uklonjen zapis ${tenant.id}`)
          removedCount++
        }
      }
    }
    
    // 7. Finalna verifikacija
    console.log('\n✅ 7. Finalna verifikacija...')
    const { data: finalTenants, error: finalError } = await supabaseAdmin
      .from('building_tenants')
      .select('*')
    
    if (finalError) {
      console.error('❌ Greška pri finalnoj verifikaciji:', finalError.message)
    } else {
      console.log(`📊 Finalno stanje: ${finalTenants?.length || 0} zapisa u building_tenants tabeli`)
      
      // Proveri da li još uvek postoje duplikati
      const finalGrouped = {}
      finalTenants?.forEach(tenant => {
        const key = `${tenant.tenant_id}_${tenant.building_id}`
        if (!finalGrouped[key]) {
          finalGrouped[key] = []
        }
        finalGrouped[key].push(tenant)
      })
      
      const finalDuplicates = Object.entries(finalGrouped).filter(([key, tenants]) => tenants.length > 1)
      
      if (finalDuplicates.length === 0) {
        console.log('✅ Svi duplikati su uspešno uklonjeni!')
      } else {
        console.log(`⚠️ Još uvek postoji ${finalDuplicates.length} grupa duplikata`)
      }
    }
    
    console.log('\n🎉 ČIŠĆENJE ZAVRŠENO!')
    console.log(`✅ Uklonjeno ${removedCount} duplikata`)
    console.log('✅ Lista stanara sada treba da prikazuje jedinstvene korisnike')
    
  } catch (error) {
    console.error('❌ Neočekivana greška:', error.message)
  }
}

fixDuplicat