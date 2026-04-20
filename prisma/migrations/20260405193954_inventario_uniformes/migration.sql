/*
  Warnings:

  - You are about to drop the column `seccionId` on the `estudiantes` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad` on the `uniformes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `uniformes` table. All the data in the column will be lost.
  - You are about to drop the column `vendidos` on the `uniformes` table. All the data in the column will be lost.
  - You are about to drop the `asignaciones_maestro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `asignaturas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `asistencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `calificaciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cursos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pagos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `publicaciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `secciones` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tipo` to the `empleados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `articulo` to the `uniformes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `asignaciones_maestro` DROP FOREIGN KEY `asignaciones_maestro_asignaturaId_fkey`;

-- DropForeignKey
ALTER TABLE `asignaciones_maestro` DROP FOREIGN KEY `asignaciones_maestro_maestroId_fkey`;

-- DropForeignKey
ALTER TABLE `asignaciones_maestro` DROP FOREIGN KEY `asignaciones_maestro_seccionId_fkey`;

-- DropForeignKey
ALTER TABLE `asistencias` DROP FOREIGN KEY `asistencias_estudianteId_fkey`;

-- DropForeignKey
ALTER TABLE `calificaciones` DROP FOREIGN KEY `calificaciones_asignaturaId_fkey`;

-- DropForeignKey
ALTER TABLE `calificaciones` DROP FOREIGN KEY `calificaciones_estudianteId_fkey`;

-- DropForeignKey
ALTER TABLE `estudiantes` DROP FOREIGN KEY `estudiantes_seccionId_fkey`;

-- DropForeignKey
ALTER TABLE `pagos` DROP FOREIGN KEY `pagos_tutorId_fkey`;

-- DropForeignKey
ALTER TABLE `secciones` DROP FOREIGN KEY `secciones_cursoId_fkey`;

-- AlterTable
ALTER TABLE `empleados` ADD COLUMN `tipo` ENUM('MAESTRO', 'CAJERO', 'CONTADOR', 'SECRETARIA', 'ORIENTADOR', 'DIRECTOR', 'COORDINADOR', 'CONSERJE', 'CONDUCTOR', 'ADMINISTRATIVO') NOT NULL;

-- AlterTable
ALTER TABLE `estudiantes` DROP COLUMN `seccionId`;

-- AlterTable
ALTER TABLE `uniformes` DROP COLUMN `cantidad`,
    DROP COLUMN `tipo`,
    DROP COLUMN `vendidos`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `articulo` VARCHAR(191) NOT NULL,
    ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `asignaciones_maestro`;

-- DropTable
DROP TABLE `asignaturas`;

-- DropTable
DROP TABLE `asistencias`;

-- DropTable
DROP TABLE `calificaciones`;

-- DropTable
DROP TABLE `cursos`;

-- DropTable
DROP TABLE `pagos`;

-- DropTable
DROP TABLE `publicaciones`;

-- DropTable
DROP TABLE `secciones`;

-- CreateTable
CREATE TABLE `ventas_uniformes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uniformeId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precioUnit` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `cajeroNombre` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ventas_uniformes` ADD CONSTRAINT `ventas_uniformes_uniformeId_fkey` FOREIGN KEY (`uniformeId`) REFERENCES `uniformes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
