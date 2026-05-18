-- CreateTable
CREATE TABLE `informes_cuentas_por_cobrar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(200) NOT NULL,
    `descripcion` TEXT NULL,
    `fechaDesde` DATETIME(3) NULL,
    `fechaHasta` DATETIME(3) NULL,
    `tipo` VARCHAR(50) NOT NULL DEFAULT 'TODOS',
    `cuotasVencidas` INTEGER NULL,
    `columnas` TEXT NOT NULL,
    `totalPendiente` DOUBLE NOT NULL,
    `totalCobrado` DOUBLE NOT NULL,
    `datos` TEXT NOT NULL,
    `creadoPor` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,
    `anulado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `informes_cuentas_por_cobrar_creadoPor_idx`(`creadoPor`),
    INDEX `informes_cuentas_por_cobrar_anulado_idx`(`anulado`),
    INDEX `informes_cuentas_por_cobrar_creadoEn_idx`(`creadoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `informes_cuentas_por_cobrar` ADD CONSTRAINT `informes_cuentas_por_cobrar_creadoPor_fkey` FOREIGN KEY (`creadoPor`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
