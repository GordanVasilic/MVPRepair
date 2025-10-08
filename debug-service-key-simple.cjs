require('dotenv').config()

console.log('🔑 PROVERAVAM SERVICE ROLE KEY')
console.log('==============================')

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

console.log('Service Key (first 50 chars):', serviceKey?.substring(0, 50) + '...')
console.log('Anon Key (first 50 chars):', anonKey?.substring(0, 50) + '...')

// Jednostavna provera da li su isti
if (serviceKey === anonKey) {
  console.log('\n❌ SERVICE KEY I ANON KEY SU ISTI!')
  console.log('Ovo objašnjava zašto admin operacije ne rade.')
} else {
  console.log('\n✅ Service key i anon key su različiti')
}

// Proverava da li service key sadrži "service_role"
if (serviceKey && serviceKey.includes('service_role')) {
  console.log('✅ Service key verovatno sadrži service_role')
} else {
  console.log('❌ Service key ne sadrži service_role')
}

console.log('\n🔍 FULL SERVICE KEY:')
console.log(serviceKey)

console.log('\n🔍 FULL ANON KEY:')
console.log(anonKey)