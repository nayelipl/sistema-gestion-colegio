-- CreateTable
CREATE TABLE `reportes_ingreso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporteNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaDesde` DATETIME(3) NOT NULL,
    `fechaHasta` DATETIME(3) NOT NULL,
    `realizadoPor` VARCHAR(191) NULL,
    `totalRecibos` INTEGER NOT NULL,
    `totalMonto` DECIMAL(10, 2) NOT NULL,
    `saldoInicial` DECIMAL(10, 2) NOT NULL,
    `saldoFinal` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `datos` TEXT NOT NULL,
    `creadoPor` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reportes_ingreso_reporteNo_key`(`reporteNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;