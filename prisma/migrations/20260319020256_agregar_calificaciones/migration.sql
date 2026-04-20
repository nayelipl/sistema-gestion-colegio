-- CreateTable
CREATE TABLE `calificaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estudianteId` INTEGER NOT NULL,
    `asignaturaId` INTEGER NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `nota` DOUBLE NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `calificaciones` ADD CONSTRAINT `calificaciones_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calificaciones` ADD CONSTRAINT `calificaciones_asignaturaId_fkey` FOREIGN KEY (`asignaturaId`) REFERENCES `asignaturas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
