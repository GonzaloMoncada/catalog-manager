/**
 * Seed simple: crea usuario, rol admin, y permisos directamente con SQL
 * Usa solo el paquete 'pg' (ya instalado)
 */
const { Pool } = require('pg');
const { hashSync } = require('bcrypt');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envFile = readFileSync(resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const USUARIO = { nombre_usuario: 'testuser', correo: 'test@example.com', contrasena: 'Test1234!', estado: 'confirmado' };

(async () => {
  const client = await pool.connect();
  try {
    console.log('=== SEED: Creando datos de prueba ===\n');

    // Usuario
    const hash = hashSync(USUARIO.contrasena, 10);
    let res = await client.query(
      `INSERT INTO usuarios (nombre_usuario, correo, contrasena, estado)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (correo) DO UPDATE SET estado=$4
       RETURNING id`,
      [USUARIO.nombre_usuario, USUARIO.correo, hash, USUARIO.estado]
    );
    const userId = res.rows[0].id;
    console.log(`Usuario: id=${userId}, correo=${USUARIO.correo}`);

    // Rol Admin
    res = await client.query(
      `INSERT INTO tipos_roles (nombre) VALUES ('Administrador')
       ON CONFLICT (nombre) DO NOTHING`
    );
    res = await client.query(`SELECT id FROM tipos_roles WHERE nombre='Administrador'`);
    const rolId = res.rows[0].id;

    // Permisos
    const permisos = [
      'USUARIO_CREATE','USUARIO_READ','USUARIO_UPDATE','USUARIO_DELETE',
      'ROL_CREATE','ROL_READ','ROL_UPDATE','ROL_DELETE',
      'PERMISO_CREATE','PERMISO_READ','PERMISO_UPDATE','PERMISO_DELETE',
      'PRODUCTO_CREATE','PRODUCTO_READ','PRODUCTO_UPDATE','PRODUCTO_DELETE',
      'CATEGORIA_CREATE','CATEGORIA_READ','CATEGORIA_UPDATE','CATEGORIA_DELETE',
      'REGION_CREATE','REGION_READ','REGION_UPDATE','REGION_DELETE',
      'OFERTA_CREATE','OFERTA_READ','OFERTA_UPDATE','OFERTA_DELETE',
      'REGISTRO_ACTIVIDAD_READ','REGISTRO_ACTIVIDAD_DELETE',
    ];
    for (const p of permisos) {
      await client.query(
        `INSERT INTO permisos (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING`,
        [p]
      );
    }

    // Asignar todos los permisos al rol
    const permRes = await client.query(`SELECT id FROM permisos`);
    for (const row of permRes.rows) {
      await client.query(
        `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ($1,$2)
         ON CONFLICT (rol_id, permiso_id) DO NOTHING`,
        [rolId, row.id]
      );
    }

    // Asignar rol al usuario
    await client.query(
      `INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1,$2)
       ON CONFLICT (usuario_id, rol_id) DO NOTHING`,
      [userId, rolId]
    );

    console.log(`Rol 'Administrador' (id=${rolId}) con ${permRes.rows.length} permisos`);
    console.log(`Asignado a usuario id=${userId}`);
    console.log('\nCredenciales:');
    console.log(`  Correo:     ${USUARIO.correo}`);
    console.log(`  Contraseña: ${USUARIO.contrasena}`);
    console.log('\n=== SEED completado ===');
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error('Error:', e); process.exit(1); });
