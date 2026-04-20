-- CreateTable
CREATE TABLE `asignaciones_maestro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maestroId` INTEGER NOT NULL,
    `seccionId` INTEGER NOT NULL,
    `asignaturaId` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_maestroId_fkey` FOREIGN KEY (`maestroId`) REFERENCES `empleados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_asignaturaId_fkey` FOREIGN KEY (`asignaturaId`) REFERENCES `asignaturas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
