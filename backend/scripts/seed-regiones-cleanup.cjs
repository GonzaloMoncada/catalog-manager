const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envFile = readFileSync(resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' });

(async () => {
  const client = await pool.connect();
  try {
    console.log('=== Limpiando duplicados ===\n');

    // Eliminar duplicados (ids 4,5,6 que recién se insertaron)
    await client.query(`DELETE FROM region WHERE id IN (4,5,6)`);
    console.log('Duplicados eliminados (ids 4,5,6).');

    // Corregir tilde en "Tarapaca" -> "Tarapacá"
    await client.query(`UPDATE region SET nombre = 'Tarapacá' WHERE nombre = 'Tarapaca'`);
    console.log("'Tarapaca' corregido a 'Tarapacá'.");

    // Listar todas
    const todas = await client.query(`SELECT id, nombre, estado FROM region ORDER BY id`);
    console.log('\n--- Regiones finales en BD ---');
    for (const row of todas.rows) {
      console.log(`  ${row.id}. ${row.nombre} [${row.estado}]`);
    }

    console.log('\n=== Listo ===');
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error('Error:', e); process.exit(1); });
