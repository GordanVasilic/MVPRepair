const jwt = require('jsonwebtoken')
require('dotenv').config()

console.log('🔑 PROVERAVAM SERVICE ROLE KEY')
console.log('==============================')

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

console.log('Service Key (first 50 chars):', serviceKey?.substring(0, 50) + '...')
console.log('Anon Key (first 50 chars):', anonKey?.substring(0, 50) + '...')

try {
  // Dekodira service key
  const serviceDecoded = jwt.decode(serviceKey)
  console.log('\n🔍 SERVICE KEY DECODED:')
  console.log('Role:', serviceDecoded?.role)
  console.log('Issuer:', serviceDecoded?.iss)
  console.log('Reference:', serviceDecoded?.ref)
  
  // Dekodira anon key
  const anonDecoded = jwt.decode(anonKey)
  console.log('\n🔍 ANON KEY DECODED:')
  console.log('Role:', anonDecoded?.role)
  console.log('Issuer:', anonDecoded?.iss)
  console.log('Reference:', anonDecoded?.ref)
  
  // Proverava da li su isti
  if (serviceKey === anonKey) {
    console.log('\n❌ SERVICE KEY I ANON KEY SU ISTI!')
  } else {
    console.log('\n✅ Service key i anon key su različiti')
  }
  
  if (serviceDecoded?.role !== 'service_role') {
    console.log('\n❌ SERVICE KEY NEMA service_role!')
  } else {
    console.log('\n✅ Service key ima ispravnu service_role')
  }
  
} catch (error) {
  console.error('❌ Greška pri dekodiranju:', error.message)
}