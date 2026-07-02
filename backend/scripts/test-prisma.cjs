const { PrismaClient } = require('../src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envFile = readFileSync(resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  console.log('Conectando...');
  const count = await prisma.region.count();
  console.log('Region count:', count);
  await prisma.$disconnect();
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
