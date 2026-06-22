/**
 * Borra todos los usuarios y crea un admin nuevo.
 * Usa pg directamente (mismo patrón que seed-test-user.cjs)
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

const ADMIN = {
  nombre_usuario: 'gonzalomoncada47',
  correo: 'gonzalomoncada47@gmail.com',
  contrasena: 'Hombre12',
  estado: 'confirmado',
};

(async () => {
  const client = await pool.connect();
  try {
    console.log('=== RESET: Borrando todos los usuarios ===\n');

    let res = await client.query('DELETE FROM usuarios_roles');
    console.log(`Relaciones usuarios_roles eliminadas: ${res.rowCount}`);

    res = await client.query('DELETE FROM usuarios');
    console.log(`Usuarios eliminados: ${res.rowCount}\n`);

    console.log('=== Creando usuario administrador ===\n');

    const hash = hashSync(ADMIN.contrasena, 10);
    res = await client.query(
      `INSERT INTO usuarios (nombre_usuario, correo, contrasena, estado)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [ADMIN.nombre_usuario, ADMIN.correo, hash, ADMIN.estado]
    );
    const userId = res.rows[0].id;
    console.log(`Usuario: id=${userId}, correo=${ADMIN.correo}`);

    // Rol Admin
    await client.query(
      `INSERT INTO tipos_roles (nombre) VALUES ('Administrador')
       ON CONFLICT (nombre) DO NOTHING`
    );
    res = await client.query(`SELECT id FROM tipos_roles WHERE nombre='Administrador'`);
    const rolId = res.rows[0].id;
    console.log(`Rol: id=${rolId}, nombre=Administrador`);

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

    console.log(`Rol 'Administrador' con ${permRes.rows.length} permisos asignado al usuario`);
    console.log('\nCredenciales del admin:');
    console.log(`  Correo:     ${ADMIN.correo}`);
    console.log(`  Contraseña: ${ADMIN.contrasena}`);
    console.log('\n=== Proceso completado ===');
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error('Error:', e); process.exit(1); });
