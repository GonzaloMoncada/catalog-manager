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
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

const USUARIO_TEST = {
  nombre_usuario: 'testuser',
  correo: 'test@example.com',
  contrasena: 'Test1234!',
};

async function seed() {
  console.log('=== SEED: Creando usuario de prueba ===\n');

  const hashedPassword = await bcrypt.hash(USUARIO_TEST.contrasena, 10);

  const usuario = await prisma.usuarios.upsert({
    where: { correo: USUARIO_TEST.correo },
    update: {},
    create: {
      nombre_usuario: USUARIO_TEST.nombre_usuario,
      correo: USUARIO_TEST.correo,
      contrasena: hashedPassword,
      estado: 'confirmado',
    },
  });
  console.log(`Usuario creado: id=${usuario.id}, correo=${usuario.correo}`);

  const rol = await prisma.tipos_roles.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: 'Administrador' },
  });

  console.log('\n=== Limpiando permisos existentes ===');
  await prisma.roles_permisos.deleteMany();
  await prisma.permisos.deleteMany();
  console.log('Permisos eliminados.');

  const permisoNombres = [
    'USUARIO_CREATE', 'USUARIO_READ', 'USUARIO_UPDATE', 'USUARIO_DELETE',
    'ROL_CREATE', 'ROL_READ', 'ROL_UPDATE', 'ROL_DELETE',
    'PERMISO_CREATE', 'PERMISO_READ', 'PERMISO_UPDATE', 'PERMISO_DELETE',
    'PRODUCTO_CREATE', 'PRODUCTO_READ', 'PRODUCTO_UPDATE', 'PRODUCTO_DELETE',
    'CATEGORIA_CREATE', 'CATEGORIA_READ', 'CATEGORIA_UPDATE', 'CATEGORIA_DELETE',
    'REGION_CREATE', 'REGION_READ', 'REGION_UPDATE', 'REGION_DELETE',
    'OFERTA_CREATE', 'OFERTA_READ', 'OFERTA_UPDATE', 'OFERTA_DELETE',
    'REGISTRO_ACTIVIDAD_READ', 'REGISTRO_ACTIVIDAD_DELETE',
  ];

  for (const nombre of permisoNombres) {
    const permiso = await prisma.permisos.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    await prisma.roles_permisos.upsert({
      where: { rol_id_permiso_id: { rol_id: rol.id, permiso_id: permiso.id } },
      update: {},
      create: { rol_id: rol.id, permiso_id: permiso.id },
    });
  }

  await prisma.usuarios_roles.upsert({
    where: { usuario_id_rol_id: { usuario_id: usuario.id, rol_id: rol.id } },
    update: {},
    create: { usuario_id: usuario.id, rol_id: rol.id },
  });

  console.log(`Rol '${rol.nombre}' asignado con ${permisoNombres.length} permisos`);
  console.log('\nCredenciales de prueba:');
  console.log(`  Correo: ${USUARIO_TEST.correo}`);
  console.log(`  Contraseña: ${USUARIO_TEST.contrasena}`);

  await prisma.$disconnect();
  console.log('\n=== SEED completado ===');
}

seed().catch((e) => {
  console.error('Error en seed:', e);
  process.exit(1);
});
