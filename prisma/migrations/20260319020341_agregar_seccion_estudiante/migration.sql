-- AlterTable
ALTER TABLE `estudiantes` ADD COLUMN `seccionId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
