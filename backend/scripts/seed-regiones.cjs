const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envFile = readFileSync(resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' });

const REGIONES = [
  { nombre: 'Tarapacá', estado: 'HABILITADO' },
  { nombre: 'Antofagasta', estado: 'HABILITADO' },
  { nombre: 'Arica y Parinacota', estado: 'HABILITADO' },
];

(async () => {
  const client = await pool.connect();
  try {
    console.log('=== SEED: Insertando regiones ===\n');

    for (const r of REGIONES) {
      const res = await client.query(
        `INSERT INTO region (nombre, estado)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [r.nombre, r.estado]
      );
      if (res.rows.length > 0) {
        console.log(`Creada: ${r.nombre} (id=${res.rows[0].id})`);
      } else {
        console.log(`Ya existe: ${r.nombre}`);
      }
    }

    // Listar todas las regiones actuales
    const todas = await client.query(`SELECT id, nombre, estado FROM region ORDER BY id`);
    console.log('\n--- Regiones en BD ---');
    for (const row of todas.rows) {
      console.log(`  ${row.id}. ${row.nombre} [${row.estado}]`);
    }

    console.log('\n=== SEED completado ===');
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error('Error:', e); process.exit(1); });
