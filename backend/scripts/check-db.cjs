const { Pool } = require('pg');
const { readFileSync } = require('fs');

const env = readFileSync('.env', 'utf-8')
  .split('\n')
  .reduce((a, l) => {
    const m = l.match(/^([^=]+)=(.*)$/);
    if (m) a[m[1].trim()] = m[2].trim();
    return a;
  }, {});

const usarSsl = env.DB_SSL === 'true';
const url = usarSsl ? env.DATABASE_URL + '?sslmode=require' : env.DATABASE_URL;
console.log('Conectando a:', url.replace(/\/\/.*@/, '//***:***@'));
const pool = new Pool({ connectionString: url, ssl: usarSsl });

(async () => {
  const { rows } = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `);
  console.log('Tablas encontradas:', rows.length);
  if (rows.length > 0) {
    console.table(rows);
  } else {
    console.log('(vacía)');
  }
  await pool.end();
})();
