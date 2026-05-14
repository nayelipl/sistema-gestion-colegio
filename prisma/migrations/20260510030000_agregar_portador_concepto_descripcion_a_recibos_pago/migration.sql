-- AlterTable
ALTER TABLE `recibos_pago` ADD COLUMN `alPortador` VARCHAR(191) NULL,
    ADD COLUMN `concepto` VARCHAR(191) NULL,
    ADD COLUMN `descripcion` VARCHAR(191) NULL;