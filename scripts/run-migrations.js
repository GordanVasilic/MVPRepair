import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runMigrations() {
  console.log('🚀 Pokretanje migracija Supabase baze podataka...');
  
  // Kreiranje konekcije na bazu podataka
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Povezivanje na bazu
    console.log('📡 Povezivanje na Supabase bazu...');
    await client.connect();
    console.log('✅ Uspešno povezano na bazu podataka!');

    // Čitanje svih migration fajlova
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    console.log('📁 Čitanje migration fajlova iz:', migrationsDir);
    
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations direktorijum ne postoji: ${migrationsDir}`);
    }

    // Dobijanje svih .sql fajlova i sortiranje po imenu
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('📋 Pronađene migracije:', migrationFiles);

    // Izvršavanje svake migracije
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      console.log(`⚡ Izvršavanje migracije: ${migrationFile}`);
      
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query(sqlContent);
        console.log(`✅ Migracija ${migrationFile} uspešno izvršena!`);
      } catch (error) {
        // Ako je greška zbog postojanja kolone/tabele, nastavi dalje
        if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
          console.log(`⚠️  Migracija ${migrationFile} već je primenjena (${error.message})`);
        } else {
          throw error;
        }
      }
    }

    // Provera da li su tabele kreirane
    console.log('🔍 Provera kreiraanih tabela...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    console.log('📊 Kreirane tabele:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Provera da li description kolona postoji u buildings tabeli
    console.log('🔍 Provera description kolone u buildings tabeli...');
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'buildings' 
      AND table_schema = 'public'
      ORDER BY column_name;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('📊 Kolone u buildings tabeli:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });

    console.log('🎉 Sve migracije su uspešno izvršene!');

  } catch (error) {
    console.error('❌ Greška pri izvršavanju migracija:', error.message);
    console.error('📝 Detalji greške:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Konekcija na bazu zatvorena');
  }
}

// Pokretanje migracija
runMigrations();