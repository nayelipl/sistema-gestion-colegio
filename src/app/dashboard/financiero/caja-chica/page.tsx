"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFechaLarga, formatFechaLocal } from "@/lib/formatear-fecha";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "../../../../components/ImprimirContenido";
import { ModalDetalleDesembolso } from "@/components/Modales/ModalDetalleDesembolso";
import {
  ModalInicializarFondo,
  ModalNuevoDesembolso,
  ModalGenerarCuadre,
  ModalResultadosCuadre,
  ModalEditarCuadre,
  ModalResultadosEditarCuadre,
} from "@/components/Modales/ModalesCajaChica";

type Tab = "desembolsos" | "cuadres";

type Desembolso = {
  id: number;
  desembolsoNo: string;
  fecha: string;
  pagadoA: string;
  monto: number;
  conCargoA: string;
  porConceptoDe: string;
  aprobadoPor: string;
  recibidoPor: string;
  cedula: string;
  estado: string;
  anuladoPor?: string;
  anuladoEn?: string;
  motivoAnulacion?: string;
  creadoPor: string;
  creadoEn: string;
};

type Cuadre = {
  id: number;
  cuadreNo: string;
  fecha: string;
  fechaDesde: string;
  fechaHasta: string;
  realizadoPor: string;
  saldoInicial: number;
  totalDesembolsos: number;
  saldoActual: number;
  montoReposicion: number;
  estado: string;
  desembolsos: Desembolso[];
  creadoPor: string;
  creadoEn: string;
};

type FondoActual = {
  fondo: { saldoInicial: number; fondoMinimo: number } | null;
  saldoActual: number;
  totalDesembolsos: number;
  fondoMinimo: number;
  requiereReposicion: boolean;
};

