-- CreateIndex
CREATE UNIQUE INDEX `configuracion_cuotas_tarifaAnioId_tipo_numeroCuota_key` ON `configuracion_cuotas`(`tarifaAnioId`, `tipo`, `numeroCuota`);