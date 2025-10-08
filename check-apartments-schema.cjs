const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 PROVERAVA APARTMENTS TABELU')
console.log('==============================')

async function checkApartmentsSchema() {
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Admin klijent kreiran')
    
    // Pokušaj da dohvatiš jedan red iz apartments tabele da vidiš kolone
    console.log('\n📋 Proverava apartments tabelu...')
    const { data: apartments, error: apartmentsError } = await adminClient
      .from('apartments')
      .select('*')
      .limit(1)
    
    if (apartmentsError) {
      console.error('❌ Greška pri dohvatanju apartments:', apartmentsError.message)
      
      // Pokušaj bez floor_number
      console.log('\n🔄 Pokušavam bez floor_number kolone...')
      const { data: apartmentsAlt, error: apartmentsAltError } = await adminClient
        .from('apartments')
        .select('id, building_id, apartment_number')
        .limit(5)
      
      if (apartmentsAltError) {
        console.error('❌ Greška i bez floor_number:', apartmentsAltError.message)
      } else {
        console.log('✅ Apartments tabela postoji, ali nema floor_number kolonu')
        console.log('📊 Primer apartmana:', apartmentsAlt)
      }
      
      return
    }
    
    console.log('✅ Apartments tabela uspešno dohvaćena')
    console.log('📊 Primer apartmana:', apartments)
    
    if (apartments && apartments.length > 0) {
      console.log('\n📋 Dostupne kolone u apartments tabeli:')
      Object.keys(apartments[0]).forEach((key, index) => {
        console.log(`   ${index + 1}. ${key}`)
      })
    }
    
  } catch (error) {
    console.error('💥 Neočekivana greška:', error.message)
  }
}

checkApartmentsSchema()