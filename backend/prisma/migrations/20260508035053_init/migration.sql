-- CreateEnum
CREATE TYPE "estado_region" AS ENUM ('HABILITADO', 'DESHABILITADO', 'PENDIENTE', 'DESHABILITADO_POR_DISPERSION', 'DESHABILITADO_POR_PRECIO');

-- CreateEnum
CREATE TYPE "estado_oferta" AS ENUM ('ACTIVA', 'INACTIVA', 'EXPIRADA');

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "imagenUrl" TEXT,
    "categoria_id" INTEGER,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_id" INTEGER,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "estado_region" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_region" (
    "producto_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "region_id" INTEGER NOT NULL,
    "estado" "estado_region" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "producto_region_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "oferta_producto" (
    "id" SERIAL NOT NULL,
    "oferta_id" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "region_id" TEXT NOT NULL,
    "estado" "estado_region" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "oferta_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "estado_oferta" NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "oferta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "producto_region_codigo_key" ON "producto_region"("codigo");

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_region" ADD CONSTRAINT "producto_region_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_region" ADD CONSTRAINT "producto_region_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_producto" ADD CONSTRAINT "oferta_producto_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_producto" ADD CONSTRAINT "oferta_producto_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "producto_region"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
