"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFechaLocal, formatFechaLarga } from "@/lib/formatear-fecha";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "../../../../components/ImprimirContenido";

type ReciboReporte = {
  id: number;
  reciboNo: string;
  fecha: string;
  cuenta: string;
  tutor: string;
  concepto: string;
  monto: number;
  usuario: string;
  metodoPago: string;
  tipo: string; // CARGO, OTRO_INGRESO, UNIFORME, TRANSPORTE
  origen: string,
};

type ReporteIngreso = {
  id: number;
  reporteNo: string;
  fecha: string;
  fechaDesde: string;
  fechaHasta: string;
  realizadoPor: string;
  recibos: ReciboReporte[];
  totalRecibos: number;
  totalMonto: number;
  saldoInicial: number;
  saldoFinal: number;
  estado: "BORRADOR" | "REPORTADO";
  creadoPor: string;
  creadoEn: string;
  // Resumen por concepto y método de pago
  resumen: {
    inscripcion: { efectivo: number; tarjeta: number; transferencia: number; cheque: number; total: number };
    colegiatura: { efectivo: number; tarjeta: number; transferencia: number; cheque: number; total: number };
    transporte: { efectivo: number; tarjeta: number; transferencia: number; cheque: number; total: number };
    uniforme: { efectivo: number; tarjeta: number; transferencia: number; cheque: number; total: number };
    otrosIngresos: { efectivo: number; tarjeta: number; transferencia: number; cheque: number; total: number };
  };
  datos?: {
    denominaciones?: Denominacion[];
    recibos?: ReciboReporte[];
    resumen?: any;
  };
};

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

export type Denominacion = {
  valor: number;
  cantidad: number;
  total: number;
};

