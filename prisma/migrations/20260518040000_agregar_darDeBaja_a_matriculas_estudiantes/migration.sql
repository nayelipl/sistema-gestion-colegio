-- AlterTable
ALTER TABLE `estudiantes` ADD COLUMN `dadoDeBajaPor` VARCHAR(191) NULL,
    ADD COLUMN `eliminadoEn` DATETIME(3) NULL,
    ADD COLUMN `fechaBaja` DATETIME(3) NULL,
    ADD COLUMN `motivoBaja` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `matriculas` ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `fechaBaja` DATETIME(3) NULL,
    ADD COLUMN `motivoBaja` VARCHAR(191) NULL;