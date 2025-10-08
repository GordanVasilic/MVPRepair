console.log('🔍 DEBUG ENV LOADING')
console.log('===================')

// Pre dotenv
console.log('PRE DOTENV:')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50) + '...')

require('dotenv').config()

// Post dotenv
console.log('\nPOST DOTENV:')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50) + '...')
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY?.substring(0, 50) + '...')

// Proverava da li su isti
if (process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY) {
  console.log('\n❌ KLJUČEVI SU ISTI!')
} else {
  console.log('\n✅ Ključevi su različiti')
}

// Proverava sadržaj
console.log('\n🔍 SERVICE KEY CONTAINS service_role:', process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('service_role'))
console.log('🔍 ANON KEY CONTAINS anon:', process.env.SUPABASE_ANON_KEY?.includes('anon'))

// Poslednji deo ključeva
console.log('\n🔍 SERVICE KEY ENDING:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-20))
console.log('🔍 ANON KEY ENDING:', process.env.SUPABASE_ANON_KEY?.slice(-20))