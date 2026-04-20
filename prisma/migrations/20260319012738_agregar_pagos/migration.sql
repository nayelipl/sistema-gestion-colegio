-- CreateTable
CREATE TABLE `pagos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tutorId` INTEGER NOT NULL,
    `concepto` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `montoPagado` DECIMAL(10, 2) NOT NULL,
    `cambio` DECIMAL(10, 2) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'PRESENCIAL',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
