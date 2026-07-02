import { readFileSync } from 'fs';
import { resolve } from 'path';

const envFile = readFileSync(resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();

const REGIONES = [
  { nombre: 'Tarapacá', estado: 'HABILITADO' as const },
  { nombre: 'Antofagasta', estado: 'HABILITADO' as const },
  { nombre: 'Arica y Parinacota', estado: 'HABILITADO' as const },
];

async function seed() {
  console.log('=== SEED: Insertando regiones ===\n');

  for (const region of REGIONES) {
    const existente = await prisma.region.findFirst({
      where: { nombre: region.nombre },
    });

    if (existente) {
      console.log(`Ya existe: ${region.nombre} (id=${existente.id})`);
    } else {
      const creada = await prisma.region.create({ data: region });
      console.log(`Creada: ${creada.nombre} (id=${creada.id})`);
    }
  }

  await prisma.$disconnect();
  console.log('\n=== SEED completado ===');
}

seed().catch((e) => {
  console.error('Error en seed:', e);
  process.exit(1);
});
