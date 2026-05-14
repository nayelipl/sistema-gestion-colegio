"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useInformes } from "@/hooks/useInformes";
import { ModalInforme } from "@/components/Modales/ModalInforme";
import { formatFechaLarga } from "@/lib/formatear-fecha";

type Tab = "filtros" | "informes";

type Cargo = {
  id: number;
  cargoNo: string;
  tipo: string;
  valorCargo: number;
  recargo: number;
  montoTotal: number;
  fechaVencimiento: string;
  montoPagado: number;
  saldoPendiente: number;
  estado: string;
  fechaUltimoPago: string | null;
  actualizadoEn: string;
  estudiante?: { nombre: string; apellido: string; codigo: string };
};

type CuentaPorCobrar = {
  tutorId: number;
  cuenta: string;
  tutor: string;
  cargos: Cargo[];
  totalMonto: number;
  totalPagado: number;
};

export default function CuentasPorCobrarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  // Tabs
  const [tab, setTab] = useState<Tab>("filtros");

  // Estados para filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [cuotasVencidas, setCuotasVencidas] = useState("");
  const [cursosSeleccionados, setCursosSeleccionados] = useState<number[]>([]);
  const [aniosEscolaresSeleccionadosDesde, setAniosEscolaresSeleccionadosDesde] = useState<string[]>([]);
  const [aniosEscolaresSeleccionadosHasta, setAniosEscolaresSeleccionadosHasta] = useState<string[]>([]);
  const [cursos, setCursos] = useState<Array<{ id: number; grado: string; nivel: string; codigo: string }>>([]);
  const [aniosEscolares, setAniosEscolares] = useState<Array<{ id: number; anioEscolar: string; activo: boolean }>>([]);
  const [mostrarAnulados, setMostrarAnulados] = useState(false);

  // Estados para dropdowns
  const [mostrarDropdownCursos, setMostrarDropdownCursos] = useState(false);
  const [mostrarDropdownAniosDesde, setMostrarDropdownAniosDesde] = useState(false);
  const [mostrarDropdownAniosHasta, setMostrarDropdownAniosHasta] = useState(false);
  const cursosDropdownRef = useRef<HTMLDivElement>(null);
  const aniosDesdeDropdownRef = useRef<HTMLDivElement>(null);
  const aniosHastaDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para datos de FILTROS
  const [cuentasFiltros, setCuentasFiltros] = useState<CuentaPorCobrar[]>([]);
  const [totalPendienteFiltros, setTotalPendienteFiltros] = useState(0);
  const [totalCobradoFiltros, setTotalCobradoFiltros] = useState(0);
  const [cargandoFiltros, setCargandoFiltros] = useState(true);

  // Estados para datos de INFORME
  const [cuentasInforme, setCuentasInforme] = useState<CuentaPorCobrar[]>([]);
  const [totalPendienteInforme, setTotalPendienteInforme] = useState(0);
  const [totalCobradoInforme, setTotalCobradoInforme] = useState(0);
  const [cargandoInforme, setCargandoInforme] = useState(false);

  // Estado general
  const [informeSeleccionado, setInformeSeleccionado] = useState<any>(null);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");
  const [paginaActualInformes, setPaginaActualInformes] = useState(1);

  // Columnas visibles
  const [columnas, setColumnas] = useState({
    numero: true,
    cuenta: true,
    tutor: true,
    cargoNo: true,
    valorCargo: true,
    cantidadCuotas: true,
    monto: true,
    fechaVencimiento: true,
    fechaPago: true,
    montoPago: true,
    balance: true,
    estado: true,
    actualizadoEn: true,
  });

  const tieneCursosSeleccionados = cursosSeleccionados.length > 0;
  const tieneAniosDesdeSeleccionados = aniosEscolaresSeleccionadosDesde.length > 0;
  const tieneAniosHastaSeleccionados = aniosEscolaresSeleccionadosHasta.length > 0;

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR"];

  const {
    informes,
    mostrarModalGuardar,
    informeEditando,
    tituloInforme,
    descripcionInforme,
    setMostrarModalGuardar,
    setTituloInforme,
    setDescripcionInforme,
    setInformeEditando,
    guardarInforme,
    anularInforme,
    eliminarInforme,
    editarInforme,
    cargarInformes,
  } = useInformes({
    endpoint: "/api/financiero/informes-cuentas",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    cargarCursos();
    cargarAniosEscolares();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cursosDropdownRef.current && !cursosDropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownCursos(false);
      }
      if (aniosDesdeDropdownRef.current && !aniosDesdeDropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownAniosDesde(false);
      }
      if (aniosHastaDropdownRef.current && !aniosHastaDropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownAniosHasta(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarCursos = async () => {
    try {
      const res = await fetch("/api/academico/secciones");
      const data = await res.json();
      const secciones = data.secciones || [];
      const cursosUnicos = new Map();
      secciones.forEach((seccion: any) => {
        if (seccion.curso && !cursosUnicos.has(seccion.curso.id)) {
          cursosUnicos.set(seccion.curso.id, {
            id: seccion.curso.id,
            grado: seccion.curso.grado,
            nivel: seccion.curso.nivel,
            codigo: seccion.curso.codigo
          });
        }
      });
      setCursos(Array.from(cursosUnicos.values()));
    } catch (error) {
      console.error("Error cargando cursos:", error);
    }
  };

  const cargarAniosEscolares = async () => {
    try {
      const res = await fetch("/api/administracion/anios-escolares");
      const data = await res.json();
      setAniosEscolares(data);
    } catch (error) {
      console.error("Error cargando años escolares:", error);
    }
  };

  const cargarCuentas = async () => {
    setCargandoFiltros(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (tipo !== "TODOS") params.append("tipo", tipo);
      if (cuotasVencidas) params.append("cuotasVencidas", cuotasVencidas);
      if (cursosSeleccionados.length > 0) {
        cursosSeleccionados.forEach(c => params.append("cursoIds", c.toString()));
      }
      if (aniosEscolaresSeleccionadosDesde.length > 0) {
        const añosOrdenados = [...aniosEscolaresSeleccionadosDesde].sort();
        params.append("anioEscolarDesde", añosOrdenados[0]);
      }
      if (aniosEscolaresSeleccionadosHasta.length > 0) {
        const añosOrdenados = [...aniosEscolaresSeleccionadosHasta].sort();
        params.append("anioEscolarHasta", añosOrdenados[añosOrdenados.length - 1]);
      }

      if (cursosSeleccionados.length === 0 && aniosEscolaresSeleccionadosDesde.length === 0 && aniosEscolaresSeleccionadosHasta.length === 0) {
        setCuentasFiltros([]);
        setTotalPendienteFiltros(0);
        setTotalCobradoFiltros(0);
        setError("⚠️ Seleccione al menos un curso o un año escolar para filtrar");
        setCargandoFiltros(false);
        return;
      }

      const res = await fetch(`/api/financiero/cuentas-por-cobrar?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCuentasFiltros(data.cuentas || []);
      setTotalPendienteFiltros(data.totalPendiente || 0);
      setTotalCobradoFiltros(data.totalCobrado || 0);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al cargar cuentas por cobrar");
    } finally {
      setCargandoFiltros(false);
    }
  };

  const handleCursoToggle = (cursoId: number) => {
    setCursosSeleccionados(
      prev => prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId]);
  };

  const seleccionarTodosCursos = () => {
    setCursosSeleccionados(cursosSeleccionados.length === cursos.length ? [] : cursos.map(c => c.id));
  };

  const handleAnioDesdeToggle = (anio: string) => {
    setAniosEscolaresSeleccionadosDesde(
      prev => prev.includes(anio) ? prev.filter(a => a !== anio) : [...prev, anio]);
  };

  const seleccionarTodosAniosDesde = () => {
    setAniosEscolaresSeleccionadosDesde(
      aniosEscolaresSeleccionadosDesde.length === aniosEscolares.length ? [] : aniosEscolares.map(a => a.anioEscolar));
  };

  const handleAnioHastaToggle = (anio: string) => {
    setAniosEscolaresSeleccionadosHasta(
      prev => prev.includes(anio) ? prev.filter(a => a !== anio) : [...prev, anio]);
  };

  const seleccionarTodosAniosHasta = () => {
    setAniosEscolaresSeleccionadosHasta(
      aniosEscolaresSeleccionadosHasta.length === aniosEscolares.length ? [] : aniosEscolares.map(a => a.anioEscolar));
  };

  const aplicarFiltros = () => cargarCuentas();

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setTipo("TODOS");
    setCuotasVencidas("");
    setCursosSeleccionados([]);
    setAniosEscolaresSeleccionadosDesde([]);
    setAniosEscolaresSeleccionadosHasta([]);
    setCuentasFiltros([]);
    setTotalPendienteFiltros(0);
    setTotalCobradoFiltros(0);
  };

  const verInforme = (informe: any) => {
    try {
      setCargandoInforme(true);
      let datos = informe.datos;
      if (typeof datos === 'string') datos = JSON.parse(datos);
      if (!Array.isArray(datos)) {
        setError("Error: Los datos del informe no son válidos");
        return;
      }

      const datosNormalizados = datos.map((cuenta: any) => ({
        tutorId: cuenta.tutorId,
        cuenta: cuenta.cuenta,
        tutor: cuenta.tutor,
        totalMonto: Number(cuenta.totalMonto) || 0,
        totalPagado: Number(cuenta.totalPagado) || 0,
        cargos: (cuenta.cargos || []).map((cargo: any) => ({
          id: cargo.id,
          cargoNo: cargo.cargoNo,
          tipo: cargo.tipo,
          valorCargo: cargo.valorCargo ? Number(cargo.valorCargo) : 0,
          recargo: Number(cargo.recargo) || 0,
          montoTotal: Number(cargo.montoTotal) || 0,
          fechaVencimiento: cargo.fechaVencimiento,
          montoPagado: Number(cargo.montoPagado) || 0,
          saldoPendiente: Number(cargo.saldoPendiente) || 0,
          estado: cargo.estado,
          fechaUltimoPago: cargo.fechaUltimoPago,
          actualizadoEn: cargo.actualizadoEn,
          estudiante: cargo.estudiante,
        })),
      }));

      let anioEscolar = informe.anioEscolar || "No definido";
      if (informe.fechaDesde && informe.fechaHasta) {
        const fechaDesdeAnio = new Date(informe.fechaDesde).getFullYear();
        const fechaHastaAnio = new Date(informe.fechaHasta).getFullYear();
        if (fechaDesdeAnio !== fechaHastaAnio) {
          anioEscolar = `${anioEscolar} (${fechaDesdeAnio}-${fechaHastaAnio})`;
        }
      }

      setInformeSeleccionado({
        titulo: informe.titulo,
        descripcion: informe.descripcion,
        fechaDesde: informe.fechaDesde,
        fechaHasta: informe.fechaHasta,
        creadoPor: informe.creador?.nombre || "Usuario",
        creadoEn: informe.creadoEn,
        anioEscolar: anioEscolar,
      });

      setCuentasInforme(datosNormalizados);

      const totalPendienteCalc = datosNormalizados.reduce((sum, t) => sum + (t.totalMonto - t.totalPagado), 0);
      const totalCobradoCalc = datosNormalizados.reduce((sum, t) => sum + t.totalPagado, 0);
      setTotalPendienteInforme(totalPendienteCalc);
      setTotalCobradoInforme(totalCobradoCalc);

      setExito(`📊 Informe "${informe.titulo}" cargado`);
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      console.error("Error al cargar informe:", error);
      setError("Error al cargar los datos del informe");
    } finally {
      setCargandoInforme(false);
    }
  };

  const handleGuardarInforme = async () => {
    if (!tituloInforme.trim()) {
      setError("Debe ingresar un título para el informe");
      return;
    }
    // Guardar los datos de filtros actuales
    try {
      const cuentasSerializables = cuentasFiltros.map(cuenta => ({
        tutorId: cuenta.tutorId,
        cuenta: cuenta.cuenta,
        tutor: cuenta.tutor,
        totalMonto: Number(cuenta.totalMonto),
        totalPagado: Number(cuenta.totalPagado),
        cargos: cuenta.cargos.map(cargo => ({
          id: cargo.id,
          cargoNo: cargo.cargoNo,
          tipo: cargo.tipo,
          valorCargo: cargo.valorCargo ? Number(cargo.valorCargo) : 0,
          recargo: Number(cargo.recargo),
          montoTotal: Number(cargo.montoTotal),
          fechaVencimiento: cargo.fechaVencimiento,
          montoPagado: Number(cargo.montoPagado),
          saldoPendiente: Number(cargo.saldoPendiente),
          estado: cargo.estado,
          fechaUltimoPago: cargo.fechaUltimoPago,
          actualizadoEn: cargo.actualizadoEn,
          estudiante: cargo.estudiante ? {
            nombre: cargo.estudiante.nombre,
            apellido: cargo.estudiante.apellido,
            codigo: cargo.estudiante.codigo,
          } : undefined,
        })),
      }));

      const fechaDesdeGuardar = fechaDesde ? new Date(fechaDesde + "T12:00:00") : null;
      const fechaHastaGuardar = fechaHasta ? new Date(fechaHasta + "T12:00:00") : null;
      
      let anioEscolarGuardado = "";
      
      if (aniosEscolaresSeleccionadosDesde.length > 0 || aniosEscolaresSeleccionadosHasta.length > 0) {
        const todosAnios = [...new Set([
          ...aniosEscolaresSeleccionadosDesde,
          ...aniosEscolaresSeleccionadosHasta
        ])].sort();
        
        if (todosAnios.length === 1) {
          anioEscolarGuardado = todosAnios[0];
        } else if (todosAnios.length > 1) {
          anioEscolarGuardado = `${todosAnios[0]} - ${todosAnios[todosAnios.length - 1]}`;
        }
      }
      
      if (!anioEscolarGuardado) {
        const tarifaActiva = aniosEscolares.find(a => a.activo);
        anioEscolarGuardado = tarifaActiva?.anioEscolar || "No definido";
      }

      await guardarInforme({
        fechaDesde: fechaDesdeGuardar,
        fechaHasta: fechaHastaGuardar,
        tipo,
        cuotasVencidas: cuotasVencidas ? parseInt(cuotasVencidas) : null,
        columnas,
        totalPendiente: totalPendienteFiltros,
        totalCobrado: totalCobradoFiltros,
        datos: cuentasSerializables,
        anioEscolar: anioEscolarGuardado,
      });

      setExito(`✅ Informe "${tituloInforme}" guardado correctamente`);
      setTimeout(() => setExito(""), 4000);
      setMostrarModalGuardar(false);
      setTituloInforme("");
      setDescripcionInforme("");
    } catch (error: any) {
      setError(`❌ ${error.message}`);
      setTimeout(() => setError(""), 4000);
    }
  };
  
  const informesPorPagina = 10;
  const informesActivos = informes.filter((i: any) => !i.anulado);
  const informesPaginados = informesActivos.slice(
    (paginaActualInformes - 1) * informesPorPagina,
    paginaActualInformes * informesPorPagina
  );
  const totalPaginasInformes = Math.ceil(informesActivos.length / informesPorPagina);
  
  const handleAnularInforme = async (id: number) => {
    try {
      await anularInforme(id);
      cargarInformes();
      setExito("Informe anulado correctamente");
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al anular el informe");
    }
  };

  const formatMonto = (monto: number | undefined | null) => {
    if (monto === undefined || monto === null || isNaN(monto)) return "RD$0.00";
    let numero = typeof monto === 'string' ? parseFloat(monto) : monto;
    if (isNaN(numero)) return "RD$0.00";
    return `RD$${numero.toFixed(2)}`;
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "CORRIENTE": return <span style={s.badgeCorriente}>🟢 CORRIENTE</span>;
      case "PENDIENTE": return <span style={s.badgePendiente}>🟡 PENDIENTE</span>;
      case "VENCIDO": return <span style={s.badgeVencido}>🔴 VENCIDO</span>;
      case "ABONADA": return <span style={s.badgeAbonada}>🟠 ABONADA</span>;
      case "SALDA": return <span style={s.badgeSalda}>✅ SALDA</span>;
      default: return <span>{estado}</span>;
    }
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📊 Cuentas por Cobrar</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Cuentas por Cobrar</h1>
            <p style={s.subtitulo}>Control de deudores y cargos pendientes</p>
          </div>
          {tab === "filtros" && (
            <button onClick={() => setMostrarModalGuardar(true)} style={s.btnPrimary}>
              💾 Guardar Informe
            </button>
          )}
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.tabs}>
          <button onClick={() => {
            setTab("filtros"); setInformeSeleccionado(null);
          }} style={{ ...s.tab, ...(tab === "filtros" ? s.tabActivo : {}) }}>
            🔍 Buscar Cuentas
          </button>
          <button onClick={() => {
            setTab("informes"); setInformeSeleccionado(null);
          }} style={{ ...s.tab, ...(tab === "informes" ? s.tabActivo : {}) }}>
            📋 Informes Guardados ({informes.filter((i: any) => !i.anulado).length})
          </button>
        </div>

        {/* Pestaña Filtros */}
        {tab === "filtros" && (
          <>
            <div style={s.filtrosCard}>
              <div style={s.filtrosGrid}>
                <div><label style={s.label}>Fecha desde</label>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={s.input} /></div>
                <div><label style={s.label}>Fecha hasta</label>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={s.input} /></div>
                <div><label style={s.label}>Tipo de cargo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={s.input}>
                    <option value="TODOS">Todos</option>
                    <option value="INSCRIPCION">Inscripción</option>
                    <option value="COLEGIATURA">Colegiatura</option>
                    <option value="TRANSPORTE">Transporte</option>
                  </select>
                </div>
                <div><label style={s.label}>Cuotas vencidas (mínimo)</label>
                  <input type="number" value={cuotasVencidas} onChange={(e) => setCuotasVencidas(e.target.value)} style={s.input} placeholder="Ej: 3" /></div>

                <div style={s.dropdownContainer} ref={cursosDropdownRef}>
                  <label style={s.label}>Cursos</label>
                  <div style={s.dropdownHeader} onClick={() => setMostrarDropdownCursos(!mostrarDropdownCursos)}>
                    <span style={!tieneCursosSeleccionados ? s.textoPlaceholder : {}}>
                      {tieneCursosSeleccionados ? `${cursosSeleccionados.length} curso(s) seleccionado(s)` : "-- Seleccionar cursos --"}</span>
                    <span style={s.dropdownArrow}>{mostrarDropdownCursos ? "▲" : "▼"}</span>
                  </div>
                  {mostrarDropdownCursos && (<div style={s.dropdownContent}>
                    <label style={s.checkboxLabel}><input type="checkbox" checked={cursosSeleccionados.length === cursos.length && cursos.length > 0} onChange={seleccionarTodosCursos} />
                      <strong>Todos los cursos</strong></label>
                    {cursos.map((curso: any) => (<label key={curso.id} style={s.checkboxLabel}>
                      <input type="checkbox" checked={cursosSeleccionados.includes(curso.id)} onChange={(e) => { e.stopPropagation(); handleCursoToggle(curso.id); }} />
                      {curso.grado} - {curso.nivel}</label>))}
                  </div>)}
                </div>

                <div style={s.dropdownContainer} ref={aniosDesdeDropdownRef}>
                  <label style={s.label}>Año Escolar Desde</label>
                  <div style={s.dropdownHeader} onClick={() => setMostrarDropdownAniosDesde(!mostrarDropdownAniosDesde)}>
                    <span style={!tieneAniosDesdeSeleccionados ? s.textoPlaceholder : {}}>
                      {tieneAniosDesdeSeleccionados ? `${aniosEscolaresSeleccionadosDesde.length} año(s) seleccionado(s)` : "-- Seleccionar año escolar --"}</span>
                    <span style={s.dropdownArrow}>{mostrarDropdownAniosDesde ? "▲" : "▼"}</span>
                  </div>
                  {mostrarDropdownAniosDesde && (<div style={s.dropdownContent}>
                    <label style={s.checkboxLabel}><input type="checkbox" checked={aniosEscolaresSeleccionadosDesde.length === aniosEscolares.length && aniosEscolares.length > 0} onChange={(e) => {
                      e.stopPropagation(); seleccionarTodosAniosDesde();
                    }} /><strong>Todos los años escolares</strong></label>
                    {aniosEscolares.map((a) => (<label key={a.id} style={s.checkboxLabel}><input type="checkbox" checked={aniosEscolaresSeleccionadosDesde.includes(a.anioEscolar)} onChange={(e) => {
                      e.stopPropagation(); handleAnioDesdeToggle(a.anioEscolar);
                    }} />{a.anioEscolar} {a.activo && "✓"}</label>))}
                  </div>)}
                </div>

                <div style={s.dropdownContainer} ref={aniosHastaDropdownRef}>
                  <label style={s.label}>Año Escolar Hasta</label>
                  <div style={s.dropdownHeader} onClick={() => setMostrarDropdownAniosHasta(!mostrarDropdownAniosHasta)}>
                    <span style={!tieneAniosHastaSeleccionados ? s.textoPlaceholder : {}}>
                      {tieneAniosHastaSeleccionados ? `${aniosEscolaresSeleccionadosHasta.length} año(s) seleccionado(s)` : "-- Seleccionar año escolar --"}</span>
                    <span style={s.dropdownArrow}>{mostrarDropdownAniosHasta ? "▲" : "▼"}</span>
                  </div>
                  {mostrarDropdownAniosHasta && (<div style={s.dropdownContent}>
                    <label style={s.checkboxLabel}><input type="checkbox" checked={aniosEscolaresSeleccionadosHasta.length === aniosEscolares.length && aniosEscolares.length > 0} onChange={(e) => {
                      e.stopPropagation(); seleccionarTodosAniosHasta();
                    }} /><strong>Todos los años escolares</strong></label>
                    {aniosEscolares.map((a) => (<label key={a.id} style={s.checkboxLabel}><input type="checkbox" checked={aniosEscolaresSeleccionadosHasta.includes(a.anioEscolar)} onChange={(e) => {
                      e.stopPropagation(); handleAnioHastaToggle(a.anioEscolar);
                    }} />{a.anioEscolar} {a.activo && "✓"}</label>))}
                  </div>)}
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                  <button onClick={aplicarFiltros} style={s.btnFiltrar}>🔍 Filtrar</button>
                  <button onClick={limpiarFiltros} style={s.btnLimpiar}>🧹 Limpiar</button>
                </div>
              </div>
            </div>

            <div style={s.totalesCard}>
              <div><strong>Total pendiente:</strong> {formatMonto(totalPendienteFiltros)}</div>
              <div><strong>Total cobrado:</strong> {formatMonto(totalCobradoFiltros)}</div>
            </div>

            {cargandoFiltros ? <div style={s.vacio}>Cargando...</div> : cuentasFiltros.length === 0 ? <div style={s.vacio}>No hay cuentas por cobrar registradas</div> : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      {columnas.numero && <th style={s.th}>#</th>}
                      {columnas.cuenta && <th style={s.th}>Cuenta</th>}
                      {columnas.tutor && <th style={s.th}>Tutor</th>}
                      {columnas.cargoNo && <th style={s.th}>Cargo no.</th>}
                      {columnas.valorCargo && <th style={s.th}>Valor cargo</th>}
                      {columnas.cantidadCuotas && <th style={s.th}>Cant. cuotas</th>}
                      {columnas.monto && <th style={s.th}>Monto</th>}
                      {columnas.fechaVencimiento && <th style={s.th}>Fecha vencimiento</th>}
                      {columnas.fechaPago && <th style={s.th}>Fecha pago</th>}
                      {columnas.montoPago && <th style={s.th}>Monto pago</th>}
                      {columnas.balance && <th style={s.th}>Balance</th>}
                      {columnas.estado && <th style={s.th}>Estado</th>}
                      {columnas.actualizadoEn && <th style={s.th}>Actualizado en</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasFiltros.map((cuenta, idx) => cuenta.cargos.map((cargo) => (
                      <tr key={`${cuenta.tutorId}-${cargo.id}`}>{columnas.numero && <td style={s.td}>{idx + 1}</td>}
                    {columnas.cuenta && <td style={s.td}>{cuenta.cuenta}</td>}
                    {columnas.tutor && <td style={s.td}>{cuenta.tutor}</td>}
                    {columnas.cargoNo && <td style={s.td}>{cargo.cargoNo}</td>}
                    {columnas.valorCargo && <td style={s.td}>{formatMonto(Number(cargo.valorCargo))}</td>}
                    {columnas.cantidadCuotas && <td style={s.td}>1</td>}
                    {columnas.monto && <td style={s.td}>{formatMonto(Number(cargo.saldoPendiente))}</td>}
                    {columnas.fechaVencimiento && <td style={s.td}>{formatFechaLarga(cargo.fechaVencimiento)}</td>}
                    {columnas.fechaPago && <td style={s.td}>{cargo.fechaUltimoPago ? formatFechaLarga(cargo.fechaUltimoPago) : "—"}</td>}
                    {columnas.montoPago && <td style={s.td}>{cargo.montoPagado > 0 ? formatMonto(Number(cargo.montoPagado)) : "—"}</td>}
                    {columnas.balance && <td style={s.td}>{formatMonto(Number(cargo.saldoPendiente))}</td>}
                    {columnas.estado && <td style={s.td}>{getEstadoBadge(cargo.estado)}</td>}
                    {columnas.actualizadoEn && <td style={s.td}>{new Date(cargo.actualizadoEn || "").toLocaleString()}</td>}
                    </tr>)
                  ))}
                  </tbody>
                  <tfoot><tr style={s.tfoot}>
                    <td colSpan={Object.values(columnas).filter(Boolean).length - 4} style={s.td}><strong>TOTALES:</strong></td>
                    <td style={s.td}><strong>{formatMonto(totalPendienteFiltros)}</strong></td>
                    <td style={s.td}><strong>{formatMonto(totalCobradoFiltros)}</strong></td>
                    </tr></tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* PESTAÑA INFORMES */}
        {tab === "informes" && (
          <div style={s.informesContainer}>
            {informeSeleccionado === null ? (
              <>
                {/* Botones para cambiar entre activos y anulados */}
                <div style={s.toggleAnulados}>
                  <button
                    onClick={() => setMostrarAnulados(false)}
                    style={{
                      ...s.btnToggle,
                      ...(!mostrarAnulados ? s.btnToggleActivo : {})
                    }}
                  >
                    📋 Activos ({informes.filter((i: any) => !i.anulado).length})
                  </button>
                  <button
                    onClick={() => setMostrarAnulados(true)}
                    style={{
                      ...s.btnToggle,
                      ...(mostrarAnulados ? s.btnToggleActivo : {})
                    }}
                  >
                    🚫 Anulados ({informes.filter((i: any) => i.anulado).length})
                  </button>
                </div>

                {!mostrarAnulados && (
                  <>
                    <div style={s.informesHeader}>
                      <p style={s.informesSubtitle}>Informes de cuentas por cobrar activos</p>
                      <div style={s.paginationControls}>
                        <button onClick={() => setPaginaActualInformes(1)} disabled={paginaActualInformes === 1} style={s.btnPagSmall}>⏮</button>
                        <button onClick={() => setPaginaActualInformes(p => Math.max(1, p - 1))} disabled={paginaActualInformes === 1} style={s.btnPagSmall}>◀</button>
                        <span style={s.pagInfo}>Página {paginaActualInformes} de {totalPaginasInformes}</span>
                        <button onClick={() => setPaginaActualInformes(p => Math.min(totalPaginasInformes, p + 1))} disabled={paginaActualInformes === totalPaginasInformes} style={s.btnPagSmall}>▶</button>
                        <button onClick={() => setPaginaActualInformes(totalPaginasInformes)} disabled={paginaActualInformes === totalPaginasInformes} style={s.btnPagSmall}>⏭</button>
                      </div>
                    </div>
                    {informesActivos.length === 0 ? (
                      <div style={s.vacio}>No hay informes activos</div>
                    ) : (
                      <div style={s.tablaWrap}>
                        <table style={s.tabla}>
                          <thead>
                            <tr style={s.thead}>
                              <th style={s.th}>Título</th>
                              <th style={s.th}>Descripción</th>
                              <th style={s.th}>Fecha de creación</th>
                              <th style={s.th}>Creado por</th>
                              <th style={s.th}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {informesPaginados.map((informe: any) => (
                              <tr key={informe.id}>
                                <td style={s.td}><strong>{informe.titulo}</strong></td>
                                <td style={s.td}>{informe.descripcion || "—"}</td>
                                <td style={s.td}>{formatFechaLarga(informe.creadoEn)}</td>
                                <td style={s.td}>{informe.creador?.nombre || "Usuario"}</td>
                                <td style={s.td}>
                                  <button onClick={() => verInforme(informe)} style={s.btnVer}>👁️ Ver</button>
                                  <button onClick={() => editarInforme(informe)} style={s.btnEditar}>✏️ Editar</button>
                                  <button onClick={() => handleAnularInforme(informe.id)} style={s.btnAnular}>🚫 Anular</button>
                                  {rol === "ADMINISTRADOR" && (
                                    <button onClick={() => eliminarInforme(informe.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Lista de informes anulados */}
                {mostrarAnulados && (
                  <>
                    <div style={s.informesHeader}>
                      <p style={s.informesSubtitle}>Informes anulados (no se pueden editar)</p>
                    </div>
                    {informes.filter((i: any) => i.anulado).length === 0 ? (
                      <div style={s.vacio}>No hay informes anulados</div>
                    ) : (
                      <div style={s.tablaWrap}>
                        <table style={s.tabla}>
                          <thead>
                            <tr style={s.thead}>
                              <th style={s.th}>Título</th>
                              <th style={s.th}>Descripción</th>
                              <th style={s.th}>Fecha de anulación</th>
                              <th style={s.th}>Anulado por</th>
                              <th style={s.th}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {informes.filter((i: any) => i.anulado).map((informe: any) => (
                              <tr key={informe.id} style={{ backgroundColor: "#fff5f5" }}>
                                <td style={s.td}>
                                  <strong style={{ color: "#c53030", textDecoration: "line-through" }}>
                                    {informe.titulo}
                                  </strong>
                                </td>
                                <td style={s.td}>{informe.descripcion || "—"}</td>
                                <td style={s.td}>{new Date(informe.actualizadoEn).toLocaleDateString("es-DO")}</td>
                                <td style={s.td}>{informe.creador?.nombre || "Usuario"}</td>
                                <td style={s.td}>
                                  <button onClick={() => verInforme(informe)} style={s.btnVer}>👁️ Ver</button>
                                  {rol === "ADMINISTRADOR" && (
                                    <button onClick={() => eliminarInforme(informe.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Encabezado del Informe */}
                <div style={s.informeHeaderCard}>
                  <div style={s.informeHeaderContent}>
                    <div style={s.informeHeaderLeft}>
                      <h2 style={s.informeTitulo}>{informeSeleccionado.titulo}</h2>
                      {informeSeleccionado.descripcion && (
                        <p style={s.informeDescripcion}>{informeSeleccionado.descripcion}</p>
                      )}
                    </div>
                    <button onClick={() => setInformeSeleccionado(null)} style={s.btnVolver}>
                      ← Volver a lista de informes
                    </button>
                  </div>
                  <div style={s.informeDetalles}>
                    <div style={s.informeDetalleItem}>
                      <strong>📅 Período:</strong> 
                      {informeSeleccionado.fechaDesde ? formatFechaLarga(informeSeleccionado.fechaDesde) : "—"} - 
                      {informeSeleccionado.fechaHasta ? formatFechaLarga(informeSeleccionado.fechaHasta) : "—"}
                    </div>
                    <div style={s.informeDetalleItem}>
                      <strong>🏫 Año Escolar:</strong> {informeSeleccionado.anioEscolar || "No definido"}
                    </div>
                    <div style={s.informeDetalleItem}>
                      <strong>👤 Creado por:</strong> {informeSeleccionado.creadoPor}
                    </div>
                    <div style={s.informeDetalleItem}>
                      <strong>📆 Fecha de creación:</strong> {new Date(informeSeleccionado.creadoEn).toLocaleDateString("es-DO")}
                    </div>
                  </div>
                </div>

                {/* Totales */}
                <div style={s.totalesCard}>
                  <div><strong>Total pendiente:</strong> {formatMonto(totalPendienteInforme)}</div>
                  <div><strong>Total cobrado:</strong> {formatMonto(totalCobradoInforme)}</div>
                </div>

                {/* Tabla de cargos del informe */}
                {cargandoInforme ? (
                  <div style={s.vacio}>Cargando informe...</div>
                ) : cuentasInforme.length === 0 ? (
                  <div style={s.vacio}>No hay datos en este informe</div>
                ) : (
                  <div style={s.tablaWrap}>
                    <table style={s.tabla}>
                      <thead>
                        <tr style={s.thead}>
                          {columnas.numero && <th style={s.th}>#</th>}
                          {columnas.cuenta && <th style={s.th}>Cuenta</th>}
                          {columnas.tutor && <th style={s.th}>Tutor</th>}
                          {columnas.cargoNo && <th style={s.th}>Cargo no.</th>}
                          {columnas.valorCargo && <th style={s.th}>Valor cargo</th>}
                          {columnas.cantidadCuotas && <th style={s.th}>Cant. cuotas</th>}
                          {columnas.monto && <th style={s.th}>Monto</th>}
                          {columnas.fechaVencimiento && <th style={s.th}>Fecha vencimiento</th>}
                          {columnas.fechaPago && <th style={s.th}>Fecha pago</th>}
                          {columnas.montoPago && <th style={s.th}>Monto pago</th>}
                          {columnas.balance && <th style={s.th}>Balance</th>}
                          {columnas.estado && <th style={s.th}>Estado</th>}
                          {columnas.actualizadoEn && <th style={s.th}>Actualizado en</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cuentasInforme.map((cuenta, idx) => (
                          cuenta.cargos.map((cargo) => (
                            <tr key={`${cuenta.tutorId}-${cargo.id}`}>
                              {columnas.numero && <td style={s.td}>{idx + 1}</td>}
                              {columnas.cuenta && <td style={s.td}>{cuenta.cuenta}</td>}
                              {columnas.tutor && <td style={s.td}>{cuenta.tutor}</td>}
                              {columnas.cargoNo && <td style={s.td}>{cargo.cargoNo}</td>}
                              {columnas.valorCargo && <td style={s.td}>{formatMonto(Number(cargo.valorCargo))}</td>}
                              {columnas.cantidadCuotas && <td style={s.td}>1</td>}
                              {columnas.monto && <td style={s.td}>{formatMonto(Number(cargo.saldoPendiente))}</td>}
                              {columnas.fechaVencimiento && <td style={s.td}>{formatFechaLarga(cargo.fechaVencimiento)}</td>}
                              {columnas.fechaPago && <td style={s.td}>{cargo.fechaUltimoPago ? formatFechaLarga(cargo.fechaUltimoPago) : "—"}</td>}
                              {columnas.montoPago && <td style={s.td}>{cargo.montoPagado > 0 ? formatMonto(Number(cargo.montoPagado)) : "—"}</td>}
                              {columnas.balance && <td style={s.td}>{formatMonto(Number(cargo.saldoPendiente))}</td>}
                              {columnas.estado && <td style={s.td}>{getEstadoBadge(cargo.estado)}</td>}
                              {columnas.actualizadoEn && <td style={s.td}>{new Date(cargo.actualizadoEn || "").toLocaleString()}</td>}
                            </tr>
                          ))
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={s.tfoot}>
                          <td colSpan={Object.values(columnas).filter(Boolean).length - 2} style={s.td}><strong>TOTALES:</strong></td>
                          <td style={s.td}><strong>{formatMonto(totalPendienteInforme)}</strong></td>
                          <td style={s.td}><strong>{formatMonto(totalCobradoInforme)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}      
      </div>

      <ModalInforme
        isOpen={mostrarModalGuardar}
        onClose={() => { setMostrarModalGuardar(false); setInformeEditando(null); setTituloInforme(""); setDescripcionInforme(""); }}
        onSave={handleGuardarInforme}
        titulo={tituloInforme}
        setTitulo={setTituloInforme}
        descripcion={descripcionInforme}
        setDescripcion={setDescripcionInforme}
        isEditing={!!informeEditando}
      />
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1400px", margin: "0 auto", padding: "20px", width: "100%", boxSizing: "border-box" as const },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  btnPrimary: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  filtrosCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", alignItems: "center" },
  label: { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", marginLeft: "8px" },
  totalesCard: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between" },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", width: "100%" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "800px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 12px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left", whiteSpace: "nowrap" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f0", fontSize: "12px", whiteSpace: "nowrap" as const },
  tfoot: { background: "#f0f4f8", fontWeight: "bold" },
  badgeCorriente: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgePendiente: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeVencido: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAbonada: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeSalda: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  dropdownContainer: { position: "relative" as const, width: "100%" },
  dropdownHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "7px", cursor: "pointer", backgroundColor: "#fff", fontSize: "13px" },
  dropdownArrow: { fontSize: "12px", color: "#666" },
  dropdownContent: { position: "absolute" as const, top: "100%", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "7px", marginTop: "4px", padding: "10px", zIndex: 1000, maxHeight: "200px", overflowY: "auto" as const, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", padding: "4px" },
  textoPlaceholder: { color: "#999", fontStyle: "italic" },
  informesContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" as const },
  informesHeader: { marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" },
  informesSubtitle: { fontSize: "13px", color: "#666", margin: 0 },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", marginRight: "6px", fontSize: "11px" },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", marginRight: "6px", fontSize: "11px" },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", marginRight: "6px", fontSize: "11px" },
  btnEliminar: { background: "#c53030", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "11px" },
  btnVolver: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  informeHeaderCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderLeft: "4px solid #2C1810", overflowX: "auto" as const },
  informeHeaderContent: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" },
  informeHeaderLeft: { flex: 1 },
  informeTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 8px 0" },
  informeDescripcion: { fontSize: "13px", color: "#666", margin: 0 },
  informeDetalles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", paddingTop: "12px", borderTop: "1px solid #eee" },
  informeDetalleItem: { fontSize: "12px", color: "#555" },
  toggleAnulados: { display: "flex", gap: "8px", marginBottom: "20px", paddingBottom: "12px", flexWrap: "wrap" },
  btnToggle: { background: "none", border: "none", padding: "8px 16px", fontSize: "13px", cursor: "pointer", borderRadius: "20px", color: "#666" },
  btnToggleActivo: { background: "#2C1810", color: "#fff", },
  paginationControls: { display: "flex", gap: "12px", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" },
  btnPagSmall: { background: "#f0f4f8", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px" },
  pagInfo: { fontSize: "13px", color: "#666" },
};