export default function ReporteIngresosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [tab, setTab] = useState<"reporte" | "listado">("reporte");
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState(formatFechaLocal(new Date()));
  const [fechaHasta, setFechaHasta] = useState(formatFechaLocal(new Date()));
  const [realizadoPor, setRealizadoPor] = useState("TODOS");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Datos
  const [recibos, setRecibos] = useState<ReciboReporte[]>([]);
  const [totalRecibos, setTotalRecibos] = useState(0);
  const [totalMonto, setTotalMonto] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([
    { valor: 2000, cantidad: 0, total: 0 },
    { valor: 1000, cantidad: 0, total: 0 },
    { valor: 500, cantidad: 0, total: 0 },
    { valor: 200, cantidad: 0, total: 0 },
    { valor: 100, cantidad: 0, total: 0 },
    { valor: 50, cantidad: 0, total: 0 },
    { valor: 25, cantidad: 0, total: 0 },
    { valor: 10, cantidad: 0, total: 0 },
    { valor: 5, cantidad: 0, total: 0 },
    { valor: 1, cantidad: 0, total: 0 },
  ]);
  const [denominacionesInput, setDenominacionesInput] = useState<string[]>(denominaciones.map(() => ""));
  const [creditoInputs, setCreditoInputs] = useState<string[]>(denominaciones.map(() => ""));
  const [creditoMonto, setCreditoMonto] = useState(0);
  
  // Guardar reporte
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [saldoFinal, setSaldoFinal] = useState(0);
  const [saldoInicialInput, setSaldoInicialInput] = useState("");
  const [saldoFinalInput, setSaldoFinalInput] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  
  // Listado de reportes
  const [reportes, setReportes] = useState<ReporteIngreso[]>([]);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteIngreso | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const reportesPorPagina = 10;
  const { componentRef, handleImprimir } = useImprimir();
  const [reporteParaImprimir, setReporteParaImprimir] = useState<any>(null);
  
  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    cargarUsuarios();
    cargarReportes();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await fetch("/api/usuarios?roles=ADMINISTRADOR,CONTADOR,CAJERO");
      const data = await res.json();
      
      const rolesPermitidos = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];
      const empleadosFiltrados = (data.empleados || []).filter(
        (user: any) => rolesPermitidos.includes(user.rol)
      );
      
      const usuariosList = empleadosFiltrados.map((user: any) => ({
        id: user.id,
        nombre: user.rol === "ADMINISTRADOR" ? "Administrador" : `${user.nombre} ${user.apellido}`,
        email: user.email || `${user.nombre.toLowerCase()}@colegio.edu`,
        rol: user.rol
      }));
      
      setUsuarios([
        { 
          id: 999999, 
          nombre: "Tutor (Pagos en línea)", 
          email: "tutor@pagoslinea.com",
          rol: "TUTOR" 
        },
        ...usuariosList
      ]);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setUsuarios([{ 
        id: 999999, 
        nombre: "Tutor (Pagos en línea)", 
        email: "tutor@pagoslinea.com",
        rol: "TUTOR" 
      }]);
    }
  };

  const cargarRecibos = async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      
      if (realizadoPor === "Tutor (Pagos en línea)") {
        params.append("origen", "EN_LINEA");
      } else if (realizadoPor !== "TODOS") {
        params.append("realizadoPor", realizadoPor);
      }

      const res = await fetch(`/api/financiero/reporte-ingresos/recibos?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setRecibos(data.recibos || []);
      setTotalRecibos(data.totalRecibos || 0);
      setTotalMonto(data.totalMonto || 0);
    } catch (error) {
      setError("Error al cargar los recibos");
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const cargarReportes = async () => {
    try {
        const res = await fetch(`/api/financiero/reporte-ingresos?page=${paginaActual}&limit=${reportesPorPagina}`);
        const data = await res.json();

        const reportesFormateados = (data.reportes || []).map((r: any) => ({
        ...r,
        totalMonto: typeof r.totalMonto === 'number' ? r.totalMonto : parseFloat(r.totalMonto),
        saldoInicial: typeof r.saldoInicial === 'number' ? r.saldoInicial : parseFloat(r.saldoInicial),
        saldoFinal: typeof r.saldoFinal === 'number' ? r.saldoFinal : parseFloat(r.saldoFinal),
        totalRecibos: typeof r.totalRecibos === 'number' ? r.totalRecibos : parseInt(r.totalRecibos),
        }));
        setReportes(reportesFormateados);
        setTotalPaginas(data.totalPaginas || 1);
    } catch (error) {
        console.error("Error cargando reportes:", error);
    }
  };

  const handleSaldoInicialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setSaldoInicialInput(rawValue);
    const numValue = rawValue === "" ? 0 : parseFloat(rawValue);
    setSaldoInicial(isNaN(numValue) ? 0 : numValue);
  };

  const handleSaldoFinalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setSaldoFinalInput(rawValue);
    const numValue = rawValue === "" ? 0 : parseFloat(rawValue);
    setSaldoFinal(isNaN(numValue) ? 0 : numValue);
  };

  // Calcular totales por categoría usando el campo origen
  const totalesPresencial = recibos?.length
    ? recibos.filter(r => r.origen === "PRESENCIAL" || r.origen === undefined)
            .reduce((sum, r) => sum + r.monto, 0)
    : 0;
    
  const totalesEnLinea = recibos?.length
    ? recibos.filter(r => r.origen === "EN_LINEA")
            .reduce((sum, r) => sum + r.monto, 0)
    : 0;

  const totalGeneral = totalMonto;

  const normalizarConcepto = (concepto: string): string => {
    if (concepto === "INSCRIPCION") return "Inscripción";
    if (concepto === "COLEGIATURA") return "Colegiatura";
    if (concepto === "TRANSPORTE") return "Transporte";
    if (concepto === "DERECHO A GRADUACIÓN") return "Derecho a Graduación";
    if (concepto === "EXCURSIÓN ESCOLAR") return "Excursión Escolar";
    if (concepto === "UNIFORME") return "Uniforme";
    return "Otros Ingresos";
  };

  // Agrupar por concepto (presencial y en línea)
  const conceptosPresencial = recibos?.length
    ? recibos
        .filter(r => r.origen === "PRESENCIAL" || r.origen === undefined)
        .reduce((acc, r) => {
          const nombre = normalizarConcepto(r.concepto);
          acc[nombre] = (acc[nombre] || 0) + r.monto;
          return acc;
        }, {} as Record<string, number>)
    : {};

  const conceptosEnLinea = recibos?.length
    ? recibos
        .filter(r => r.origen === "EN_LINEA")
        .reduce((acc, r) => {
          const nombre = normalizarConcepto(r.concepto);
          acc[nombre] = (acc[nombre] || 0) + r.monto;
          return acc;
        }, {} as Record<string, number>)
    : {};

  // Lista de todos los conceptos posibles
  const todosConceptos = ["Inscripción", "Colegiatura", "Transporte", "Derecho a Graduación", "Excursión Escolar", "Uniforme", "Otros Ingresos"];

  // Cálculo de denominaciones y saldos
  const totalDenominaciones = denominaciones.reduce((sum, d) => sum + d.total, 0);
  const diferencia = saldoFinal - saldoInicial;
  const diferenciaTexto = diferencia === 0 
  ? "CUADRADO" 
  : diferencia > 0 
    ? `SOBRANTE: RD$${diferencia.toFixed(2)}` 
    : `FALTANTE: RD$${Math.abs(diferencia).toFixed(2)}`;
const diferenciaColor = diferencia === 0 
  ? "#276749" 
  : diferencia > 0 
    ? "#ed8936" 
    : "#c53030";

  // Cálculos para métodos de pagos
  const totalEfectivo = totalDenominaciones;
  const totalTarjeta = recibos?.length
    ? recibos.filter(r => r.metodoPago === "TARJETA").reduce((s, r) => s + r.monto, 0)
    : 0;
  const totalCheque = recibos?.length
    ? recibos.filter(r => r.metodoPago === "CHEQUE").reduce((s, r) => s + r.monto, 0)
    : 0;
  const totalTransferencia = recibos?.length
    ? recibos.filter(r => r.metodoPago === "TRANSFERENCIA").reduce((s, r) => s + r.monto, 0)
    : 0;
  const totalCredito = creditoMonto;

  const handleDenominacionChange = (index: number, value: string) => {
    const nuevasDenominacionesInput = [...denominacionesInput];
    nuevasDenominacionesInput[index] = value;
    setDenominacionesInput(nuevasDenominacionesInput);
    
    const cantidad = value === "" ? 0 : parseInt(value);
    if (!isNaN(cantidad)) {
      const nuevasDenominaciones = [...denominaciones];
      nuevasDenominaciones[index].cantidad = cantidad;
      nuevasDenominaciones[index].total = cantidad * nuevasDenominaciones[index].valor;
      setDenominaciones(nuevasDenominaciones);
    }
  };

  const handleCreditoChange = (index: number, value: string) => {
    const nuevosInputs = [...creditoInputs];
    nuevosInputs[index] = value;
    setCreditoInputs(nuevosInputs);
    
    // Calcular total de crédito sumando todas las cantidades ingresadas
    let total = 0;
    for (let i = 0; i < nuevosInputs.length; i++) {
      const cantidad = nuevosInputs[i] === "" ? 0 : parseFloat(nuevosInputs[i]);
      if (!isNaN(cantidad)) {
        total += cantidad;
      }
    }
    setCreditoMonto(total);
    setHayCambiosSinGuardar(true);
  };

  const guardarReporte = async (estado: "BORRADOR" | "REPORTADO") => {
    setGuardando(true);
    setError("");
    try {
      const url = editandoId 
        ? `/api/financiero/reporte-ingresos/${editandoId}` 
        : "/api/financiero/reporte-ingresos";
      const method = editandoId ? "PUT" : "POST";
      
      console.log("Editando ID:", editandoId);
      console.log("URL:", url);
      console.log("Method:", method);

      const payload = {
      fechaDesde,
      fechaHasta,
      realizadoPor: realizadoPor === "TODOS" ? null : realizadoPor,
      recibos,
      totalRecibos,
      totalMonto,
      saldoInicial,
      saldoFinal,
      denominaciones,
      estado,
    };
    
    console.log("Payload enviado:", JSON.stringify(payload, null, 2));
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    console.log("Respuesta del servidor:", data);
    console.log("Status:", res.status);

    if (!res.ok) {
      setError(data.error || `Error ${res.status}: No se pudo guardar el reporte`);
      return;
    }

    setExito(`Reporte ${estado === "REPORTADO" ? "guardado" : "guardado como borrador"} correctamente`);
    setTimeout(() => setExito(""), 5000);
    cargarReportes();
    limpiarFormulario();
    setEditandoId(null);
    } catch (error) {
      console.error("Error en guardarReporte:", error);
      setError("Error al guardar el reporte");
    } finally {
      setGuardando(false);
    }
  };

  const editarReporte = (reporte: ReporteIngreso) => {
    setFechaDesde(reporte.fechaDesde ? formatFechaLocal(reporte.fechaDesde) : formatFechaLocal(new Date()));
    setFechaHasta(reporte.fechaHasta ? formatFechaLocal(reporte.fechaHasta) : formatFechaLocal(new Date()));
    setRealizadoPor(reporte.realizadoPor || "TODOS");
    setRecibos(reporte.recibos);
    setTotalRecibos(reporte.totalRecibos);
    setTotalMonto(reporte.totalMonto);
    setSaldoInicial(reporte.saldoInicial);
    setSaldoFinal(reporte.saldoFinal);
    setSaldoInicialInput(reporte.saldoInicial.toString());
    setSaldoFinalInput(reporte.saldoFinal.toString());
    
    // Cargar denominaciones si existen
    if (reporte.datos?.denominaciones) {
      setDenominaciones(reporte.datos.denominaciones);
      setDenominacionesInput(reporte.datos.denominaciones.map((d: Denominacion) => d.cantidad.toString()));
    }
    
    setTab("reporte");
    setReporteSeleccionado(null);
    setEditandoId(reporte.id);
  };

  const limpiarDenominaciones = () => {
    setDenominaciones(denominaciones.map(d => ({ ...d, cantidad: 0, total: 0 })));
    setDenominacionesInput(denominaciones.map(() => ""));
    setCreditoInputs(denominaciones.map(() => ""));
    setCreditoMonto(0);
  };

  const limpiarCreditos = () => {
    setCreditoInputs(denominaciones.map(() => ""));
    setCreditoMonto(0);
  };

  const limpiarFormulario = () => {
    setFechaDesde(formatFechaLocal(new Date()));
    setFechaHasta(formatFechaLocal(new Date()));
    setRealizadoPor("TODOS");
    setRecibos([]);
    setTotalRecibos(0);
    setTotalMonto(0);
    setSaldoInicial(0);
    setSaldoFinal(0);
    setSaldoInicialInput("");
    setSaldoFinalInput("")
    limpiarDenominaciones();
    limpiarCreditos()
  };

  const verReporte = (reporte: ReporteIngreso) => {
    const recibosData = reporte.datos?.recibos || reporte.recibos || [];
    
    setReporteSeleccionado({
      ...reporte,
      recibos: recibosData,
      resumen: reporte.datos?.resumen || reporte.resumen || {
        inscripcion: { efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0 },
        colegiatura: { efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0 },
        transporte: { efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0 },
        uniforme: { efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0 },
        otrosIngresos: { efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0 },
      },
    });
  };

  const imprimirReporte = (reporte: ReporteIngreso) => {
    const recibosData = reporte.datos?.recibos || reporte.recibos || [];
    
    // Calcular totales por método de pago desde los recibos
    const totalEfectivo = recibosData
      .filter((r: any) => r.metodoPago === "EFECTIVO")
      .reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
    const totalTarjeta = recibosData
      .filter((r: any) => r.metodoPago === "TARJETA")
      .reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
    const totalCheque = recibosData
      .filter((r: any) => r.metodoPago === "CHEQUE")
      .reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
    const totalTransferencia = recibosData
      .filter((r: any) => r.metodoPago === "TRANSFERENCIA")
      .reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
    
    // Agrupar por concepto
    const conceptosMap: Record<string, { efectivo: number; tarjeta: number; cheque: number; transferencia: number; total: number; cantidad: number }> = {};
    
    recibosData.forEach((recibo: any) => {
      let nombreConcepto = recibo.concepto;
      if (nombreConcepto === "INSCRIPCION") nombreConcepto = "Inscripción";
      else if (nombreConcepto === "COLEGIATURA") nombreConcepto = "Colegiatura";
      else if (nombreConcepto === "TRANSPORTE") nombreConcepto = "Transporte";
      else if (nombreConcepto === "UNIFORME") nombreConcepto = "Uniforme";
      else if (nombreConcepto === "DERECHO A GRADUACIÓN") nombreConcepto = "Derecho a Graduación";
      else if (nombreConcepto === "EXCURSIÓN ESCOLAR") nombreConcepto = "Excursión Escolar";
      else nombreConcepto = "Otros Ingresos";
      
      if (!conceptosMap[nombreConcepto]) {
        conceptosMap[nombreConcepto] = { efectivo: 0, tarjeta: 0, cheque: 0, transferencia: 0, total: 0, cantidad: 0 };
      }
      
      const monto = recibo.monto || 0;
      conceptosMap[nombreConcepto].total += monto;
      conceptosMap[nombreConcepto].cantidad += 1;
      
      if (recibo.metodoPago === "EFECTIVO") conceptosMap[nombreConcepto].efectivo += monto;
      else if (recibo.metodoPago === "TARJETA") conceptosMap[nombreConcepto].tarjeta += monto;
      else if (recibo.metodoPago === "CHEQUE") conceptosMap[nombreConcepto].cheque += monto;
      else if (recibo.metodoPago === "TRANSFERENCIA") conceptosMap[nombreConcepto].transferencia += monto;
    });
    
    const datosImpresion = {
      reporteNo: reporte.reporteNo,
      fecha: reporte.fecha,
      fechaDesde: reporte.fechaDesde,
      fechaHasta: reporte.fechaHasta,
      realizadoPor: reporte.realizadoPor || "Todos",
      saldoInicial: reporte.saldoInicial,
      saldoFinal: reporte.saldoFinal,
      totalMonto: reporte.totalMonto,
      totalRecibos: reporte.totalRecibos,
      recibos: recibosData,
      conceptosMap: conceptosMap,
      totalEfectivo: totalEfectivo,
      totalTarjeta: totalTarjeta,
      totalCheque: totalCheque,
      totalTransferencia: totalTransferencia,
    };
    
    setReporteParaImprimir(datosImpresion);
    setTimeout(() => handleImprimir(), 100);
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📊 Reporte de Ingresos / Cuadre de Caja</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Reporte de Ingresos</h1>
          <p style={s.subtitulo}>Cuadre de caja grande y reporte de recibos</p>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.tabs}>
          <button onClick={() => { setTab("reporte"); setReporteSeleccionado(null); setHayCambiosSinGuardar(false); }} style={{ ...s.tab, ...(tab === "reporte" ? s.tabActivo : {}) }}>
            📝 Nuevo Reporte
          </button>
          <button onClick={() => { 
            if (hayCambiosSinGuardar && recibos.length > 0) {
              if (confirm("Hay cambios sin guardar. ¿Desea guardar como borrador antes de continuar?")) {
                guardarReporte("BORRADOR");
              }
            }
            setTab("listado"); 
            cargarReportes(); 
            setReporteSeleccionado(null); 
            setHayCambiosSinGuardar(false);
          }} style={{ ...s.tab, ...(tab === "listado" ? s.tabActivo : {}) }}>
            📋 Reportes Guardados ({reportes.length})
          </button>
        </div>

        {/* Pestaña de Nuevo Reporte */}
        {tab === "reporte" && !reporteSeleccionado && (
          <>
            <div style={s.filtrosCard}>
              <div style={s.filtrosGrid}>
                <div style={s.filtroItem}>
                  <label style={s.label}>Fecha desde</label>
                  <input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setHayCambiosSinGuardar(true); }} style={s.input} />
                </div>
                <div style={s.filtroItem}>
                  <label style={s.label}>Fecha hasta</label>
                  <input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setHayCambiosSinGuardar(true); }} style={s.input} />
                </div>
                <div style={s.filtroItem}>
                  <label style={s.label}>Realizado por</label>
                  <select value={realizadoPor} onChange={(e) => { setRealizadoPor(e.target.value); setHayCambiosSinGuardar(true); }} style={s.select}>
                    <option value="TODOS">Todos</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.filtroBotones}>
                  <button onClick={cargarRecibos} disabled={cargando} style={s.btnFiltrar}>
                    {cargando ? "Cargando..." : "🔍 Buscar"}
                  </button>
                  <button onClick={limpiarFormulario} style={s.btnLimpiar}>🧹 Limpiar</button>
                </div>
              </div>
            </div>

            <div style={s.saldoCard}>
              <div style={s.saldoGrid}>
                <div>
                  <label style={s.label}>Saldo inicial (efectivo)</label>
                  <input type="number" step="0.01" value={saldoInicialInput} onChange={(e) => { handleSaldoInicialChange(e); setHayCambiosSinGuardar(true); }} style={s.inputSaldo} placeholder="0.00" />
                </div>
                <div>
                  <label style={s.label}>Saldo final (efectivo)</label>
                  <input type="number" step="0.01" value={saldoFinalInput} onChange={(e) => { handleSaldoFinalChange(e); setHayCambiosSinGuardar(true); }} style={s.inputSaldo} placeholder="0.00" />
                </div>
                <div style={s.diferenciaInfo}> 
                  <span style={{ color: diferenciaColor }}>{diferenciaTexto}</span>
                </div>
              </div>
            </div>

            {/* Totales generales */}
            <div style={s.totalesGenerales}>
              <div style={s.totalPresencialCard}>
                <span style={s.totalLabel}>💰 TOTAL PRESENCIAL</span>
                <span style={s.totalMonto}>RD${totalesPresencial.toFixed(2)}</span>
              </div>
              <div style={s.totalEnLineaCard}>
                <span style={s.totalLabel}>💻 TOTAL PAGO EN LÍNEA</span>
                <span style={s.totalMonto}>RD${totalesEnLinea.toFixed(2)}</span>
              </div>
              <div style={s.totalGeneralCard}>
                <span style={s.totalLabel}>📊 TOTAL GENERAL</span>
                <span style={s.totalMonto}>RD${totalGeneral.toFixed(2)}</span>
              </div>
            </div>

            {/* Conceptos en dos columnas */}
            <div style={s.conceptosGrid}>
              <div style={s.conceptosCard}>
                <h3 style={s.conceptosTitulo}>🏦 Cobros Presenciales</h3>
                <div style={s.conceptosLista}>
                  {todosConceptos.map(concepto => (
                    <div key={`pres-${concepto}`} style={s.conceptoItem}>
                      <span>{concepto}:</span>
                      <span>RD${(conceptosPresencial[concepto] || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={s.conceptoTotal}>
                    <strong>Total Presencial:</strong>
                    <strong>RD${totalesPresencial.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div style={s.conceptosCard}>
                <h3 style={s.conceptosTitulo}>💻 Pago en Línea</h3>
                <div style={s.conceptosLista}>
                  {todosConceptos.map(concepto => (
                    <div key={`linea-${concepto}`} style={s.conceptoItem}>
                      <span>{concepto}:</span>
                      <span>RD${(conceptosEnLinea[concepto] || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={s.conceptoTotal}>
                    <strong>Total en Línea:</strong>
                    <strong>RD${totalesEnLinea.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Métodos de Pago */}
            <div style={s.metodosPagoCard}>
              <h3 style={s.metodosPagoTitulo}>💳 Métodos de Pago</h3>
              <div style={s.metodosPagoTableWrap}>
                <table style={s.tablaMetodosPago}>
                  <thead>
                    <tr style={s.thead}>
                      <th>Denominación</th>
                      <th>Cantidad</th>
                      <th>Efectivo</th>
                      <th>Tarjeta</th>
                      <th>Cheque</th>
                      <th>Transferencia</th>
                      <th>Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {denominaciones.map((den, idx) => (
                      <tr key={den.valor}>
                        <td style={s.tdDenominacion}>RD${den.valor.toFixed(2)}</td>
                        <td style={s.tdCantidad}>
                          <input
                            type="number"
                            min="0"
                            value={denominacionesInput[idx] || ""}
                            onChange={(e) => { handleDenominacionChange(idx, e.target.value); setHayCambiosSinGuardar(true); }}
                            style={s.inputCantidad}
                            placeholder="0"
                          />
                        </td>
                        <td style={s.tdEfectivo}>RD${den.total.toFixed(2)}</td>
                        <td style={s.tdMetodo}>—</td>
                        <td style={s.tdMetodo}>—</td>
                        <td style={s.tdMetodo}>—</td>
                        <td style={s.tdCredito}>
                          <input
                            type="number"
                            min="0"
                            value={creditoInputs[idx] || ""}
                            onChange={(e) => handleCreditoChange(idx, e.target.value)}
                            style={s.inputCantidad}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={s.tfoot}>
                      <td colSpan={2}><strong>TOTALES</strong></td>
                      <td style={s.tdEfectivo}><strong>RD${totalEfectivo.toFixed(2)}</strong></td>
                      <td style={s.tdMetodo}><strong>RD${totalTarjeta.toFixed(2)}</strong></td>
                      <td style={s.tdMetodo}><strong>RD${totalCheque.toFixed(2)}</strong></td>
                      <td style={s.tdMetodo}><strong>RD${totalTransferencia.toFixed(2)}</strong></td>
                      <td style={s.tdCredito}><strong>RD${totalCredito.toFixed(2)}</strong></td>
                    </tr>
                    
                    {/* Fila: Efectivo + Tarjeta + Cheque + Transferencia - Total Recibos */}
                    <tr style={s.tfootDiferencia}>
                      <td colSpan={2}><strong>Base (E+T+C+Tr - Recibos):</strong></td>
                      <td colSpan={5}>
                        <strong>
                          RD${(totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                    
                    {/* Fila: Diferencia final = Base + Crédito */}
                    <tr style={s.tfootDiferencia}>
                      <td colSpan={2}><strong>Diferencia Final:</strong></td>
                      <td colSpan={5}>
                        <strong style={{ 
                          color: (totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto + totalCredito) === 0 
                            ? "#276749" 
                            : (totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto + totalCredito) > 0 
                              ? "#ed8936" 
                              : "#c53030" 
                        }}>
                          RD${Math.abs(totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto + totalCredito).toFixed(2)}
                          {(totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto + totalCredito) === 0 
                            ? " ✓ CUADRADO" 
                            : (totalEfectivo + totalTarjeta + totalCheque + totalTransferencia - totalMonto + totalCredito) > 0 
                              ? " (SOBRANTE)" 
                              : " (FALTANTE)"}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <button onClick={() => { limpiarDenominaciones(); limpiarCreditos(); setHayCambiosSinGuardar(true); }} style={s.btnSecundario}>🧹 Limpiar Todo</button>
              </div>
            </div>

            {/* Listado de Recibos */}
            <div style={s.tablaWrap}>
              <h3>📋 Listado de Recibos</h3>
              <div style={s.tablaScroll}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th>Cobro No.</th>
                      <th>Fecha</th>
                      <th>Cuenta</th>
                      <th>Tutor</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibos && recibos.length > 0 ? (
                      recibos.map((recibo, index) => (
                        <tr key={`${recibo.id}-${index}-${recibo.concepto}`}>
                          <td style={s.td}>{recibo.reciboNo}</td>
                          <td style={s.td}>{formatFechaLarga(recibo.fecha)}</td>
                          <td style={s.td}>{recibo.cuenta}</td>
                          <td style={s.td}>{recibo.tutor}</td>
                          <td style={s.td}>
                            {recibo.concepto === "INSCRIPCION" ? "Inscripción" : 
                            recibo.concepto === "COLEGIATURA" ? "Colegiatura" : 
                            recibo.concepto === "TRANSPORTE" ? "Transporte" : 
                            recibo.concepto === "UNIFORME" ? "Uniforme" : recibo.concepto}
                          </td>
                          <td style={s.td}>RD${recibo.monto.toFixed(2)}</td>
                          <td style={s.td}>{recibo.usuario}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={s.vacio}>Aplique filtros para ver los recibos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={s.buttonGroup}>
              <button 
                onClick={() => guardarReporte("BORRADOR")} 
                disabled={guardando || !recibos || recibos.length === 0} 
                style={s.btnBorrador}
              >
                📝 Guardar Borrador
              </button>
              <button 
                onClick={() => guardarReporte("REPORTADO")} 
                disabled={guardando || !recibos || recibos.length === 0} 
                style={s.btnGuardar}
              >
                Reportar Ingresos
              </button>
            </div>
          </>
        )}

        {/* Pestaña de Listado de Reportes */}
        {tab === "listado" && !reporteSeleccionado && (
          <div style={s.listadoContainer}>
            <div style={s.paginationControls}>
              <button onClick={() => { setPaginaActual(1); cargarReportes(); }} disabled={paginaActual === 1} style={s.btnPag}>⏮</button>
              <button onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); cargarReportes(); }} disabled={paginaActual === 1} style={s.btnPag}>◀</button>
              <span>Página {paginaActual} de {totalPaginas}</span>
              <button onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); cargarReportes(); }} disabled={paginaActual === totalPaginas} style={s.btnPag}>▶</button>
              <button onClick={() => { setPaginaActual(totalPaginas); cargarReportes(); }} disabled={paginaActual === totalPaginas} style={s.btnPag}>⏭</button>
            </div>

            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.thead}>
                    <th>Reporte No.</th>
                    <th>Fecha</th>
                    <th>Período</th>
                    <th>Realizado por</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.length === 0 ? (
                    <tr><td colSpan={8} style={s.vacio}>No hay reportes guardados</td></tr>
                  ) : (
                    reportes.map((reporte) => (
                      <tr key={reporte.id}>
                        <td>{reporte.reporteNo}</td>
                        <td>{formatFechaLarga(reporte.fecha)}</td>
                        <td>{formatFechaLarga(reporte.fechaDesde)} - {formatFechaLarga(reporte.fechaHasta)}</td>
                        <td>{reporte.realizadoPor || "Todos"}</td>
                        <td>{reporte.totalRecibos}</td>
                        <td>RD${reporte.totalMonto.toFixed(2)}</td>
                        <td><span style={reporte.estado === "REPORTADO" ? s.badgeActivo : s.badgeBorrador}>{reporte.estado === "REPORTADO" ? "REPORTADO" : "BORRADOR"}</span></td>
                        <td>
                          <button onClick={() => verReporte(reporte)} style={s.btnVer}>👁️ Ver</button>
                          {reporte.estado === "BORRADOR" && (
                            <button onClick={() => editarReporte(reporte)} style={s.btnEditar}>✏️ Editar</button>
                          )}
                          <button onClick={() => imprimirReporte(reporte)} style={s.btnImprimir}>🖨️ Imprimir</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista de Reporte Seleccionado */}
        {reporteSeleccionado && (
          <div style={s.reporteVista}>
            {/* Encabezado del cuadre */}
            <div style={s.cuadreHeader}>
              <div style={s.cuadreFecha}>
                <p><strong>Fecha:</strong> {formatFechaLarga(reporteSeleccionado.fecha)}</p>
                <p><strong>Cuadro No.:</strong> {reporteSeleccionado.reporteNo.split("-")[1]}</p>
              </div>
              <div style={s.cuadreRecibos}>
                <p><strong>Primer recibo:</strong> {reporteSeleccionado.recibos && reporteSeleccionado.recibos.length > 0 ? reporteSeleccionado.recibos[0]?.reciboNo : "—"}</p>
                <p><strong>Último recibo:</strong> {reporteSeleccionado.recibos && reporteSeleccionado.recibos.length > 0 ? reporteSeleccionado.recibos[reporteSeleccionado.recibos.length - 1]?.reciboNo : "—"}</p>
              </div>
              <div style={s.cuadreSaldo}>
                <p><strong>Saldo inicial:</strong> RD${reporteSeleccionado.saldoInicial.toFixed(2)}</p>
                <p><strong>Saldo final:</strong> RD${reporteSeleccionado.saldoFinal.toFixed(2)}</p>
              </div>
            </div>

            {/* Tabla de resumen - Solo mostrar si resumen existe */}
            {reporteSeleccionado.resumen && (
              <div style={s.resumenCard}>
                <div style={s.resumenTableWrap}>
                  <table style={s.tablaResumen}>
                    <thead>
                      <tr>
                        <th rowSpan={2}>Ingresos</th>
                        <th colSpan={2}>Denominación</th>
                        <th rowSpan={2}>Cantidad</th>
                        <th colSpan={4}>Métodos de Pago</th>
                      </tr>
                      <tr>
                        <th>Efectivo</th>
                        <th>Crédito</th>
                        <th>Tarjeta</th>
                        <th>Cheque</th>
                        <th>Transferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "inscripcion", label: "Inscripción" },
                        { key: "colegiatura", label: "Colegiatura" },
                        { key: "transporte", label: "Transporte" },
                        { key: "uniforme", label: "Uniforme" },
                        { key: "otrosIngresos", label: "Otros Ingresos" }
                      ].map(({ key, label }) => {
                        const data = reporteSeleccionado.resumen?.[key as keyof typeof reporteSeleccionado.resumen];
                        const cantidad = reporteSeleccionado.recibos?.filter(r => {
                          if (key === "inscripcion") return r.concepto === "INSCRIPCION";
                          if (key === "colegiatura") return r.concepto === "COLEGIATURA";
                          if (key === "transporte") return r.concepto === "TRANSPORTE";
                          if (key === "uniforme") return r.concepto === "UNIFORME";
                          return r.concepto !== "INSCRIPCION" && r.concepto !== "COLEGIATURA" && r.concepto !== "TRANSPORTE" && r.concepto !== "UNIFORME";
                        }).length || 0;
                        const total = data?.total || 0;
                        return (
                          <tr key={key}>
                            <td>{label}</td>
                            <td>RD${(data?.efectivo || 0).toFixed(2)}</td>
                            <td>—</td>
                            <td>{cantidad}</td>
                            <td>RD${(data?.tarjeta || 0).toFixed(2)}</td>
                            <td>RD${(data?.cheque || 0).toFixed(2)}</td>
                            <td>RD${(data?.transferencia || 0).toFixed(2)}</td>
                            <td><strong>RD${total.toFixed(2)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>TOTAL</strong></td>
                        <td><strong>RD${reporteSeleccionado.recibos?.filter(r => r.metodoPago === "EFECTIVO").reduce((s, r) => s + r.monto, 0).toFixed(2) || 0}</strong></td>
                        <td>—</td>
                        <td><strong>{reporteSeleccionado.totalRecibos || 0}</strong></td>
                        <td><strong>RD${reporteSeleccionado.recibos?.filter(r => r.metodoPago === "TARJETA").reduce((s, r) => s + r.monto, 0).toFixed(2) || 0}</strong></td>
                        <td><strong>RD${reporteSeleccionado.recibos?.filter(r => r.metodoPago === "CHEQUE").reduce((s, r) => s + r.monto, 0).toFixed(2) || 0}</strong></td>
                        <td><strong>RD${reporteSeleccionado.recibos?.filter(r => r.metodoPago === "TRANSFERENCIA").reduce((s, r) => s + r.monto, 0).toFixed(2) || 0}</strong></td>
                        <td><strong>RD${reporteSeleccionado.totalMonto?.toFixed(2) || 0}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Sección de Sobrante - Solo mostrar si existe */}
            {reporteSeleccionado.saldoFinal !== undefined && (
              <div style={s.sobranteCard}>
                <div style={s.sobranteInfo}>
                  <span><strong>Sub-Total:</strong> RD${(reporteSeleccionado.totalMonto || 0).toFixed(2)}</span>
                  <span><strong>Saldo Inicial:</strong> RD${(reporteSeleccionado.saldoInicial || 0).toFixed(2)}</span>
                  <span><strong>Saldo Final:</strong> RD${(reporteSeleccionado.saldoFinal || 0).toFixed(2)}</span>
                  <span style={{ color: diferenciaColor }}>
                    <strong>Sobrante/Faltante:</strong> {diferenciaTexto}
                  </span>
                </div>
              </div>
            )}

            {/* Lista de recibos */}
            <div style={s.tablaWrap}>
              <h3>Recibos</h3>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>Cobro No.</th>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>Cuenta</th>
                    <th style={s.th}>Tutor</th>
                    <th style={s.th}>Concepto</th>
                    <th style={s.th}>Monto</th>
                    <th style={s.th}>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteSeleccionado.recibos && reporteSeleccionado.recibos.length > 0 ? (
                    reporteSeleccionado.recibos.map((r) => (
                      <tr key={r.id}>
                        <td style={s.td}>{r.reciboNo}</td>
                        <td style={s.td}>{formatFechaLarga(r.fecha)}</td>
                        <td style={s.td}>{r.cuenta}</td>
                        <td style={s.td}>{r.tutor}</td>
                        <td style={s.td}>
                          {r.concepto === "INSCRIPCION" ? "Inscripción" : 
                          r.concepto === "COLEGIATURA" ? "Colegiatura" : 
                          r.concepto === "TRANSPORTE" ? "Transporte" : 
                          r.concepto === "UNIFORME" ? "Uniforme" : 
                          r.concepto === "DERECHO A GRADUACIÓN" ? "Derecho a Graduación" :
                          r.concepto === "EXCURSIÓN ESCOLAR" ? "Excursión Escolar" : 
                          r.concepto}
                        </td>
                        <td style={s.td}>RD${r.monto.toFixed(2)}</td>
                        <td style={s.td}>{r.usuario}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={s.vacio}>No hay recibos en este reporte</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}><strong>Cantidad de cobros:</strong> {reporteSeleccionado.totalRecibos || 0}</td>
                    <td colSpan={2}><strong>Total:</strong> RD${(reporteSeleccionado.totalMonto || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Firmas */}
            <div style={s.firmasContainer}>
              <div style={s.firma}>
                <hr style={s.lineaFirma} />
                <p><strong>Cajero:</strong> _________________</p>
              </div>
              <div style={s.firma}>
                <hr style={s.lineaFirma} />
                <p><strong>Contador:</strong> _________________</p>
              </div>
            </div>

            {/* Botones */}
            <div style={s.buttonGroup}>
              <button onClick={() => setReporteSeleccionado(null)} style={s.btnVolver}>← Volver</button>
              <button onClick={() => imprimirReporte(reporteSeleccionado)} style={s.btnImprimir}>🖨️ Imprimir</button>
            </div>
          </div>
        )}

        {/* Componente oculto para imprimir reporte */}
        <div style={{ display: "none" }}>
          {reporteParaImprimir && (
            <ImprimirContenido
              ref={componentRef}
              titulo={`Reporte de Ingresos ${reporteParaImprimir.reporteNo || ""}`}
              datos={reporteParaImprimir}
              tipo="reporte"
            />
          )}
        </div>
      </div>
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
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  filtrosCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "50px", alignItems: "flex-end" },
  filtroItem: { minWidth: "0", width: "100%" },
  filtroBotones: { display: "flex", gap: "8px", alignItems: "flex-end" },
  saldoGrid: { display: "flex", gap: "20px", flexWrap: "wrap" },
  label: { fontSize: "14px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "4px" },
  tablaScroll: { overflowX: "auto" as const, overflowY: "auto" as const, maxHeight: "500px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "14px" },
  select: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "14px" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", marginRight: "10px", fontSize: "14px" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", fontSize: "14px" },
  saldoCard: { background: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  inputSaldo: { padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "14px", width: "100%", minWidth: "150px", boxSizing: "border-box" as const },
  diferenciaInfo: { background: "#f0f4f8", padding: "8px 16px", borderRadius: "8px", display: "flex", alignItems: "center" },
  btnSecundario: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "14px", marginTop: "16px" },
  buttonGroup: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" },
  btnBorrador: { background: "#e18336", color: "#f4f4f4", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", maxWidth: "100%", padding: "20px" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "15px", minWidth: "700px" },
  thead: { color:"#fff", fontSize:"15px",  background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "14px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0" },
  vacio: { textAlign: "center", padding: "40px", color: "#888" },
  totalesGenerales: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  totalPresencialCard: { background: "linear-gradient(135deg, #2C1810, #4a2518)", borderRadius: "12px", padding: "16px", textAlign: "center", color: "#fff" },
  totalEnLineaCard: { background: "linear-gradient(135deg, #1a5f7a, #2c8cb0)", borderRadius: "12px", padding: "16px", textAlign: "center", color: "#fff" },
  totalGeneralCard: { background: "linear-gradient(135deg, #276749, #2f9e5a)", borderRadius: "12px", padding: "16px", textAlign: "center", color: "#fff" },
  totalLabel: { display: "block", fontSize: "12px", opacity: 0.9, marginBottom: "8px" },
  totalMonto: { display: "block", fontSize: "24px", fontWeight: "bold" },
  conceptosGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" },
  conceptosCard: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  conceptosTitulo: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", marginBottom: "16px", paddingBottom: "8px", borderBottom: "2px solid #2C1810" },
  conceptosLista: { display: "flex", flexDirection: "column" as const, gap: "10px" },
  conceptoItem: { display: "flex", justifyContent: "space-between", fontSize: "15px", padding: "4px 0" },
  conceptoTotal: { display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #eee", fontWeight: "bold" },
  metodosPagoCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" as const },
  metodosPagoTitulo: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", marginBottom: "16px", paddingBottom: "8px", borderBottom: "2px solid #2C1810" },
  metodosPagoTableWrap: { overflowX: "auto", marginBottom: "10px", maxWidth: "100%" },
  tablaMetodosPago: { width: "100%", borderCollapse: "collapse" as const, fontSize: "15px", minWidth: "600px", tableLayout: "fixed" as const },
  inputCantidad: { width: "70px", padding: "6px 4px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", textAlign: "center", boxSizing: "border-box" as const },
  tfoot: { background: "#e9f1f8", fontWeight: "bold" },
  tfootDiferencia: { background: "#e9f1f8", fontWeight: "bold", borderTop: "2px solid #ddd" },
  listadoContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  paginationControls: { display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px", alignItems: "center" },
  btnPag: { background: "#f0f4f8", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" },
  reporteVista: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px", fontSize: "14px" },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px", fontSize: "14px" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", fontSize: "14px" },
  btnVolver: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", marginRight: "auto" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  badgeBorrador: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  cuadreHeader: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" },
  cuadreFecha: { fontSize: "14px" },
  cuadreRecibos: { fontSize: "14px" },
  cuadreSaldo: { fontSize: "14px" },
  resumenCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  resumenTableWrap: { overflowX: "auto" },
  tablaResumen: { width: "100%", borderCollapse: "collapse", fontSize: "15px" },
  sobranteCard: { background: "#f0f4f8", borderRadius: "8px", padding: "16px", marginBottom: "20px" },
  sobranteInfo: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" },
  firmasContainer: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "40px", marginTop: "30px", marginBottom: "20px" },
  firma: { textAlign: "center" },
  lineaFirma: { border: "none", borderTop: "1px solid #333", width: "200px", margin: "0 auto 8px auto" },
  tdCredito: { padding: "10px 8px", textAlign: "center" as const, whiteSpace: "nowrap" as const, verticalAlign: "middle" as const, width: "100px" },
};
