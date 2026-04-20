"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generarConfiguracionCuotas, type ConfiguracionCuota } from "@/lib/generar-cuotas";

type Curso = { id: number; codigo: string; grado: string; nivel: string };
type TarifaCurso = { cursoId: number; cuotaColegiatura: number; costoMateriales: number };

export default function TarifasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [tarifaId, setTarifaId] = useState<number | null>(null);

  // Estados para configuración de cuotas
  const [mostrarConfigCuotas, setMostrarConfigCuotas] = useState(false);
  const [cuotasConfig, setCuotasConfig] = useState<ConfiguracionCuota[]>([]);
  const [colegiaturaSaltarMeses, setColegiaturaSaltarMeses] = useState(1);
  const [colegiaturaMesInicio, setColegiaturaMesInicio] = useState(9); // Septiembre

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (rol !== "ADMINISTRADOR") router.push("/dashboard");
  }, [status, rol]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar cursos para mostrar en la tabla y asignar tarifas
      const resCursos = await fetch("/api/academico/cursos");
      const dataCursos = await resCursos.json();
      setCursos(dataCursos.cursos || []);

      // Cargar tarifa activa
      const resTarifa = await fetch("/api/administracion/tarifas");
      const dataTarifa = await resTarifa.json();
      const tarifaActiva = dataTarifa.tarifaActiva;
      
      if (tarifaActiva) {
        setTarifaId(tarifaActiva.id);
        setAnioEscolar(tarifaActiva.anioEscolar);
        setParametros({
          valorInscripcion: tarifaActiva.valorInscripcion,
          recargoPorcentaje: tarifaActiva.recargoPorcentaje,
          colegiaturaNumCuotas: tarifaActiva.colegiaturaNumCuotas,
          colegiaturaDiaDesde: tarifaActiva.colegiaturaDiaDesde,
          colegiaturaDiaHasta: tarifaActiva.colegiaturaDiaHasta,
          colegiaturaDiasGracia: tarifaActiva.colegiaturaDiasGracia,
          transporteNumCuotas: tarifaActiva.transporteNumCuotas,
          transporteDiaDesde: tarifaActiva.transporteDiaDesde,
          transporteDiaHasta: tarifaActiva.transporteDiaHasta,
          transporteDiasGracia: tarifaActiva.transporteDiasGracia,
          transporteCompletoAnual: dataTarifa.tarifasTransporte?.find((t: any) => t.tipo === "COMPLETO")?.valorAnual || 24000,
          transporteMedioAnual: dataTarifa.tarifasTransporte?.find((t: any) => t.tipo === "MEDIO (RECOGER)")?.valorAnual || 12000,
          transporteInscripcion: dataTarifa.tarifasTransporte?.find((t: any) => t.tipo === "COMPLETO")?.inscripcion || 0,
        });
        
        // Cargar configuración de cuotas guardada
        const resConfig = await fetch(`/api/administracion/configuracion-cuotas?tarifaAnioId=${tarifaActiva.id}&tipo=COLEGIATURA`);
        const dataConfig = await resConfig.json();
        
        if (dataConfig.configuraciones && dataConfig.configuraciones.length > 0) {
          setCuotasConfig(dataConfig.configuraciones.map((c: any) => ({
            numero: c.numeroCuota,
            mes: c.mes,
            anio: c.anio,
            dia: c.diaVencimiento,
          })));
        } else if (anioEscolar) {
          generarConfiguracionInicial();
        }
      }

      // Inicializar tarifas por curso
      const tarifasDefault: Record<number, TarifaCurso> = {};
      for (const curso of dataCursos.cursos || []) {
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
    } catch (error) {
       console.error("Error cargando datos:", error);
      setCargando(false);
    } finally {
      setCargando(false);
    }
  };

  const generarConfiguracionInicial = () => {
    if (!anioEscolar) {
      setError("Primero debe especificar el año escolar");
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

  const actualizarCuota = (index: number, campo: keyof ConfiguracionCuota, valor: number) => {
    setCuotasConfig(prev => prev.map((c, i) => 
      i === index ? { ...c, [campo]: valor } : c
    ));
  };

  const guardarConfigCuotas = async () => {
    if (!tarifaId) {
      setError("Primero debe guardar la tarifa");
      return;
    }

    const res = await fetch("/api/administracion/configuracion-cuotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarifaAnioId: tarifaId,
        tipo: "COLEGIATURA",
        cuotas: cuotasConfig,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setExito("Configuración de cuotas guardada");
      setTimeout(() => setExito(""), 3000);
    }
  };

  const actualizarTarifaCurso = (cursoId: number, campo: string, valor: number) => {
    setTarifasCurso(prev => ({
      ...prev,
      [cursoId]: { ...prev[cursoId], [campo]: valor }
    }));
  };

  const guardarTarifas = async (actualizar: boolean) => {
    setError("");
    setExito("");
    
    if (!anioEscolar) {
      setError("Debe especificar el año escolar (ej: 2025-2026)");
      return;
    }

    // Crear una copia limpia de parametros
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

    // Crear copia limpia de tarifasCurso
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
      cuotasConfig: cuotasConfig,
      actualizar,
    };

    try {
      const res = await fetch("/api/administracion/tarifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiereConfirmacion) {
        const confirmar = confirm(data.error);
        if (confirmar) {
          guardarTarifas(true);
        }
        return;
      }

      if (!res.ok) {
        setError(data.error);
      } else {
        setExito(data.mensaje);
        setTarifaId(data.tarifaId);
        cargarDatos();
        setTimeout(() => setExito(""), 3000);
      }
    } catch (error) {
      console.error("Error al guardar tarifas:", error);
      setError("Ocurrió un error al guardar las tarifas. Intente nuevamente.");
    }
  };

  if (status === "loading" || cargando) {
    return <div style={styles.loading}>Cargando...</div>;
  }

  if (rol !== "ADMINISTRADOR") {
    return null;
  }

  return (
    <main style={styles.main}>
      <nav style={styles.nav}>
        <Link href="/dashboard/administracion" style={styles.navBack}>← Volver a Administración</Link>
        <span style={styles.navTitle}>💰 Tarifas del Año Escolar</span>
        <span style={styles.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={styles.contenido}>
        <h1 style={styles.titulo}>Configuración de Tarifas</h1>
        <p style={styles.subtitulo}>Establece los valores para el año escolar actual</p>

        {exito && <div style={styles.exito}>✅ {exito}</div>}
        {error && <div style={styles.error}>❌ {error}</div>}

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
            />
          </div>
        </div>

        <div style={styles.seccion}>
          <h2 style={styles.seccionTitulo}>⚙️ Parámetros Generales</h2>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Valor inscripción (RD$)</label>
              <input type="number" value={parametros.valorInscripcion} onChange={(e) => setParametros({...parametros, valorInscripcion: parseFloat(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Recargo por mora (%)</label>
              <input type="number" step="0.5" value={parametros.recargoPorcentaje} onChange={(e) => setParametros({...parametros, recargoPorcentaje: parseFloat(e.target.value)})} style={styles.input} />
            </div>
          </div>
        </div>

        <div style={styles.seccion}>
          <h2 style={styles.seccionTitulo}>📚 Tarifas por Curso</h2>
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
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={tarifasCurso[curso.id]?.costoMateriales || 0}
                        onChange={(e) => actualizarTarifaCurso(curso.id, "costoMateriales", parseFloat(e.target.value))}
                        style={styles.inputSmall}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.seccion}>
          <h2 style={styles.seccionTitulo}>📖 Colegiatura</h2>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Número de cuotas</label>
              <input type="number" value={parametros.colegiaturaNumCuotas} onChange={(e) => setParametros({...parametros, colegiaturaNumCuotas: parseInt(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Día desde</label>
              <input type="number" value={parametros.colegiaturaDiaDesde} onChange={(e) => setParametros({...parametros, colegiaturaDiaDesde: parseInt(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Día hasta</label>
              <input type="number" value={parametros.colegiaturaDiaHasta} onChange={(e) => setParametros({...parametros, colegiaturaDiaHasta: parseInt(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Días de gracia</label>
              <input type="number" value={parametros.colegiaturaDiasGracia} onChange={(e) => setParametros({...parametros, colegiaturaDiasGracia: parseInt(e.target.value)})} style={styles.input} />
            </div>
          </div>
        </div>

        {/* Configuración de Cuotas (desplegable) */}
        <div style={styles.seccion}>
          <h3 
            style={{ ...styles.seccionTitulo, cursor: "pointer" }} 
            onClick={() => setMostrarConfigCuotas(!mostrarConfigCuotas)}
          >
            📅 Configuración de Cuotas {mostrarConfigCuotas ? "▲" : "▼"}
          </h3>
          
          {mostrarConfigCuotas && (
            <div>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Saltar meses</label>
                  <input 
                    type="number" 
                    value={colegiaturaSaltarMeses} 
                    onChange={(e) => setColegiaturaSaltarMeses(parseInt(e.target.value))}
                    style={styles.input}
                    min="1"
                  />
                  <small style={{ fontSize: "11px", color: "#888" }}>1 = mensual, 2 = bimestral</small>
                </div>
                <div>
                  <label style={styles.label}>Mes de inicio</label>
                  <select 
                    value={colegiaturaMesInicio} 
                    onChange={(e) => setColegiaturaMesInicio(parseInt(e.target.value))}
                    style={styles.input}
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

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <button onClick={generarConfiguracionInicial} style={styles.btnGenerar}>
                  🔄 Generar desde parámetros
                </button>
              </div>
              
              <div style={styles.tablaWrap}>
                <table style={styles.tabla}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>Cuota</th>
                      <th style={styles.th}>Mes</th>
                      <th style={styles.th}>Año</th>
                      <th style={styles.th}>Día</th>
                      <th style={styles.th}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuotasConfig.map((cuota, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>CUOTA {cuota.numero}/{parametros.colegiaturaNumCuotas}</td>
                        <td style={styles.td}>
                          <select 
                            value={cuota.mes} 
                            onChange={(e) => actualizarCuota(idx, "mes", parseInt(e.target.value))}
                            style={styles.inputSmall}
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
                          <input type="number" value={cuota.anio} onChange={(e) => actualizarCuota(idx, "anio", parseInt(e.target.value))} style={styles.inputSmall} />
                        </td>
                        <td style={styles.td}>
                          <input type="number" value={cuota.dia} onChange={(e) => actualizarCuota(idx, "dia", parseInt(e.target.value))} style={styles.inputSmall} min="1" max="31" />
                        </td>
                        <td style={styles.td}>
                          {new Date(cuota.anio, cuota.mes - 1, cuota.dia).toLocaleDateString("es-DO")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <button onClick={guardarConfigCuotas} style={styles.btnGuardarCuotas}>
                  💾 Guardar configuración de cuotas
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.seccion}>
          <h2 style={styles.seccionTitulo}>🚌 Transporte Escolar</h2>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Inscripción transporte (RD$)</label>
              <input type="number" value={parametros.transporteInscripcion} onChange={(e) => setParametros({...parametros, transporteInscripcion: parseFloat(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Transporte completo (anual)</label>
              <input type="number" value={parametros.transporteCompletoAnual} onChange={(e) => setParametros({...parametros, transporteCompletoAnual: parseFloat(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>½ Transporte (anual)</label>
              <input type="number" value={parametros.transporteMedioAnual} onChange={(e) => setParametros({...parametros, transporteMedioAnual: parseFloat(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Número de cuotas transporte</label>
              <input type="number" value={parametros.transporteNumCuotas} onChange={(e) => setParametros({...parametros, transporteNumCuotas: parseInt(e.target.value)})} style={styles.input} />
            </div>
          </div>
        </div>

        <button onClick={() => guardarTarifas(false)} style={styles.btnGuardar}>
          💾 Guardar Tarifas del Año Escolar
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1000px", margin: "0 auto", padding: "28px 20px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", marginBottom: "24px" },
  exito: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  error: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  seccion: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  seccionTitulo: { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 16px", borderBottom: "2px solid #1F5C99", paddingBottom: "8px" },
  row: { marginBottom: "16px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  label: { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold", color: "#555" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" },
  inputSmall: { width: "120px", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", textAlign: "right" as any },
  tablaWrap: { overflowX: "auto" as any },
  tabla: { width: "100%", borderCollapse: "collapse" as any },
  thead: { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)" },
  th: { padding: "10px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td: { padding: "8px 10px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  buttonContainer: { textAlign: "center", marginTop: "32px" },
  btnGuardar: { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
  btnSecundario: { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", marginRight: "8px", marginBottom: "16px" },
  btnConfigCuotas: {  background: "#E6A017",  color: "#fff",  border: "none",  borderRadius: "6px",  padding: "10px 20px",  fontSize: "14px",  fontWeight: "bold",  cursor: "pointer",  marginRight: "12px",  marginBottom: "16px", },
  btnGenerar: {  background: "#2F855A",  color: "#fff",  border: "none",  borderRadius: "6px",  padding: "8px 16px",  fontSize: "13px",  cursor: "pointer",  marginRight: "8px",  marginBottom: "16px", },
  btnGuardarCuotas: { background: "#1F5C99", color: "#fff", border: "none",  borderRadius: "6px",  padding: "10px 20px",  fontSize: "14px",  fontWeight: "bold",  cursor: "pointer",  marginTop: "16px", },
};
