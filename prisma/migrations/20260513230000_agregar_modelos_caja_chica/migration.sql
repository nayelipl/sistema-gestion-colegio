-- CreateTable
CREATE TABLE `caja_chica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `desembolsoNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pagadoA` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `conCargoA` VARCHAR(191) NOT NULL,
    `porConceptoDe` VARCHAR(191) NOT NULL,
    `aprobadoPor` VARCHAR(191) NOT NULL,
    `recibidoPor` VARCHAR(191) NOT NULL,
    `cedula` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVA',
    `anuladoPor` VARCHAR(191) NULL,
    `anuladoEn` DATETIME(3) NULL,
    `motivoAnulacion` VARCHAR(191) NULL,
    `creadoPor` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `caja_chica_desembolsoNo_key`(`desembolsoNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caja_chica_fondo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `saldoInicial` DECIMAL(10, 2) NOT NULL,
    `fondoMinimo` DECIMAL(10, 2) NOT NULL,
    `realizadoPor` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caja_chica_cuadre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuadreNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaDesde` DATETIME(3) NOT NULL,
    `fechaHasta` DATETIME(3) NOT NULL,
    `realizadoPor` VARCHAR(191) NOT NULL,
    `saldoInicial` DECIMAL(10, 2) NOT NULL,
    `totalDesembolsos` DECIMAL(10, 2) NOT NULL,
    `saldoActual` DECIMAL(10, 2) NOT NULL,
    `montoReposicion` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'BORRADOR',
    `desembolsos` JSON NOT NULL,
    `creadoPor` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `caja_chica_cuadre_cuadreNo_key`(`cuadreNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;