-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contrasena` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMINISTRADOR', 'DIRECTOR_ADMINISTRATIVO', 'CONTADOR', 'CAJERO', 'DIRECCION_ACADEMICA', 'COORDINACION_ACADEMICA', 'SECRETARIA_DOCENTE', 'ORIENTADOR_ESCOLAR', 'MAESTRO', 'TUTOR', 'ESTUDIANTE', 'VISITANTE') NOT NULL DEFAULT 'VISITANTE',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empleados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `cedula` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `salario` DECIMAL(10, 2) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empleados_cedula_key`(`cedula`),
    UNIQUE INDEX `empleados_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tutores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuentaNo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `tipoDocIdentidad` VARCHAR(191) NOT NULL DEFAULT 'CEDULA',
    `numeroDocIdentidad` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `celular` VARCHAR(191) NULL,
    `telefonoResidencial` VARCHAR(191) NULL,
    `telefonoTrabajo` VARCHAR(191) NULL,
    `ocupacion` VARCHAR(191) NOT NULL,
    `nombreContactoAlterno` VARCHAR(191) NOT NULL,
    `telefonoContactoAlterno` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tutores_cuentaNo_key`(`cuentaNo`),
    UNIQUE INDEX `tutores_numeroDocIdentidad_key`(`numeroDocIdentidad`),
    UNIQUE INDEX `tutores_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estudiantes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `RNE` VARCHAR(191) NULL,
    `fechaNac` DATETIME(3) NULL,
    `lugarNac` VARCHAR(191) NOT NULL,
    `edad` DOUBLE NULL,
    `sexo` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `tutorId` INTEGER NOT NULL,
    `parentesco` VARCHAR(191) NULL,
    `guardianLegal` VARCHAR(191) NULL,
    `viveCon` VARCHAR(191) NULL,
    `folio` VARCHAR(191) NULL,
    `libro` VARCHAR(191) NULL,
    `numeroActa` VARCHAR(191) NULL,
    `anioActa` VARCHAR(191) NULL,
    `seccionId` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `padreNombre` VARCHAR(191) NULL,
    `padreApellido` VARCHAR(191) NULL,
    `padreTipoDocIdentidad` VARCHAR(191) NULL,
    `padreNumeroDocIdentidad` VARCHAR(191) NULL,
    `padreOcupacion` VARCHAR(191) NULL,
    `padreCelular` VARCHAR(191) NULL,
    `padreTelefonoResidencial` VARCHAR(191) NULL,
    `padreTelefonoTrabajo` VARCHAR(191) NULL,
    `padreDireccion` VARCHAR(191) NULL,
    `padreEmail` VARCHAR(191) NULL,
    `madreNombre` VARCHAR(191) NULL,
    `madreApellido` VARCHAR(191) NULL,
    `madreTipoDocIdentidad` VARCHAR(191) NULL,
    `madreNumeroDocIdentidad` VARCHAR(191) NULL,
    `madreOcupacion` VARCHAR(191) NULL,
    `madreCelular` VARCHAR(191) NULL,
    `madreTelefonoResidencial` VARCHAR(191) NULL,
    `madreTelefonoTrabajo` VARCHAR(191) NULL,
    `madreDireccion` VARCHAR(191) NULL,
    `madreEmail` VARCHAR(191) NULL,

    UNIQUE INDEX `estudiantes_codigo_key`(`codigo`),
    UNIQUE INDEX `estudiantes_RNE_key`(`RNE`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matriculas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inscripcionNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estudianteId` INTEGER NOT NULL,
    `seccionId` INTEGER NOT NULL,
    `anioEscolar` VARCHAR(191) NOT NULL,
    `valorCobrado` DECIMAL(10, 2) NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `matriculas_inscripcionNo_key`(`inscripcionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cursos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `grado` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cursos_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `secciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `aula` VARCHAR(191) NOT NULL,
    `cursoId` INTEGER NOT NULL,
    `maestroEncargadoId` INTEGER NULL,
    `cupos` INTEGER NOT NULL DEFAULT 30,
    `inscritos` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `secciones_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignaturas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asignaturas_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignaciones_maestro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maestroId` INTEGER NOT NULL,
    `seccionId` INTEGER NOT NULL,
    `asignaturaId` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asignaciones_maestro_maestroId_seccionId_asignaturaId_key`(`maestroId`, `seccionId`, `asignaturaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `diaSemana` INTEGER NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFin` VARCHAR(191) NOT NULL,
    `seccionId` INTEGER NOT NULL,
    `asignacionId` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `asistencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estudianteId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarifas_anio_escolar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anioEscolar` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,
    `valorInscripcion` DECIMAL(10, 2) NOT NULL,
    `recargoPorcentaje` DOUBLE NOT NULL DEFAULT 6.0,
    `colegiaturaNumCuotas` INTEGER NOT NULL DEFAULT 11,
    `colegiaturaDiaDesde` INTEGER NOT NULL DEFAULT 25,
    `colegiaturaDiaHasta` INTEGER NOT NULL DEFAULT 30,
    `colegiaturaDiasGracia` INTEGER NOT NULL DEFAULT 5,
    `transporteNumCuotas` INTEGER NOT NULL DEFAULT 10,
    `transporteDiaDesde` INTEGER NOT NULL DEFAULT 25,
    `transporteDiaHasta` INTEGER NOT NULL DEFAULT 30,
    `transporteDiasGracia` INTEGER NOT NULL DEFAULT 5,

    UNIQUE INDEX `tarifas_anio_escolar_anioEscolar_key`(`anioEscolar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarifas_curso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarifaAnioId` INTEGER NOT NULL,
    `cursoId` INTEGER NOT NULL,
    `cuotaColegiatura` DECIMAL(10, 2) NOT NULL,
    `costoMateriales` DECIMAL(10, 2) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tarifas_curso_tarifaAnioId_cursoId_key`(`tarifaAnioId`, `cursoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarifas_transporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarifaAnioId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valorAnual` DECIMAL(10, 2) NOT NULL,
    `inscripcion` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion_cuotas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarifaAnioId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `numeroCuota` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `diaVencimiento` INTEGER NOT NULL,
    `fechaVencimiento` DATETIME(3) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracion_cuotas_tarifaAnioId_numeroCuota_key`(`tarifaAnioId`, `numeroCuota`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ruta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `horarioRecogida` VARCHAR(191) NOT NULL,
    `horarioRegreso` VARCHAR(191) NULL,
    `puntosRecorrido` JSON NOT NULL,
    `conductor` VARCHAR(191) NULL,
    `telefonoConductor` VARCHAR(191) NULL,
    `capacidad` INTEGER NOT NULL DEFAULT 20,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transporte_estudiante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cargoNo` VARCHAR(191) NOT NULL,
    `estudianteId` INTEGER NOT NULL,
    `tutorId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valorCuota` DECIMAL(10, 2) NOT NULL,
    `duracionMeses` INTEGER NOT NULL DEFAULT 10,
    `montoTotal` DECIMAL(10, 2) NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `anioEscolar` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVO',
    `fechaCancelacion` DATETIME(3) NULL,
    `observaciones` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transporte_estudiante_cargoNo_key`(`cargoNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstudianteRuta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estudianteId` INTEGER NOT NULL,
    `rutaId` INTEGER NOT NULL,
    `puntoRecogida` JSON NULL,
    `fechaInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaFin` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `observaciones` VARCHAR(191) NULL,

    UNIQUE INDEX `EstudianteRuta_estudianteId_rutaId_fechaInicio_key`(`estudianteId`, `rutaId`, `fechaInicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publicaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `contenido` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'COMUNICADO',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contadores` (
    `id` VARCHAR(191) NOT NULL,
    `ultimoNumero` INTEGER NOT NULL DEFAULT 0,
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `docNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hora` VARCHAR(191) NOT NULL DEFAULT '',
    `tipo` ENUM('CARGO', 'PAGO', 'AJUSTE') NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `debito` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `credito` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tutorId` INTEGER NOT NULL,
    `estudianteId` INTEGER NULL,
    `realizadoPor` VARCHAR(191) NOT NULL,
    `relacionId` INTEGER NULL,

    UNIQUE INDEX `movimientos_contables_docNo_key`(`docNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cargos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cargoNo` VARCHAR(191) NOT NULL,
    `estudianteId` INTEGER NOT NULL,
    `tutorId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `montoOriginal` DECIMAL(10, 2) NOT NULL,
    `recargo` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `montoTotal` DECIMAL(10, 2) NOT NULL,
    `fechaVencimiento` DATETIME(3) NOT NULL,
    `montoPagado` DECIMAL(10, 2) NULL,
    `saldoPendiente` DECIMAL(10, 2) NOT NULL,
    `anioEscolar` VARCHAR(191) NULL,
    `estado` ENUM('PENDIENTE', 'ABONADA', 'SALDA', 'VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos_cargo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reciboId` INTEGER NOT NULL,
    `cargoId` INTEGER NOT NULL,
    `cuentaId` INTEGER NULL,
    `montoPagado` DECIMAL(10, 2) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recibos_pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reciboNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hora` VARCHAR(191) NOT NULL,
    `tutorId` INTEGER NOT NULL,
    `metodoPago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE') NOT NULL,
    `subTotal` DECIMAL(10, 2) NOT NULL,
    `recargoTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `realizadoPor` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recibos_pago_reciboNo_key`(`reciboNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuentas_por_cobrar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tutorId` INTEGER NOT NULL,
    `cargoNo` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valorCargo` DECIMAL(10, 2) NOT NULL,
    `recargo` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `montoTotal` DECIMAL(10, 2) NOT NULL,
    `fechaEmision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaVencimiento` DATETIME(3) NOT NULL,
    `fechaUltimoPago` DATETIME(3) NULL,
    `montoPagado` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `saldoPendiente` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('CORRIENTE', 'PENDIENTE', 'VENCIDO', 'ABONADA', 'SALDA') NOT NULL DEFAULT 'PENDIENTE',
    `cargoId` INTEGER NULL,
    `actualizadoEn` DATETIME(3) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Uniforme` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `talla` VARCHAR(191) NOT NULL,
    `precio` DOUBLE NOT NULL,
    `stock` INTEGER NOT NULL,
    `stockMinimo` INTEGER NOT NULL DEFAULT 1,
    `descripcion` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VentaUniforme` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ventaNo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uniformeId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `estudianteId` INTEGER NOT NULL,
    `metodoPago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE') NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `realizadoPor` VARCHAR(191) NOT NULL,
    `cancelado` BOOLEAN NOT NULL DEFAULT false,
    `canceladoPor` VARCHAR(191) NULL,
    `canceladoEn` DATETIME(3) NULL,

    UNIQUE INDEX `VentaUniforme_ventaNo_key`(`ventaNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `secciones` ADD CONSTRAINT `secciones_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `secciones` ADD CONSTRAINT `secciones_maestroEncargadoId_fkey` FOREIGN KEY (`maestroEncargadoId`) REFERENCES `empleados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_maestroId_fkey` FOREIGN KEY (`maestroId`) REFERENCES `empleados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_maestro` ADD CONSTRAINT `asignaciones_maestro_asignaturaId_fkey` FOREIGN KEY (`asignaturaId`) REFERENCES `asignaturas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horarios` ADD CONSTRAINT `horarios_seccionId_fkey` FOREIGN KEY (`seccionId`) REFERENCES `secciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horarios` ADD CONSTRAINT `horarios_asignacionId_fkey` FOREIGN KEY (`asignacionId`) REFERENCES `asignaciones_maestro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calificaciones` ADD CONSTRAINT `calificaciones_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calificaciones` ADD CONSTRAINT `calificaciones_asignaturaId_fkey` FOREIGN KEY (`asignaturaId`) REFERENCES `asignaturas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarifas_curso` ADD CONSTRAINT `tarifas_curso_tarifaAnioId_fkey` FOREIGN KEY (`tarifaAnioId`) REFERENCES `tarifas_anio_escolar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarifas_curso` ADD CONSTRAINT `tarifas_curso_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarifas_transporte` ADD CONSTRAINT `tarifas_transporte_tarifaAnioId_fkey` FOREIGN KEY (`tarifaAnioId`) REFERENCES `tarifas_anio_escolar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracion_cuotas` ADD CONSTRAINT `configuracion_cuotas_tarifaAnioId_fkey` FOREIGN KEY (`tarifaAnioId`) REFERENCES `tarifas_anio_escolar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transporte_estudiante` ADD CONSTRAINT `transporte_estudiante_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transporte_estudiante` ADD CONSTRAINT `transporte_estudiante_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstudianteRuta` ADD CONSTRAINT `EstudianteRuta_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstudianteRuta` ADD CONSTRAINT `EstudianteRuta_rutaId_fkey` FOREIGN KEY (`rutaId`) REFERENCES `Ruta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_contables` ADD CONSTRAINT `movimientos_contables_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_contables` ADD CONSTRAINT `movimientos_contables_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_cargo` ADD CONSTRAINT `pagos_cargo_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_cargo` ADD CONSTRAINT `pagos_cargo_reciboId_fkey` FOREIGN KEY (`reciboId`) REFERENCES `recibos_pago`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_cargo` ADD CONSTRAINT `pagos_cargo_cuentaId_fkey` FOREIGN KEY (`cuentaId`) REFERENCES `cuentas_por_cobrar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recibos_pago` ADD CONSTRAINT `recibos_pago_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentas_por_cobrar` ADD CONSTRAINT `cuentas_por_cobrar_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `tutores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaUniforme` ADD CONSTRAINT `VentaUniforme_uniformeId_fkey` FOREIGN KEY (`uniformeId`) REFERENCES `Uniforme`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaUniforme` ADD CONSTRAINT `VentaUniforme_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
