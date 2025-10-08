require('dotenv').config();

console.log('🔍 PROVERA FRONTEND LOGIN STANJA');
console.log('================================');

console.log('\n📋 Instrukcije za testiranje:');
console.log('1. Otvorite http://localhost:5173/ u browseru');
console.log('2. Prijavite se sa:');
console.log('   Email: demo@firma.com');
console.log('   Password: demo123');
console.log('3. Idite na "Stanari" sekciju');
console.log('4. Otvorite Developer Tools (F12)');
console.log('5. Idite na Console tab');
console.log('6. Trebalo bi da vidite console logove koji počinju sa 🚀');

console.log('\n🔍 Šta da tražite u console-u:');
console.log('- "🚀 TENANTS COMPONENT MOUNTED"');
console.log('- "✅ User has permission to fetch tenants"');
console.log('- "🔍 FETCHING TENANTS - START"');
console.log('- "📡 API Response status: 200"');
console.log('- "📊 Tenants length: 1"');
console.log('- "✅ Tenants state set"');

console.log('\n⚠️  Ako ne vidite ove logove:');
console.log('- Komponenta se ne učitava');
console.log('- Korisnik nema dozvole');
console.log('- Postoji greška u rutingu');

console.log('\n💡 Takođe proverite:');
console.log('- Network tab za API pozive');
console.log('- Da li se poziva /api/tenants');
console.log('- Kakav je odgovor API-ja');

console.log('\n🎯 Očekivani rezultat:');
console.log('- Trebalo bi da vidite "Demo Stanar (demo@stanar.com)" u listi');
console.log('- Ako ne vidite, problem je u frontend komponenti');