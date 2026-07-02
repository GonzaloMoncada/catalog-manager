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
    await client.query("UPDATE region SET numero_romano = 'XV'  WHERE id = 1");
    await client.query("UPDATE region SET numero_romano = 'I'   WHERE id = 2");
    await client.query("UPDATE region SET numero_romano = 'II'  WHERE id = 3");

    const r = await client.query('SELECT id, nombre, numero_romano, estado FROM region ORDER BY id');
    console.log(JSON.stringify(r.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
})();
