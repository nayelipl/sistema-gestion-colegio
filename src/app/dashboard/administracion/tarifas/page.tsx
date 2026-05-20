"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  generarConfiguracionCuotas, 
  obtenerFechaCuotaFormateada,
  type ConfiguracionCuota 
} from "@/lib/generar-cuotas";
import NavBar from "@/components/NavBar";

type Curso = { id: number; codigo: string; grado: string; nivel: string };
type TarifaCurso = { cursoId: number; cuotaColegiatura: number; costoMateriales: number };
type TarifaRegistro = {
  id: number;
  anioEscolar: string;
  activo: boolean;
  valorInscripcion: number;
  recargoPorcentaje: number;
  colegiaturaNumCuotas: number;
  colegiaturaDiaDesde: number;
  colegiaturaDiaHasta: number;
  colegiaturaDiasGracia: number;
  transporteNumCuotas: number;
  transporteDiaDesde: number;
  transporteDiaHasta: number;
  transporteDiasGracia: number;
  tarifasCurso?: TarifaCurso[];
  tarifasTransporte?: any[];
};

export default function TarifasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  
  // Navegación por registros
  const [tarifasLista, setTarifasLista] = useState<TarifaRegistro[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  
  // Datos del formulario
  const [tarifaId, setTarifaId] = useState<number | null>(null);
  const [anioEscolar, setAnioEscolar] = useState("");
  const [tarifasCurso, setTarifasCurso] = useState<Record<number, TarifaCurso>>({});
  const [parametros, setParametros] = useState({
    valorInscripcion: 2000,
    recargoPorcentaje: 6,
    colegiaturaNumCuotas: 11,
    colegiaturaDiaDesde: 25,
    colegiaturaDiaHasta: 30,
    colegiaturaDiasGracia: 5,
    transporteNumCuotas: 10,
    transporteDiaDesde: 25,
    transporteDiaHasta: 30,
    transporteDiasGracia: 5,
    transporteCompletoAnual: 24000,
    transporteMedioAnual: 12000,
    transporteInscripcion: 0,
  });
  
  // Configuración de cuotas
  const [cuotasConfig, setCuotasConfig] = useState<ConfiguracionCuota[]>([]);
  const [colegiaturaSaltarMeses, setColegiaturaSaltarMeses] = useState(1);
  const [colegiaturaMesInicio, setColegiaturaMesInicio] = useState(9);
  const [cuotasConfigTransporte, setCuotasConfigTransporte] = useState<ConfiguracionCuota[]>([]);
  const [transporteSaltarMeses, setTransporteSaltarMeses] = useState(1);
  const [transporteMesInicio, setTransporteMesInicio] = useState(9);

  // Guardar nueva tarifa
  const [backupData, setBackupData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (rol !== "ADMINISTRADOR") router.push("/dashboard");
  }, [status, rol]);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setCargando(true);
    try {
      // 1. Cargar cursos
      const resCursos = await fetch("/api/academico/cursos");
      const dataCursos = await resCursos.json();
      setCursos(dataCursos.cursos || []);
      
      // 2. Cargar lista de todas las tarifas
      const resLista = await fetch("/api/administracion/tarifas/todas");
      if (resLista.ok) {
        const data = await resLista.json();
        setTarifasLista(data.tarifas || []);
        if (data.tarifas && data.tarifas.length > 0) {
          setCurrentIndex(0);
          cargarTarifaEnFormulario(data.tarifas[0]);
        } else {
          // Si no hay tarifas, iniciar en modo edición con valores por defecto
          setModoEdicion(true);
          inicializarTarifasCursos(dataCursos.cursos || []);
        }
      } else {
        inicializarTarifasCursos(dataCursos.cursos || []);
      }
    } catch (error) {
      console.error("Error cargando:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarTarifaEnFormulario = (tarifa: TarifaRegistro) => {
    setTarifaId(tarifa.id);
    setAnioEscolar(tarifa.anioEscolar);
    setParametros({
      valorInscripcion: tarifa.valorInscripcion || 0,
      recargoPorcentaje: tarifa.recargoPorcentaje || 0,
      colegiaturaNumCuotas: tarifa.colegiaturaNumCuotas || 0,
      colegiaturaDiaDesde: tarifa.colegiaturaDiaDesde || 0,
      colegiaturaDiaHasta: tarifa.colegiaturaDiaHasta || 0,
      colegiaturaDiasGracia: tarifa.colegiaturaDiasGracia || 0,
      transporteNumCuotas: tarifa.transporteNumCuotas || 0,
      transporteDiaDesde: tarifa.transporteDiaDesde || 0,
      transporteDiaHasta: tarifa.transporteDiaHasta || 0,
      transporteDiasGracia: tarifa.transporteDiasGracia || 0,
      transporteCompletoAnual: tarifa.tarifasTransporte?.find((t: any) => t.tipo === "COMPLETO")?.valorAnual || 24000,
      transporteMedioAnual: tarifa.tarifasTransporte?.find((t: any) => t.tipo === "MEDIO (RECOGER)")?.valorAnual || 12000,
      transporteInscripcion: tarifa.tarifasTransporte?.find((t: any) => t.tipo === "COMPLETO")?.inscripcion || 0,
    });
    
    // Cargar tarifas por curso
    const tarifasMap: Record<number, TarifaCurso> = {};
    if (tarifa.tarifasCurso) {
      tarifa.tarifasCurso.forEach(tc => {
        tarifasMap[tc.cursoId] = tc;
      });
    }
    setTarifasCurso(tarifasMap);
    
    // Cargar configuración de cuotas guardada
    cargarConfigCuotas(tarifa.id);
  };
  
  const cargarConfigCuotas = async (id: number) => {
    try {
      // Cargar cuotas de colegiatura
      const resColegiatura = await fetch(`/api/administracion/configuracion-cuotas?tarifaAnioId=${id}&tipo=COLEGIATURA`);
      const dataColegiatura = await resColegiatura.json();
      if (dataColegiatura.configuraciones && dataColegiatura.configuraciones.length > 0) {
        setCuotasConfig(dataColegiatura.configuraciones.map((c: any) => ({
          numero: c.numeroCuota,
          mes: c.mes,
          anio: c.anio,
          dia: c.diaVencimiento,
        })));
      }
      
      // Cargar cuotas de transporte
      const resTransporte = await fetch(`/api/administracion/configuracion-cuotas?tarifaAnioId=${id}&tipo=TRANSPORTE`);
      const dataTransporte = await resTransporte.json();
      if (dataTransporte.configuraciones && dataTransporte.configuraciones.length > 0) {
        setCuotasConfigTransporte(dataTransporte.configuraciones.map((c: any) => ({
          numero: c.numeroCuota,
          mes: c.mes,
          anio: c.anio,
          dia: c.diaVencimiento,
        })));
      } else if (anioEscolar) {
        generarConfiguracionTransporte();
      }
    } catch (err) {
      console.error("Error cargando config cuotas:", err);
    }
  };

  const inicializarTarifasCursos = (cursosList: Curso[]) => {
    const tarifasDefault: Record<number, TarifaCurso> = {};
    for (const curso of cursosList) {
      let cuotaBase = 2300;
      if (curso.codigo.startsWith("2-")) {
        if (curso.codigo === "2-1" || curso.codigo === "2-2" || curso.codigo === "2-3") cuotaBase = 2500;
        else cuotaBase = 2700;
      } else if (curso.codigo.startsWith("3-")) {
        if (curso.codigo === "3-1" || curso.codigo === "3-2" || curso.codigo === "3-3") cuotaBase = 3000;
        else cuotaBase = 3200;
      }
      tarifasDefault[curso.id] = {
        cursoId: curso.id,
        cuotaColegiatura: cuotaBase,
        costoMateriales: curso.nivel.includes("Inicial") ? 3000 : curso.nivel.includes("Primario") ? 2500 : 2000,
      };
    }
    setTarifasCurso(tarifasDefault);
  };

  const generarConfiguracionInicial = () => {
    if (!anioEscolar) {
      return;
    }
    const nuevaConfig = generarConfiguracionCuotas({
      numCuotas: parametros.colegiaturaNumCuotas,
      diaVencimiento: parametros.colegiaturaDiaDesde,
      anioEscolar: anioEscolar,
      saltarMeses: colegiaturaSaltarMeses,
      mesInicio: colegiaturaMesInicio,
    });
    setCuotasConfig(nuevaConfig);
  };

  // Actualizar cuota individual
  const actualizarCuota = (index: number, campo: keyof ConfiguracionCuota, valor: number) => {
    setCuotasConfig(prev => prev.map((c, i) => i === index ? { ...c, [campo]: valor } : c));
  };

  const actualizarTarifaCurso = (cursoId: number, campo: string, valor: number) => {
    setTarifasCurso(prev => ({
      ...prev,
      [cursoId]: { ...prev[cursoId], [campo]: valor }
    }));
  };

  // Función generar configuración de transporte
  const generarConfiguracionTransporte = () => {
    if (!anioEscolar) {
      console.log("No hay año escolar para generar cuotas de transporte");
      return;
    }
    
    console.log("Generando cuotas transporte con:", {
      numCuotas: parametros.transporteNumCuotas,
      diaVencimiento: parametros.transporteDiaDesde,
      anioEscolar,
      saltarMeses: transporteSaltarMeses,
      mesInicio: transporteMesInicio,
    });
    
    const nuevaConfig = generarConfiguracionCuotas({
      numCuotas: parametros.transporteNumCuotas,
      diaVencimiento: parametros.transporteDiaDesde,
      anioEscolar: anioEscolar,
      saltarMeses: transporteSaltarMeses,
      mesInicio: transporteMesInicio,
    });
    
    console.log("Cuotas transporte generadas:", nuevaConfig.length);
    setCuotasConfigTransporte(nuevaConfig);
  };

  // Guardar tarifa Y configuración de cuotas juntos
  const guardarTarifas = async (actualizar: boolean = false) => {
    setError("");
    setExito("");
    
    if (!anioEscolar) {
      setError("Debe especificar el año escolar (ej: 2025-2026)");
      return;
    }

    // Generar cuotas de colegiatura directamente, sin depender del estado
    const cuotasColegiaturaGeneradas = generarConfiguracionCuotas({
      numCuotas: parametros.colegiaturaNumCuotas,
      diaVencimiento: parametros.colegiaturaDiaDesde,
      anioEscolar: anioEscolar,
      saltarMeses: colegiaturaSaltarMeses,
      mesInicio: colegiaturaMesInicio,
    });
    
    // Generar cuotas de transporte directamente
    let cuotasTransporteGeneradas: ConfiguracionCuota[] = [];
    if (parametros.transporteNumCuotas > 0) {
      cuotasTransporteGeneradas = generarConfiguracionCuotas({
        numCuotas: parametros.transporteNumCuotas,
        diaVencimiento: parametros.transporteDiaDesde,
        anioEscolar: anioEscolar,
        saltarMeses: transporteSaltarMeses,
        mesInicio: transporteMesInicio,
      });
      
      // Validar que no haya números duplicados
      const numeros = cuotasTransporteGeneradas.map(c => c.numero);
      const numerosUnicos = new Set(numeros);
      if (numeros.length !== numerosUnicos.size) {
        console.error("Números de cuota duplicados:", numeros);
        setError("Error interno: números de cuota duplicados");
        return;
      }
      console.log("Cuotas transporte válidas, números:", numeros);
    }
    
    console.log("Cuotas colegiatura generadas:", cuotasColegiaturaGeneradas.length);
    console.log("Cuotas transporte generadas:", cuotasTransporteGeneradas.length);

    const parametrosLimpios = {
      valorInscripcion: Number(parametros.valorInscripcion),
      recargoPorcentaje: Number(parametros.recargoPorcentaje),
      colegiaturaNumCuotas: Number(parametros.colegiaturaNumCuotas),
      colegiaturaDiaDesde: Number(parametros.colegiaturaDiaDesde),
      colegiaturaDiaHasta: Number(parametros.colegiaturaDiaHasta),
      colegiaturaDiasGracia: Number(parametros.colegiaturaDiasGracia),
      transporteNumCuotas: Number(parametros.transporteNumCuotas),
      transporteDiaDesde: Number(parametros.transporteDiaDesde),
      transporteDiaHasta: Number(parametros.transporteDiaHasta),
      transporteDiasGracia: Number(parametros.transporteDiasGracia),
      transporteCompletoAnual: Number(parametros.transporteCompletoAnual),
      transporteMedioAnual: Number(parametros.transporteMedioAnual),
      transporteInscripcion: Number(parametros.transporteInscripcion),
    };

    const tarifasCursoLimpio = Object.values(tarifasCurso).map(tc => ({
      cursoId: Number(tc.cursoId),
      cuotaColegiatura: Number(tc.cuotaColegiatura),
      costoMateriales: Number(tc.costoMateriales),
    }));

    const payload = {
      anioEscolar: String(anioEscolar),
      parametros: parametrosLimpios,
      tarifasCurso: tarifasCursoLimpio,
      tarifasTransporte: [
        { tipo: "COMPLETO", valorAnual: Number(parametros.transporteCompletoAnual), inscripcion: Number(parametros.transporteInscripcion) },
        { tipo: "MEDIO (RECOGER)", valorAnual: Number(parametros.transporteMedioAnual), inscripcion: Number(parametros.transporteInscripcion) },
        { tipo: "MEDIO (LLEVAR)", valorAnual: Number(parametros.transporteMedioAnual), inscripcion: Number(parametros.transporteInscripcion) },
      ],
      actualizar,
    };

    try {
      let tarifaIdGuardada = tarifaId;
      let respuestaExitosa = false;
      
      // Intentar guardar/actualizar la tarifa
      const res = await fetch("/api/administracion/tarifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiereConfirmacion) {
        const confirmar = confirm(data.error);
        if (confirmar) {
          // Reintentar con actualizar=true
          const resRetry = await fetch("/api/administracion/tarifas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, actualizar: true }),
          });
          const dataRetry = await resRetry.json();
          if (!resRetry.ok) {
            setError(dataRetry.error);
            return;
          }
          tarifaIdGuardada = dataRetry.tarifaId;
          respuestaExitosa = true;
        } else {
          return;
        }
      } else if (!res.ok) {
        setError(data.error);
        return;
      } else {
        tarifaIdGuardada = data.tarifaId;
        respuestaExitosa = true;
      }
      
      if (!respuestaExitosa) return;

      // Pequeña pausa para asegurar que se guardó la tarifa
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Guardar configuración de cuotas de colegiatura
      if (tarifaIdGuardada && cuotasColegiaturaGeneradas.length > 0) {
        const resCuotas = await fetch("/api/administracion/configuracion-cuotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tarifaAnioId: tarifaIdGuardada,
            tipo: "COLEGIATURA",
            cuotas: cuotasColegiaturaGeneradas,
          }),
        });
        if (!resCuotas.ok) {
          console.error("Error guardando cuotas de colegiatura");
        }
      }

      // Pequeña pausa entre operaciones
      await new Promise(resolve => setTimeout(resolve, 500));

      // Guardar configuración de cuotas de transporte
      if (tarifaIdGuardada && cuotasTransporteGeneradas.length > 0) {
        console.log("Guardando cuotas de transporte para tarifaId:", tarifaIdGuardada);
        const resTransporte = await fetch("/api/administracion/configuracion-cuotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tarifaAnioId: tarifaIdGuardada,
            tipo: "TRANSPORTE",
            cuotas: cuotasTransporteGeneradas,
          }),
        });
        if (!resTransporte.ok) {
          const errorData = await resTransporte.json();
          console.error("Error guardando cuotas transporte:", errorData);
          setError("Error guardando configuración de cuotas de transporte");
          return;
        } else {
          console.log("Cuotas de transporte guardadas exitosamente");
        }
      }
      
      // Actualizar los estados con las cuotas generadas
      setCuotasConfig(cuotasColegiaturaGeneradas);
      setCuotasConfigTransporte(cuotasTransporteGeneradas);
      
      setExito(data.mensaje || "Tarifas guardadas exitosamente" + (cuotasTransporteGeneradas.length > 0 ? " (incluye cuotas de transporte)" : ""));
      
      // Recargar todo y salir del modo edición
      await cargarTodo();
      setModoEdicion(false);
      
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      console.error("Error al guardar tarifas:", error);
      setError("Ocurrió un error al guardar las tarifas. Intente nuevamente.");
    }
  };

  // Navegación
  const navegar = (direccion: "primero" | "anterior" | "siguiente" | "ultimo") => {
    if (tarifasLista.length === 0) return;
    let nuevoIndex = currentIndex;
    switch (direccion) {
      case "primero": nuevoIndex = 0; break;
      case "anterior": nuevoIndex = Math.max(0, currentIndex - 1); break;
      case "siguiente": nuevoIndex = Math.min(tarifasLista.length - 1, currentIndex + 1); break;
      case "ultimo": nuevoIndex = tarifasLista.length - 1; break;
    }
    if (nuevoIndex !== currentIndex) {
      setCurrentIndex(nuevoIndex);
      cargarTarifaEnFormulario(tarifasLista[nuevoIndex]);
      setModoEdicion(false);
    }
  };

  const nuevaTarifa = async () => {
    setModoEdicion(true);
    setBackupData(true);
    setTarifaId(null);
    setAnioEscolar("");
    setParametros({
      valorInscripcion: 2000,
      recargoPorcentaje: 6,
      colegiaturaNumCuotas: 11,
      colegiaturaDiaDesde: 25,
      colegiaturaDiaHasta: 30,
      colegiaturaDiasGracia: 5,
      transporteNumCuotas: 10,
      transporteDiaDesde: 25,
      transporteDiaHasta: 30,
      transporteDiasGracia: 5,
      transporteCompletoAnual: 24000,
      transporteMedioAnual: 12000,
      transporteInscripcion: 0,
    });
    inicializarTarifasCursos(cursos);
    setCuotasConfig([]);
    setCuotasConfigTransporte([]);
    setColegiaturaSaltarMeses(1);
    setColegiaturaMesInicio(9);
    setTransporteSaltarMeses(1);
    setTransporteMesInicio(9);

    // Desactivar tarifa anterior si existe
    const tarifaActiva = tarifasLista.find(t => t.activo);
    if (tarifaActiva) {
      try {
        await fetch(`/api/administracion/tarifas/${tarifaActiva.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: false })
        });
      } catch (error) {
        console.error("Error desactivando tarifa anterior:", error);
      }
    }

    // Recargar para reflejar el cambio
    await cargarTodo();
  };

  if (status === "loading" || cargando) {
    return <div style={styles.loading}>Cargando...</div>;
  }

  if (rol !== "ADMINISTRADOR") return null;

  return (
    <main style={styles.main}>
      <NavBar titulo="Tarifas del Año Escolar" icono="💰" userName={session?.user?.name} />
      <div style={styles.contenido}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.titulo}>Configuración de Tarifas</h1>
            <p style={styles.subtitulo}>Establece los valores para el año escolar actual</p>
          </div>
          {!modoEdicion && tarifasLista.length > 0 && (
            <button onClick={nuevaTarifa} style={styles.btnNuevo}>+ Nueva Tarifa</button>
          )}
        </div>

        {exito && <div style={styles.exito}>✅ {exito}</div>}
        {error && <div style={styles.error}>❌ {error}</div>}

        {/* Navegación por registros */}
        {tarifasLista.length > 0 && !modoEdicion && (
          <div style={styles.navegacionContainer}>
            <div style={styles.navegacion}>
              <button onClick={() => navegar("primero")} disabled={currentIndex === 0} style={styles.btnNav}>⏮ Primero</button>
              <button onClick={() => navegar("anterior")} disabled={currentIndex === 0} style={styles.btnNav}>◀ Anterior</button>
              <span style={styles.navInfo}>
                {currentIndex + 1} de {tarifasLista.length} - {tarifasLista[currentIndex]?.anioEscolar}
                {tarifasLista[currentIndex]?.activo && <span style={styles.badgeActivo}> ACTIVO</span>}
              </span>
              <button onClick={() => navegar("siguiente")} disabled={currentIndex === tarifasLista.length - 1} style={styles.btnNav}>Siguiente ▶</button>
              <button onClick={() => navegar("ultimo")} disabled={currentIndex === tarifasLista.length - 1} style={styles.btnNav}>Último ⏭</button>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div style={styles.formContainer}>
          {/* 1. Año Escolar */}
          <div style={styles.seccion}>
            <h2 style={styles.seccionTitulo}>📅 Año Escolar</h2>
            <div style={styles.row}>
              <label style={styles.label}>Año escolar *</label>
              <input
                type="text"
                placeholder="2025-2026"
                value={anioEscolar}
                onChange={(e) => setAnioEscolar(e.target.value)}
                style={styles.input}
                disabled={!modoEdicion && tarifasLista.length > 0}
              />
            </div>
          </div>

          {/* 2. Configuración de Cuotas */}
          <div style={styles.seccion}>
            <h2 style={styles.seccionTitulo}>⚙️ Configuración de Cuotas</h2>
            
            {/* Tarjetas de número de cuotas */}
            <div style={styles.cardsContainer}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🎓 Colegiatura</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de cuotas *</label>
                  <input 
                    type="number" 
                    value={parametros.colegiaturaNumCuotas} 
                    onChange={(e) => {
                      setParametros({...parametros, colegiaturaNumCuotas: parseInt(e.target.value)});
                      setTimeout(() => generarConfiguracionInicial(), 100);
                    }} 
                    style={styles.input} 
                    min="1" 
                    max="12"
                  />
                </div>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🚌 Transporte</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de cuotas</label>
                  <input 
                    type="number" 
                    value={parametros.transporteNumCuotas} 
                    onChange={(e) => {
                      setParametros({...parametros, transporteNumCuotas: parseInt(e.target.value)});
                      setTimeout(() => generarConfiguracionTransporte(), 100);
                    }} 
                    style={styles.input} 
                    min="1" 
                    max="12"
                  />
                </div>
              </div>
            </div>

            {/* Parámetros de generación de cuotas */}
            <div style={styles.parametrosGrid}>
              {/* Colegiatura */}
              <div style={styles.parametrosCard}>
                <h4 style={styles.parametrosTitle}>📅 Parámetros - Colegiatura</h4>
                <div style={styles.parametrosRow}>
                  <div style={styles.parametroItem}>
                    <label style={styles.labelSmall}>Saltar meses</label>
                    <input 
                      type="number" 
                      value={colegiaturaSaltarMeses} 
                      onChange={(e) => {
                        setColegiaturaSaltarMeses(parseInt(e.target.value));
                        setTimeout(() => generarConfiguracionInicial(), 100);
                      }} 
                      style={styles.inputSmall} 
                      min="1"
                    />
                    <span style={styles.hint}>1=mensual, 2=bimestral</span>
                  </div>
                  <div style={styles.parametroItem}>
                    <label style={styles.labelSmall}>Mes de inicio</label>
                    <select 
                      value={colegiaturaMesInicio} 
                      onChange={(e) => {
                        setColegiaturaMesInicio(parseInt(e.target.value));
                        setTimeout(() => generarConfiguracionInicial(), 100);
                      }} 
                      style={styles.inputSmall}
                    >
                      <option value={1}>Enero</option><option value={2}>Febrero</option>
                      <option value={3}>Marzo</option><option value={4}>Abril</option>
                      <option value={5}>Mayo</option><option value={6}>Junio</option>
                      <option value={7}>Julio</option><option value={8}>Agosto</option>
                      <option value={9}>Septiembre</option><option value={10}>Octubre</option>
                      <option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transporte */}
              <div style={styles.parametrosCard}>
                <h4 style={styles.parametrosTitle}>📅 Parámetros - Transporte</h4>
                <div style={styles.parametrosRow}>
                  <div style={styles.parametroItem}>
                    <label style={styles.labelSmall}>Saltar meses</label>
                    <input 
                      type="number" 
                      value={transporteSaltarMeses} 
                      onChange={(e) => {
                        setTransporteSaltarMeses(parseInt(e.target.value));
                        setTimeout(() => generarConfiguracionTransporte(), 100);
                      }} 
                      style={styles.inputSmall} 
                      min="1"
                    />
                    <span style={styles.hint}>1=mensual, 2=bimestral</span>
                  </div>
                  <div style={styles.parametroItem}>
                    <label style={styles.labelSmall}>Mes de inicio</label>
                    <select 
                      value={transporteMesInicio} 
                      onChange={(e) => {
                        setTransporteMesInicio(parseInt(e.target.value));
                        setTimeout(() => generarConfiguracionTransporte(), 100);
                      }} 
                      style={styles.inputSmall}
                    >
                      <option value={1}>Enero</option><option value={2}>Febrero</option>
                      <option value={3}>Marzo</option><option value={4}>Abril</option>
                      <option value={5}>Mayo</option><option value={6}>Junio</option>
                      <option value={7}>Julio</option><option value={8}>Agosto</option>
                      <option value={9}>Septiembre</option><option value={10}>Octubre</option>
                      <option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de cuotas de colegiatura */}
            {cuotasConfig.length > 0 && (
              <div style={styles.tablaSection}>
                <div style={styles.tablaHeader}>
                  <span style={styles.tablaIcon}>📊</span>
                  <h4 style={styles.tablaTitle}>Distribución de Cuotas - Colegiatura</h4>
                </div>
                <div style={styles.tablaWrap}>
                  <table style={styles.tabla}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={styles.th}>Cuota</th>
                        <th style={styles.th}>Mes</th>
                        <th style={styles.th}>Año</th>
                        <th style={styles.th}>Día Vencimiento</th>
                        <th style={styles.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasConfig.map((cuota, idx) => (
                        <tr key={idx}>
                          <td style={styles.td}>
                            <span style={styles.cuotaNumero}>#{cuota.numero}</span>
                          </td>
                          <td style={styles.td}>
                            <select 
                              value={cuota.mes} 
                              onChange={(e) => actualizarCuota(idx, "mes", parseInt(e.target.value))}
                              style={styles.selectSmall}
                            >
                              <option value={1}>Enero</option><option value={2}>Febrero</option>
                              <option value={3}>Marzo</option><option value={4}>Abril</option>
                              <option value={5}>Mayo</option><option value={6}>Junio</option>
                              <option value={7}>Julio</option><option value={8}>Agosto</option>
                              <option value={9}>Septiembre</option><option value={10}>Octubre</option>
                              <option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                            </select>
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              value={cuota.anio ?? new Date().getFullYear()} 
                              onChange={(e) => actualizarCuota(idx, "anio", parseInt(e.target.value)  || new Date().getFullYear())} 
                              style={styles.inputTiny} 
                            />
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              value={cuota.dia ?? 25} 
                              onChange={(e) => actualizarCuota(idx, "dia", parseInt(e.target.value) || 25)} 
                              style={styles.inputTiny} 
                              min="1" 
                              max="31" 
                            />
                          </td>
                          <td style={styles.td}>
                            <span style={styles.fechaBadge}>
                              {obtenerFechaCuotaFormateada(cuota.anio, cuota.mes - 1, cuota.dia)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de cuotas de transporte */}
            {cuotasConfigTransporte.length > 0 && (
              <div style={styles.tablaSection}>
                <div style={styles.tablaHeader}>
                  <span style={styles.tablaIcon}>🚌</span>
                  <h4 style={styles.tablaTitle}>Distribución de Cuotas - Transporte</h4>
                </div>
                <div style={styles.tablaWrap}>
                  <table style={styles.tabla}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={styles.th}>Cuota</th>
                        <th style={styles.th}>Mes</th>
                        <th style={styles.th}>Año</th>
                        <th style={styles.th}>Día Vencimiento</th>
                        <th style={styles.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasConfigTransporte.map((cuota, idx) => (
                        <tr key={idx}>
                          <td style={styles.td}>
                            <span style={styles.cuotaNumero}>#{cuota.numero}</span>
                          </td>
                          <td style={styles.td}>
                            <select 
                              value={cuota.mes} 
                              onChange={(e) => {
                                const nuevas = [...cuotasConfigTransporte];
                                nuevas[idx] = { ...nuevas[idx], mes: parseInt(e.target.value) };
                                setCuotasConfigTransporte(nuevas);
                              }}
                              style={styles.selectSmall}
                            >
                              <option value={1}>Enero</option><option value={2}>Febrero</option>
                              <option value={3}>Marzo</option><option value={4}>Abril</option>
                              <option value={5}>Mayo</option><option value={6}>Junio</option>
                              <option value={7}>Julio</option><option value={8}>Agosto</option>
                              <option value={9}>Septiembre</option><option value={10}>Octubre</option>
                              <option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                            </select>
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              value={cuota.anio ?? new Date().getFullYear()} 
                              onChange={(e) => {
                                const nuevas = [...cuotasConfigTransporte];
                                nuevas[idx] = { ...nuevas[idx], anio: parseInt(e.target.value) || new Date().getFullYear() };
                                setCuotasConfigTransporte(nuevas);
                              }} 
                              style={styles.inputTiny} 
                            />
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              value={cuota.dia ?? 25} 
                              onChange={(e) => {
                                const nuevas = [...cuotasConfigTransporte];
                                nuevas[idx] = { ...nuevas[idx], dia: parseInt(e.target.value) || 25 };
                                setCuotasConfigTransporte(nuevas);
                              }} 
                              style={styles.inputTiny} 
                              min="1" 
                              max="31" 
                            />
                          </td>
                          <td style={styles.td}>
                            <span style={styles.fechaBadge}>
                              {obtenerFechaCuotaFormateada(cuota.anio, cuota.mes, cuota.dia)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 3. Parámetros Generales */}
          <div style={styles.seccion}>
            <h2 style={styles.seccionTitulo}>📊 Parámetros Generales</h2>
            <div style={styles.grid3}>
              <div>
                <label style={styles.label}>Valor inscripción (RD$) *</label>
                <input 
                  type="number" 
                  value={parametros.valorInscripcion} 
                  onChange={(e) => setParametros({...parametros, valorInscripcion: parseFloat(e.target.value)})} 
                  style={styles.input} 
                  step="0.01"
                />
              </div>
              <div>
                <label style={styles.label}>Recargo por mora (%)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  value={parametros.recargoPorcentaje} 
                  onChange={(e) => setParametros({...parametros, recargoPorcentaje: parseFloat(e.target.value)})} 
                  style={styles.input} 
                />
              </div>
              <div>
                <label style={styles.label}>Días desde</label>
                <input 
                  type="number" 
                  value={parametros.colegiaturaDiaDesde} 
                  onChange={(e) => setParametros({...parametros, colegiaturaDiaDesde: parseInt(e.target.value)})} 
                  style={styles.input} 
                  min="1" 
                  max="31"
                />
                <small style={styles.small}>Aplica a colegiatura y transporte</small>
              </div>
              <div>
                <label style={styles.label}>Días hasta</label>
                <input 
                  type="number" 
                  value={parametros.colegiaturaDiaHasta} 
                  onChange={(e) => setParametros({...parametros, colegiaturaDiaHasta: parseInt(e.target.value)})} 
                  style={styles.input} 
                  min="1" 
                  max="31"
                />
              </div>
              <div>
                <label style={styles.label}>Días de gracia</label>
                <input 
                  type="number" 
                  value={parametros.colegiaturaDiasGracia} 
                  onChange={(e) => setParametros({...parametros, colegiaturaDiasGracia: parseInt(e.target.value)})} 
                  style={styles.input} 
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 4. Colegiatura - Tarifas por Curso */}
          <div style={styles.seccion}>
            <h2 style={styles.seccionTitulo}>🎓 Colegiatura - Tarifas por Curso</h2>
            <div style={styles.tablaWrap}>
              <table style={styles.tabla}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Curso</th>
                    <th style={styles.th}>Nivel</th>
                    <th style={styles.th}>Cuota colegiatura (RD$)</th>
                    <th style={styles.th}>Costo materiales (RD$)</th>
                  </tr>
                </thead>
                <tbody>
                  {cursos.map((curso) => (
                    <tr key={curso.id}>
                      <td style={styles.td}>{curso.codigo}</td>
                      <td style={styles.td}>{curso.grado}</td>
                      <td style={styles.td}>{curso.nivel}</td>
                      <td style={styles.td}>
                        <input 
                          type="number" 
                          value={tarifasCurso[curso.id]?.cuotaColegiatura || 0} 
                          onChange={(e) => actualizarTarifaCurso(curso.id, "cuotaColegiatura", parseFloat(e.target.value))} 
                          style={styles.inputSmall} 
                          step="0.01"
                        />
                      </td>
                      <td style={styles.td}>
                        <input 
                          type="number" 
                          value={tarifasCurso[curso.id]?.costoMateriales || 0} 
                          onChange={(e) => actualizarTarifaCurso(curso.id, "costoMateriales", parseFloat(e.target.value))} 
                          style={styles.inputSmall} 
                          step="0.01"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Transporte Escolar */}
          <div style={styles.seccion}>
            <h2 style={styles.seccionTitulo}>🚌 Transporte Escolar</h2>
            <div style={styles.grid3}>
              <div>
                <label style={styles.label}>Inscripción transporte (RD$)</label>
                <input 
                  type="number" 
                  value={parametros.transporteInscripcion} 
                  onChange={(e) => setParametros({...parametros, transporteInscripcion: parseFloat(e.target.value)})} 
                  style={styles.input} 
                  step="0.01"
                />
              </div>
              <div>
                <label style={styles.label}>Transporte completo (anual)</label>
                <input 
                  type="number" 
                  value={parametros.transporteCompletoAnual} 
                  onChange={(e) => setParametros({...parametros, transporteCompletoAnual: parseFloat(e.target.value)})} 
                  style={styles.input} 
                  step="0.01"
                />
              </div>
              <div>
                <label style={styles.label}>½ Transporte (anual)</label>
                <input 
                  type="number" 
                  value={parametros.transporteMedioAnual} 
                  onChange={(e) => setParametros({...parametros, transporteMedioAnual: parseFloat(e.target.value)})} 
                  style={styles.input} 
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div style={styles.botonesContainer}>
            {modoEdicion ? (
              <>
                <button onClick={() => {
                  setModoEdicion(false);
                  if (tarifasLista.length > 0 && currentIndex >= 0) {
                    cargarTarifaEnFormulario(tarifasLista[currentIndex]);
                  } else if (tarifasLista.length > 0) {
                    setCurrentIndex(0);
                    cargarTarifaEnFormulario(tarifasLista[0]);
                  }
                }} style={styles.btnCancelar}>
                  Cancelar
                </button>
                <button onClick={() => guardarTarifas(false)} style={styles.btnGuardar}>
                  💾 Guardar Tarifas
                </button>
              </>
            ) : (
              tarifasLista.length > 0 && (
                <button onClick={() => setModoEdicion(true)} style={styles.btnEditar}>
                  ✏️ Editar Tarifa
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1400px", margin: "0 auto", padding: "28px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  subtitulo: { fontSize: "13px", color: "#666", marginTop: "4px" },
  btnNuevo: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontWeight: "bold" },
  exito: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  error: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  navegacionContainer: { background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflowX: "auto" as any },
  navegacion: { display: "flex", gap: "12px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  btnNav: { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  navInfo: { fontSize: "14px", fontWeight: "bold", color: "#2C1810", minWidth: "220px", textAlign: "center" },
  badgeActivo: { background: "#276749", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", marginLeft: "8px" },
  formContainer: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  seccion: { marginBottom: "32px", borderBottom: "1px solid #eee", paddingBottom: "24px" },
  seccionTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", marginBottom: "16px" },
  subtituloTabla: { fontSize: "14px", fontWeight: "bold", color: "#2C1810", marginBottom: "12px" },
  row: { marginBottom: "16px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  card: { background: "#f8f9fa", borderRadius: "8px", padding: "16px", border: "1px solid #e0e0e0" },
  cardTitle: { fontSize: "15px", fontWeight: "bold", color: "#2C1810", marginBottom: "12px" },
  cardsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" },
  parametrosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" },
  parametrosCard: { background: "#f8f9fa", borderRadius: "10px", padding: "16px", border: "1px solid #e9ecef" },
  parametrosTitle: { fontSize: "13px", fontWeight: "bold", color: "#2C1810", margin: "0 0 12px 0", paddingBottom: "8px", borderBottom: "1px dashed #dee2e6" },
  parametrosRow: { display: "flex", gap: "16px", flexWrap: "wrap" as any },
  parametroItem: { flex: 1, minWidth: "140px" },
  labelSmall: { display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "bold", color: "#555" },
  hint: { fontSize: "10px", color: "#888", display: "block", marginTop: "4px" },
  selectSmall: { width: "130px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", backgroundColor: "#fff" },
  inputTiny: { width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "center" as any },
  tablaSection: { marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "20px" },
  tablaHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  tablaIcon: { fontSize: "18px" },
  tablaTitle: { fontSize: "14px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  cuotaNumero: { fontWeight: "bold", color: "#2C1810", backgroundColor: "#f0f0f0", padding: "2px 8px", borderRadius: "20px", fontSize: "11px" },
  fechaBadge: { backgroundColor: "#EBF3FB", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", color: "#2C1810", fontWeight: "500" },
  formGroup: { marginBottom: "12px" },
  label: { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold", color: "#555" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" as any },
  inputSmall: { width: "100%", minWidth: "100px", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  tablaWrap: { overflowX: "auto", marginTop: "16px" },
  tabla: { width: "100%", borderCollapse: "collapse", minWidth: "600px" },
  thead: { background: "linear-gradient(135deg, #2C1810, #4a2518)" },
  th: { padding: "12px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 12px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  small: { fontSize: "11px", color: "#888", display: "block", marginTop: "4px" },
  botonesContainer: { display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" },
  btnEditar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" },
  btnCancelar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" },
  btnGuardar: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" },
};
