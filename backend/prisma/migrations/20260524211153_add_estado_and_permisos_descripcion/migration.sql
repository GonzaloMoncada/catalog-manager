-- AlterTable
ALTER TABLE "permisos" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'pendiente';