export default function CajaChicaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [tab, setTab] = useState<Tab>("desembolsos");
  const [mostrarModalFondo, setMostrarModalFondo] = useState(false);
  const [mostrarModalDesembolso, setMostrarModalDesembolso] = useState(false);
  const [mostrarModalCuadre, setMostrarModalCuadre] = useState(false);
  const [mostrarModalResultadosCuadre, setMostrarModalResultadosCuadre] = useState(false);
  const [mostrarModalEditarCuadre, setMostrarModalEditarCuadre] = useState(false);
  const [mostrarModalResultadosEditarCuadre, setMostrarModalResultadosEditarCuadre] = useState(false);
  const [editandoCuadreId, setEditandoCuadreId] = useState<number | null>(null);
  
  const [fondoActual, setFondoActual] = useState<FondoActual | null>(null);
  const [saldoInicialInput, setSaldoInicialInput] = useState("");
  const [fondoMinimoInput, setFondoMinimoInput] = useState("");

  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [desembolsosFiltrados, setDesembolsosFiltrados] = useState<Desembolso[]>([]);
  const [filtrosTemp, setFiltrosTemp] = useState({fechaDesde: "", fechaHasta: "", estado: "TODOS"});
  const [filtrosAplicados, setFiltrosAplicados] = useState({fechaDesde: "", fechaHasta: "", estado: "TODOS" });
  const [totalDesembolsos, setTotalDesembolsos] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  
  const [formDesembolso, setFormDesembolso] = useState({
    fecha: formatFechaLocal(new Date()),
    pagadoA: "",
    monto: "",
    conCargoA: "",
    porConceptoDe: "",
    aprobadoPor: "",
    recibidoPor: "",
    cedula: "",
  });
  
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);
  const [cuadreSeleccionado, setCuadreSeleccionado] = useState<Cuadre | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cuadreFechaDesde, setCuadreFechaDesde] = useState("");
  const [cuadreFechaHasta, setCuadreFechaHasta] = useState("");
  const [desembolsosParaCuadre, setDesembolsosParaCuadre] = useState<Desembolso[]>([]);
  const [totalDesembolsosCuadre, setTotalDesembolsosCuadre] = useState(0);
  
  const [desembolsoSeleccionado, setDesembolsoSeleccionado] = useState<Desembolso | null>(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const { componentRef, handleImprimir } = useImprimir();
  const [desembolsoParaImprimir, setDesembolsoParaImprimir] = useState<Desembolso | null>(null);
  const [cuadreParaImprimir, setCuadreParaImprimir] = useState<any>(null);

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    if (status === "authenticated") {
      cargarFondo();
      cargarDesembolsos();
      cargarCuadres();
    }
  }, [status]);

  useEffect(() => {
    filtrarDesembolsos();
  }, [filtrosAplicados, desembolsos]);

  const cargarFondo = async () => {
    try {
      const res = await fetch("/api/financiero/caja-chica/fondo");
      const data = await res.json();
      setFondoActual(data);
    } catch (error) {
      console.error("Error cargando fondo:", error);
    }
  };

  const cargarDesembolsos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtrosAplicados.fechaDesde) params.append("fechaDesde", filtrosAplicados.fechaDesde);
      if (filtrosAplicados.fechaHasta) params.append("fechaHasta", filtrosAplicados.fechaHasta);
      if (filtrosAplicados.estado !== "TODOS") params.append("estado", filtrosAplicados.estado);

      const res = await fetch(`/api/financiero/caja-chica?${params.toString()}`);
      const data = await res.json();
      setDesembolsos(data.desembolsos || []);
      setTotalDesembolsos(data.totalMonto || 0);
    } catch (error) {
      console.error("Error cargando desembolsos:", error);
      setError("Error al cargar desembolsos");
    } finally {
      setCargando(false);
    }
  };

  const cargarCuadres = async () => {
    try {
      const res = await fetch(`/api/financiero/caja-chica/cuadre?page=${paginaActual}&limit=10`);
      const data = await res.json();
      setCuadres(data.cuadres || []);
      setTotalPaginas(data.totalPaginas || 1);
    } catch (error) {
      console.error("Error cargando cuadres:", error);
    }
  };

  const filtrarDesembolsos = () => {
    let filtrados = [...desembolsos];
    
    if (filtrosAplicados.fechaDesde) {
      filtrados = filtrados.filter(d => new Date(d.fecha) >= new Date(filtrosAplicados.fechaDesde));
    }
    if (filtrosAplicados.fechaHasta) {
      filtrados = filtrados.filter(d => new Date(d.fecha) <= new Date(filtrosAplicados.fechaHasta));
    }
    if (filtrosAplicados.estado !== "TODOS") {
      filtrados = filtrados.filter(d => d.estado === filtrosAplicados.estado);
    }
    
    setDesembolsosFiltrados(filtrados);
  };

  const inicializarFondo = async () => {
    if (!saldoInicialInput || parseFloat(saldoInicialInput) <= 0) {
      setError("Ingrese un saldo inicial válido");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("/api/financiero/caja-chica/fondo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saldoInicial: parseFloat(saldoInicialInput),
          fondoMinimo: parseFloat(fondoMinimoInput) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito("Fondo inicializado correctamente");
      setMostrarModalFondo(false);
      setSaldoInicialInput("");
      setFondoMinimoInput("");
      cargarFondo();
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al inicializar fondo");
    } finally {
      setCargando(false);
    }
  };

  const registrarDesembolso = async () => {
    if (!formDesembolso.pagadoA || !formDesembolso.monto || !formDesembolso.conCargoA || 
        !formDesembolso.porConceptoDe || !formDesembolso.aprobadoPor || !formDesembolso.recibidoPor) {
      setError("Complete todos los campos obligatorios");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("/api/financiero/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formDesembolso,
          monto: parseFloat(formDesembolso.monto)
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito(`Desembolso ${data.desembolso.desembolsoNo} registrado`);
      setMostrarModalDesembolso(false);
      setFormDesembolso({
        fecha: formatFechaLocal(new Date()),
        pagadoA: "",
        monto: "",
        conCargoA: "",
        porConceptoDe: "",
        aprobadoPor: "",
        recibidoPor: "",
        cedula: "",
      });
      
      if (data.requiereReposicion) {
        setError(`⚠️ El fondo ha llegado al mínimo (RD$${fondoActual?.fondoMinimo}). Solicite reposición.`);
        setTimeout(() => setError(""), 5000);
      }
      
      cargarDesembolsos();
      cargarFondo();
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al registrar desembolso");
    } finally {
      setCargando(false);
    }
  };

  const verDesembolso = (desembolso: Desembolso) => {
    setDesembolsoSeleccionado(desembolso);
    setMostrarModalDetalle(true);
  };

  const anularDesembolso = async (id: number, desembolsoNo: string) => {
    const motivo = prompt("Motivo de anulación:");
    if (!motivo) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/financiero/caja-chica/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anulado: true, motivoAnulacion: motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito(`Desembolso ${desembolsoNo} anulado`);
      cargarDesembolsos();
      cargarFondo();
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError("Error al anular desembolso");
    } finally {
      setCargando(false);
    }
  };

  const guardarCuadre = async (estado: "BORRADOR" | "REPORTADO") => {
    if (!fondoActual?.fondo) {
      setError("No hay fondo inicializado");
      return;
    }

    if (!cuadreFechaDesde || !cuadreFechaHasta) {
      setError("Seleccione el período del cuadre");
      return;
    }

    try {
      const res = await fetch("/api/financiero/caja-chica/cuadre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaDesde: cuadreFechaDesde,
          fechaHasta: cuadreFechaHasta,
          desembolsos: desembolsosParaCuadre,
          totalDesembolsos: totalDesembolsosCuadre,
          saldoInicial: fondoActual.fondo.saldoInicial,
          estado
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito(`Cuadre ${estado === "REPORTADO" ? "guardado" : "guardado como borrador"}`);
      setMostrarModalCuadre(false);
      setMostrarModalResultadosCuadre(false);
      setCuadreFechaDesde("");
      setCuadreFechaHasta("");
      setDesembolsosParaCuadre([]);
      cargarCuadres();
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError("Error al guardar cuadre");
    }
  };

  const actualizarCuadre = async (estado: "BORRADOR" | "REPORTADO") => {
    if (!fondoActual?.fondo) {
      setError("No hay fondo inicializado");
      return;
    }

    if (!cuadreFechaDesde || !cuadreFechaHasta) {
      setError("Seleccione el período del cuadre");
      return;
    }

    try {
      const res = await fetch(`/api/financiero/caja-chica/cuadre/${editandoCuadreId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaDesde: cuadreFechaDesde,
          fechaHasta: cuadreFechaHasta,
          desembolsos: desembolsosParaCuadre,
          totalDesembolsos: totalDesembolsosCuadre,
          saldoInicial: fondoActual.fondo.saldoInicial,
          estado
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito(`Cuadre ${estado === "REPORTADO" ? "actualizado y reportado" : "actualizado"} correctamente`);
      setMostrarModalEditarCuadre(false);
      setMostrarModalResultadosEditarCuadre(false);
      setEditandoCuadreId(null);
      setCuadreFechaDesde("");
      setCuadreFechaHasta("");
      setDesembolsosParaCuadre([]);
      cargarCuadres();
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError("Error al actualizar cuadre");
    }
  };

  const previsualizarCuadre = async () => {
    if (!cuadreFechaDesde || !cuadreFechaHasta) {
      setError("Seleccione el período del cuadre");
      return;
    }

    setCargando(true);
    try {
      const params = new URLSearchParams();
      params.append("fechaDesde", cuadreFechaDesde);
      params.append("fechaHasta", cuadreFechaHasta);
      params.append("estado", "TODOS");

      const res = await fetch(`/api/financiero/caja-chica?${params.toString()}`);
      const data = await res.json();
      
      const desembolsosEnPeriodo = data.desembolsos || [];
      
      if (desembolsosEnPeriodo.length === 0) {
        setError("No hay desembolsos en el período seleccionado");
        return;
      }

      const total = desembolsosEnPeriodo.reduce((sum: number, d: Desembolso) => sum + d.monto, 0);
      setDesembolsosParaCuadre(desembolsosEnPeriodo);
      setTotalDesembolsosCuadre(total);
      setMostrarModalCuadre(false);
      setMostrarModalResultadosCuadre(true);
    } catch (error) {
      console.error("Error previsualizando cuadre:", error);
      setError("Error al obtener desembolsos para el cuadre");
    } finally {
      setCargando(false);
    }
  };

  const previsualizarEditarCuadre = async () => {
    if (!filtrosAplicados.fechaDesde || !filtrosAplicados.fechaHasta) {
      setError("Seleccione el período del cuadre en los filtros");
      return;
    }

    setCargando(true);
    try {
      const params = new URLSearchParams();
      params.append("fechaDesde", filtrosAplicados.fechaDesde);
      params.append("fechaHasta", filtrosAplicados.fechaHasta);
      params.append("estado", "TODOS");

      const res = await fetch(`/api/financiero/caja-chica?${params.toString()}`);
      const data = await res.json();
      
      const desembolsosEnPeriodo = data.desembolsos || [];
      
      if (desembolsosEnPeriodo.length === 0) {
        setError("No hay desembolsos en el período seleccionado");
        return;
      }

      const total = desembolsosEnPeriodo.reduce((sum: number, d: Desembolso) => sum + d.monto, 0);
      setDesembolsosParaCuadre(desembolsosEnPeriodo);
      setTotalDesembolsosCuadre(total);
      setCuadreFechaDesde(filtrosAplicados.fechaDesde);
      setCuadreFechaHasta(filtrosAplicados.fechaHasta);
      setMostrarModalResultadosEditarCuadre(true);
    } catch (error) {
      console.error("Error previsualizando edición:", error);
      setError("Error al obtener desembolsos para el cuadre");
    } finally {
      setCargando(false);
    }
  };

  const verCuadre = (cuadre: Cuadre) => {
    setCuadreSeleccionado(cuadre);
  };

  const imprimirDesembolso = (desembolso: Desembolso) => {
    setDesembolsoParaImprimir({
      ...desembolso,
      estado: desembolso.estado,
      anuladoPor: desembolso.anuladoPor,
      anuladoEn: desembolso.anuladoEn,
      motivoAnulacion: desembolso.motivoAnulacion,
    });
    setTimeout(() => handleImprimir(), 100);
  };

  const imprimirCuadre = (cuadre: Cuadre) => {
    setCuadreParaImprimir({
      ...cuadre,
      diferencia: cuadre.saldoActual - cuadre.saldoInicial,
      diferenciaTexto: cuadre.saldoActual - cuadre.saldoInicial === 0 ? "CUADRADO" : 
                        (cuadre.saldoActual - cuadre.saldoInicial > 0 ? "SOBRANTE" : "FALTANTE")
    });
    setTimeout(() => handleImprimir(), 100);
  };

  const guardarCuadreReportado = async (id: number) => {
    try {
      const res = await fetch(`/api/financiero/caja-chica/cuadre/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "REPORTADO" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito("Cuadre reportado correctamente");
      cargarCuadres();
      setCuadreSeleccionado(null);
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError("Error al reportar cuadre");
    }
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtrosTemp);
    setCargando(true);
    setTimeout(() => {
      cargarDesembolsos();
    }, 100);
  };

  const limpiarFiltros = () => {
    const nuevosFiltros = { fechaDesde: "", fechaHasta: "", estado: "TODOS" };
    setFiltrosTemp(nuevosFiltros);
    setFiltrosAplicados(nuevosFiltros);
    setTimeout(() => {
      cargarDesembolsos();
    }, 100);
  };

  const formatMonto = (monto: number) => {
    return `RD$${monto.toFixed(2)}`;
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>💰 Caja Chica</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Caja Chica</h1>
          <p style={s.subtitulo}>Control de fondo y desembolsos para gastos menores</p>
        </div>

        {/* Tarjeta de fondo actual */}
        <div style={s.fondoCard}>
          <div style={s.fondoHeader}>
            <span style={s.fondoIcon}>💰</span>
            <h3 style={s.fondoTitulo}>Estado del Fondo</h3>
          </div>
          <div style={s.fondoStats}>
            <div style={s.fondoStatItem}>
              <span style={s.fondoStatLabel}>Saldo Inicial</span>
              <span style={s.fondoStatValor}>{formatMonto(fondoActual?.fondo?.saldoInicial || 0)}</span>
            </div>
            <div style={s.fondoStatItem}>
              <span style={s.fondoStatLabel}>Fondo Mínimo</span>
              <span style={s.fondoStatValor}>{formatMonto(fondoActual?.fondoMinimo || 0)}</span>
            </div>
            <div style={s.fondoStatItem}>
              <span style={s.fondoStatLabel}>Total Desembolsos</span>
              <span style={s.fondoStatValor}>{formatMonto(fondoActual?.totalDesembolsos || 0)}</span>
            </div>
            <div style={s.fondoStatItem}>
              <span style={s.fondoStatLabel}>Saldo Actual</span>
              <span style={{
                ...s.fondoStatValor,
                fontSize: "24px",
                fontWeight: "bold",
                color: (fondoActual?.saldoActual || 0) <= (fondoActual?.fondoMinimo || 0) ? "#e53e3e" : "#276749"
              }}>
                {formatMonto(fondoActual?.saldoActual || 0)}
              </span>
            </div>
          </div>
          
          {fondoActual?.requiereReposicion && (
            <div style={s.alertaReposicion}>
              <span style={s.alertaIcon}>⚠️</span>
              <span>El fondo ha llegado al mínimo. Solicite reposición.</span>
            </div>
          )}
          
          <div style={s.fondoBotones}>
            {!fondoActual?.fondo && (
              <button onClick={() => setMostrarModalFondo(true)} style={s.btnInicializar}>
                🏦 Inicializar Fondo
              </button>
            )}
            <button onClick={() => setMostrarModalDesembolso(true)} style={s.btnDesembolso}>
              💸 Nuevo Desembolso
            </button>
            {editandoCuadreId ? (
              <button onClick={previsualizarEditarCuadre} style={s.btnGuardar}>
                💾 Guardar Cambios
              </button>
            ) : (
              <button onClick={() => setMostrarModalCuadre(true)} style={s.btnCuadre}>
                📊 Generar Cuadre
              </button>
            )}
          </div>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.tabs}>
          <button onClick={() => { setTab("desembolsos"); setCuadreSeleccionado(null); setEditandoCuadreId(null); }} style={{ ...s.tab, ...(tab === "desembolsos" ? s.tabActivo : {}) }}>
            📋 Desembolsos
          </button>
          <button onClick={() => { setTab("cuadres"); setCuadreSeleccionado(null); }} style={{ ...s.tab, ...(tab === "cuadres" ? s.tabActivo : {}) }}>
            📊 Cuadres Guardados ({cuadres.length})
          </button>
        </div>

        {tab === "desembolsos" && (
          <>
            <div style={s.filtrosGrid}>
              <div>
                <label style={s.label}>Fecha desde</label>
                <input 
                  type="date" 
                  value={filtrosTemp.fechaDesde} 
                  onChange={(e) => setFiltrosTemp({...filtrosTemp, fechaDesde: e.target.value})} 
                  style={s.input} 
                />
              </div>
              <div>
                <label style={s.label}>Fecha hasta</label>
                <input 
                  type="date" 
                  value={filtrosTemp.fechaHasta} 
                  onChange={(e) => setFiltrosTemp({...filtrosTemp, fechaHasta: e.target.value})} 
                  style={s.input} 
                />
              </div>
              <div>
                <label style={s.label}>Estado</label>
                <select 
                  value={filtrosTemp.estado} 
                  onChange={(e) => setFiltrosTemp({...filtrosTemp, estado: e.target.value})} 
                  style={s.input}
                >
                  <option value="TODOS">Todos</option>
                  <option value="ACTIVA">Activos</option>
                  <option value="ANULADA">Anulados</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={aplicarFiltros} style={s.btnFiltrar}>🔍 Filtrar</button>
                <button onClick={limpiarFiltros} style={s.btnLimpiar}>🧹 Limpiar</button>
              </div>
            </div>

            <div style={s.totalesCard}>
              <div><strong>Total Desembolsos:</strong> {formatMonto(totalDesembolsos)}</div>
              <div><strong>Cantidad:</strong> {desembolsosFiltrados.length}</div>
            </div>

            <div style={s.tablaWrap}>
              <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>No.</th>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Pagado a</th>
                      <th style={s.th}>Monto</th>
                      <th style={s.th}>Concepto</th>
                      <th style={s.th}>Aprobado por</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desembolsosFiltrados.length === 0 ? (
                      <tr><td colSpan={8} style={s.vacio}>No hay desembolsos registrados</td></tr>
                    ) : (
                      desembolsosFiltrados.map((d) => (
                        <tr key={d.id} style={d.estado === "ANULADA" ? { backgroundColor: "#fff5f5" } : {}}>
                          <td style={s.td}>{d.desembolsoNo}</td>
                          <td style={s.td}>{formatFechaLarga(d.fecha)}</td>
                          <td style={s.td}>{d.pagadoA}</td>
                          <td style={s.td}>{formatMonto(d.monto)}</td>
                          <td style={s.td}>{d.porConceptoDe}</td>
                          <td style={s.td}>{d.aprobadoPor}</td>
                          <td style={s.td}>
                            {d.estado === "ANULADA" ? 
                              <span style={s.badgeAnulado}>ANULADO</span> : 
                              <span style={s.badgeActivo}>ACTIVO</span>
                            }
                          </td>
                          <td style={s.td}>
                            <button onClick={() => verDesembolso(d)} style={s.btnVer}>👁️ Ver</button>
                            <button onClick={() => imprimirDesembolso(d)} style={s.btnImprimir}>🖨️</button>
                            {d.estado !== "ANULADA" && (
                              <button onClick={() => anularDesembolso(d.id, d.desembolsoNo)} style={s.btnAnular}>🚫</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Pestaña de Cuadres */}
        {tab === "cuadres" && !cuadreSeleccionado && (
          <div style={s.listadoContainer}>
            <div style={s.paginationControls}>
              <button onClick={() => { setPaginaActual(1); cargarCuadres(); }} disabled={paginaActual === 1} style={s.btnPag}>⏮</button>
              <button onClick={() => { setPaginaActual(p => Math.max(1, p - 1)); cargarCuadres(); }} disabled={paginaActual === 1} style={s.btnPag}>◀</button>
              <span>Página {paginaActual} de {totalPaginas}</span>
              <button onClick={() => { setPaginaActual(p => Math.min(totalPaginas, p + 1)); cargarCuadres(); }} disabled={paginaActual === totalPaginas} style={s.btnPag}>▶</button>
              <button onClick={() => { setPaginaActual(totalPaginas); cargarCuadres(); }} disabled={paginaActual === totalPaginas} style={s.btnPag}>⏭</button>
            </div>

            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>Cuadre No.</th>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>Período</th>
                    <th style={s.th}>Saldo Inicial</th>
                    <th style={s.th}>Total Desembolsos</th>
                    <th style={s.th}>Saldo Actual</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuadres.length === 0 ? (
                    <tr><td colSpan={8} style={s.vacio}>No hay cuadres guardados</td></tr>
                  ) : (
                    cuadres.map((c) => (
                      <tr key={c.id}>
                        <td style={s.td}>{c.cuadreNo}</td>
                        <td style={s.td}>{formatFechaLarga(c.fecha)}</td>
                        <td style={s.td}>{formatFechaLarga(c.fechaDesde)} - {formatFechaLarga(c.fechaHasta)}</td>
                        <td style={s.td}>{formatMonto(c.saldoInicial)}</td>
                        <td style={s.td}>{formatMonto(c.totalDesembolsos)}</td>
                        <td style={s.td}>{formatMonto(c.saldoActual)}</td>
                        <td style={s.td}>
                          <span style={c.estado === "REPORTADO" ? s.badgeActivo : s.badgeBorrador}>
                            {c.estado === "REPORTADO" ? "REPORTADO" : "BORRADOR"}
                          </span>
                        </td>
                        <td style={s.td}>
                          <button onClick={() => verCuadre(c)} style={s.btnVer}>👁️ Ver</button>
                          <button onClick={() => imprimirCuadre(c)} style={s.btnImprimir}>🖨️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista de Cuadre Seleccionado */}
        {cuadreSeleccionado && (
          <div style={s.cuadreVista}>
            <div style={s.cuadreHeader}>
              <div>
                <h3>Cuadre No. {cuadreSeleccionado.cuadreNo}</h3>
                <p>Fecha: {formatFechaLarga(cuadreSeleccionado.fecha)}</p>
                <p>Período: {formatFechaLarga(cuadreSeleccionado.fechaDesde)} - {formatFechaLarga(cuadreSeleccionado.fechaHasta)}</p>
                <p>Realizado por: {cuadreSeleccionado.realizadoPor}</p>
                <p>Estado: {cuadreSeleccionado.estado === "REPORTADO" ? "REPORTADO" : "BORRADOR"}</p>
              </div>
              <div>
                <button onClick={() => setCuadreSeleccionado(null)} style={s.btnVolver}>← Volver</button>
                {cuadreSeleccionado.estado === "BORRADOR" && (
                  <>
                    <button onClick={() => {
                      setCuadreSeleccionado(null);
                      setEditandoCuadreId(cuadreSeleccionado.id);
                      setTab("desembolsos");
                      setFiltrosTemp({
                        fechaDesde: cuadreSeleccionado.fechaDesde.split('T')[0],
                        fechaHasta: cuadreSeleccionado.fechaHasta.split('T')[0],
                        estado: "TODOS"
                      });
                      setFiltrosAplicados({
                        fechaDesde: cuadreSeleccionado.fechaDesde.split('T')[0],
                        fechaHasta: cuadreSeleccionado.fechaHasta.split('T')[0],
                        estado: "TODOS"
                      });
                      
                      setExito(`Editando cuadre - puede modificar los filtros y guardar los cambios`);
                      setTimeout(() => setExito(""), 3000);
                    }} style={s.btnEditar}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => guardarCuadreReportado(cuadreSeleccionado.id)} style={s.btnGuardar}>
                      ✅ Reportar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={s.cuadreResumen}>
              <div><strong>Saldo Inicial:</strong> {formatMonto(cuadreSeleccionado.saldoInicial)}</div>
              <div><strong>Total Desembolsos:</strong> {formatMonto(cuadreSeleccionado.totalDesembolsos)}</div>
              <div><strong>Saldo Actual:</strong> {formatMonto(cuadreSeleccionado.saldoActual)}</div>
              <div><strong>Monto Reposición:</strong> {formatMonto(cuadreSeleccionado.montoReposicion)}</div>
              <div><strong>Diferencia:</strong> {formatMonto(cuadreSeleccionado.saldoActual - cuadreSeleccionado.saldoInicial)}</div>
            </div>

            <h3>Desembolsos incluidos</h3>
            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.thead}>
                    <th>No.</th>
                    <th>Fecha</th>
                    <th>Pagado a</th>
                    <th>Monto</th>
                    <th>Concepto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuadreSeleccionado.desembolsos?.map((d, idx) => (
                    <tr key={idx} style={d.estado === "ANULADA" ? { backgroundColor: "#fff5f5" } : {}}>
                      <td style={s.td}>{d.desembolsoNo}</td>
                      <td style={s.td}>{formatFechaLarga(d.fecha)}</td>
                      <td style={s.td}>{d.pagadoA} {d.estado === "ANULADA" && <span style={{ color: "#c53030", marginLeft: "8px" }}>(ANULADO)</span>}</td>
                      <td style={s.td}>{formatMonto(d.monto)}</td>
                      <td style={s.td}>{d.porConceptoDe}</td>
                      <td style={s.td}>
                        {d.estado === "ANULADA" ? 
                          <span style={s.badgeAnulado}>ANULADO</span> : 
                          <span style={s.badgeActivo}>ACTIVO</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ModalInicializarFondo
        isOpen={mostrarModalFondo}
        onClose={() => setMostrarModalFondo(false)}
        onInicializar={inicializarFondo}
        saldoInicialInput={saldoInicialInput}
        setSaldoInicialInput={setSaldoInicialInput}
        fondoMinimoInput={fondoMinimoInput}
        setFondoMinimoInput={setFondoMinimoInput}
        cargando={cargando}
        styles={s}
      />

      <ModalNuevoDesembolso
        isOpen={mostrarModalDesembolso}
        onClose={() => setMostrarModalDesembolso(false)}
        onRegistrar={registrarDesembolso}
        formDesembolso={formDesembolso}
        setFormDesembolso={setFormDesembolso}
        cargando={cargando}
        styles={s}
      />

      <ModalGenerarCuadre
        isOpen={mostrarModalCuadre}
        onClose={() => setMostrarModalCuadre(false)}
        onPrevisualizar={previsualizarCuadre}
        cuadreFechaDesde={cuadreFechaDesde}
        setCuadreFechaDesde={setCuadreFechaDesde}
        cuadreFechaHasta={cuadreFechaHasta}
        setCuadreFechaHasta={setCuadreFechaHasta}
        cargando={cargando}
        styles={s}
      />

      <ModalResultadosCuadre
        isOpen={mostrarModalResultadosCuadre}
        onClose={() => setMostrarModalResultadosCuadre(false)}
        onGuardarBorrador={() => guardarCuadre("BORRADOR")}
        onReportar={() => guardarCuadre("REPORTADO")}
        periodoDesde={cuadreFechaDesde}
        periodoHasta={cuadreFechaHasta}
        saldoInicial={fondoActual?.fondo?.saldoInicial || 0}
        totalDesembolsos={totalDesembolsosCuadre}
        desembolsos={desembolsosParaCuadre}
        cargando={cargando}
        styles={s}
        formatMonto={formatMonto}
      />

      <ModalEditarCuadre
        isOpen={mostrarModalEditarCuadre}
        onClose={() => {
          setMostrarModalEditarCuadre(false);
          setEditandoCuadreId(null);
        }}
        onPrevisualizar={previsualizarEditarCuadre}
        cuadreFechaDesde={cuadreFechaDesde}
        setCuadreFechaDesde={setCuadreFechaDesde}
        cuadreFechaHasta={cuadreFechaHasta}
        setCuadreFechaHasta={setCuadreFechaHasta}
        cargando={cargando}
        styles={s}
      />

      <ModalResultadosEditarCuadre
        isOpen={mostrarModalResultadosEditarCuadre}
        onClose={() => setMostrarModalResultadosEditarCuadre(false)}
        onGuardarBorrador={() => actualizarCuadre("BORRADOR")}
        onReportar={() => actualizarCuadre("REPORTADO")}
        periodoDesde={cuadreFechaDesde}
        periodoHasta={cuadreFechaHasta}
        saldoInicial={fondoActual?.fondo?.saldoInicial || 0}
        totalDesembolsos={totalDesembolsosCuadre}
        desembolsos={desembolsosParaCuadre}
        cargando={cargando}
        styles={s}
        formatMonto={formatMonto}
      />

      <ModalDetalleDesembolso
        isOpen={mostrarModalDetalle}
        onClose={() => setMostrarModalDetalle(false)}
        onPrint={() => imprimirDesembolso(desembolsoSeleccionado!)}
        desembolso={desembolsoSeleccionado}
        styles={s}
      />

      {/* Componente oculto para imprimir */}
      <div style={{ display: "none" }}>
        {desembolsoParaImprimir && (
          <ImprimirContenido
            ref={componentRef}
            titulo={`Desembolso Caja Chica ${desembolsoParaImprimir.desembolsoNo}`}
            datos={desembolsoParaImprimir}
            tipo="desembolso-caja-chica"
          />
        )}
        {cuadreParaImprimir && (
          <ImprimirContenido
            ref={componentRef}
            titulo={`Cuadre Caja Chica ${cuadreParaImprimir.cuadreNo}`}
            datos={cuadreParaImprimir}
            tipo="cuadre-caja-chica"
          />
        )}
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
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  fondoCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" },
  fondoHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingBottom: "12px", borderBottom: "2px solid #f0f0f0" },
  fondoIcon: { fontSize: "24px" },
  fondoTitulo: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  fondoStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" },
  fondoStatItem: { background: "#f8f9fa", borderRadius: "10px", padding: "12px 16px", textAlign: "center" as const },
  fondoStatLabel: { display: "block", fontSize: "12px", color: "#666", marginBottom: "6px" },
  fondoStatValor: { display: "block", fontSize: "20px", fontWeight: "bold", color: "#333" },
  alertaReposicion: { background: "#fff5f5", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", color: "#c53030", border: "1px solid #fed7d7" },
  fondoBotones: { display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" },
  btnInicializar: { background: "#276749", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  btnDesembolso: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  btnCuadre: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", alignItems: "flex-end", marginBottom: "20px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  totalesCard: { background: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "800px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 12px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f0", fontSize: "13px" },
  vacio: { textAlign: "center", padding: "40px", color: "#888" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAnulado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", textDecoration: "line-through" },
  badgeBorrador: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", marginRight: "4px", fontSize: "11px" },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "11px" },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", marginRight: "4px", fontSize: "11px" },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", marginLeft: "8px" },
  listadoContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  paginationControls: { display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px", alignItems: "center" },
  btnPag: { background: "#f0f4f8", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" },
  cuadreVista: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  cuadreHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #eee" },
  cuadreResumen: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px", padding: "16px", background: "#f0f4f8", borderRadius: "8px" },
  btnVolver: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" as const },
  formGroup: { marginBottom: "16px" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "16px" },
  modalBotones: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #eee" },
  btnCancelar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  btnGuardar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  btnBorrador: { background: "#e18336", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  thMini: { padding: "6px 8px", background: "#f0f4f8", textAlign: "left" as const, borderBottom: "1px solid #ddd", fontWeight: "bold", fontSize: "11px", color: "#333" },
  tdMini: { padding: "6px 8px", borderBottom: "1px solid #f0f0f0", fontSize: "11px" },
  tablaMini: { width: "100%", borderCollapse: "collapse" as const, fontSize: "11px", marginBottom: "16px" },
  btnCerrarModal: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666", padding: "4px 8px", borderRadius: "4px", transition: "all 0.2s ease" },
  btnImprimirModal: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", marginLeft: "8px" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #eee" },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  modalBody: { maxHeight: "60vh", overflowY: "auto" as const },
  detalleGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", fontSize: "13px" },
  anuladoBadge: { display: "inline-block", marginLeft: "12px", fontSize: "11px", color: "#c53030", background: "#fff5f5", padding: "2px 8px", borderRadius: "4px" },
};
