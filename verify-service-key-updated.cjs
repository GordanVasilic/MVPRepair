require('dotenv').config()

console.log('🔍 VERIFIKUJEM AŽURIRANI SERVICE KEY')
console.log('===================================')

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

console.log('Service Key (first 50 chars):', serviceKey?.substring(0, 50) + '...')
console.log('Anon Key (first 50 chars):', anonKey?.substring(0, 50) + '...')

// Proverava da li su različiti
if (serviceKey === anonKey) {
  console.log('\n❌ SERVICE KEY I ANON KEY SU JOŠ UVEK ISTI!')
} else {
  console.log('\n✅ Service key i anon key su različiti')
}

// Proverava da li service key sadrži "service_role"
if (serviceKey && serviceKey.includes('service_role')) {
  console.log('✅ Service key sadrži service_role')
} else {
  console.log('❌ Service key ne sadrži service_role')
}

// Proverava da li anon key sadrži "anon"
if (anonKey && anonKey.includes('anon')) {
  console.log('✅ Anon key sadrži anon role')
} else {
  console.log('❌ Anon key ne sadrži anon role')
}

console.log('\n🔍 SERVICE KEY ENDING:')
console.log('...', serviceKey?.substring(serviceKey.length - 20))

console.log('\n🔍 ANON KEY ENDING:')
console.log('...', anonKey?.substring(anonKey.length - 20))