-- AlterTable
ALTER TABLE `recibos_pago` ADD COLUMN `anulado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `anuladoEn` DATETIME(3) NULL,
    ADD COLUMN `anuladoPor` VARCHAR(191) NULL,
    ADD COLUMN `motivoAnulacion` VARCHAR(191) NULL;