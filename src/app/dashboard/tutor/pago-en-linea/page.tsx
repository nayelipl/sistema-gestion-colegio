"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatFechaLocal, formatFechaLarga } from "@/lib/formatear-fecha";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";
import { redistribuirExcedente } from "@/lib/redistribuir-excedente";
import { ModalDetalleRecibo } from "@/components/Modales/ModalDetalleRecibo";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "@/components/ImprimirContenido";
import NavBar from "@/components/NavBar";

type Cargo = {
  id: number;
  cargoNo: string;
  tipo: string;
  fechaVencimiento: string;
  monto: number;
  recargo: number;
  montoTotal: number;
  saldoPendiente: number;
  estudiante?: { id: number; nombre: string; apellido: string; codigo: string };
};

type EstudianteConDeuda = {
  id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  tieneDeuda: boolean;
  tieneTransporte: boolean;
  tieneMatriculaActiva?: boolean;
};

type Recibo = {
  id: number;
  reciboNo: string;
  fecha: string;
  hora: string;
  metodoPago: string;
  total: number;
  realizadoPor: string;
  anulado: boolean;
  concepto: string;
  alPortador: string;
  descripcion: string;
  tutor: { nombre: string; apellido: string; cuentaNo: string };
};

type TarifaActiva = {
  id: number;
  anioEscolar: string;
  colegiaturaNumCuotas: number;
  transporteNumCuotas: number;
  recargoPorcentaje: number;
  colegiaturaDiasGracia: number;
  transporteDiasGracia: number;
};

export default function PagoEnLineaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";
  const [tutorId, setTutorId] = useState<number | null>(null);
  const { componentRef, handleImprimir } = useImprimir();
  const [reciboParaImprimir, setReciboParaImprimir] = useState<any>(null);

  const [tab, setTab] = useState<"cargos" | "otros" | "recibos">("cargos");

  // Cargos
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargosFiltrados, setCargosFiltrados] = useState<Cargo[]>([]);
  const [haFiltrado, setHaFiltrado] = useState(false);
  const [balanceTotal, setBalanceTotal] = useState(0);
  const [balanceFiltrado, setBalanceFiltrado] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);
  const [cargosSeleccionados, setCargosSeleccionados] = useState<Record<number, number>>({});
  const [conceptoCargo, setConceptoCargo] = useState("PAGO COLEGIATURA & TRANSPORTE");
  const [fechaHasta, setFechaHasta] = useState(formatFechaLocal(new Date()));
  const [cargandoCargos, setCargandoCargos] = useState(false);
  
  // Dropdown de estudiantes
  const [estudiantesConDeuda, setEstudiantesConDeuda] = useState<EstudianteConDeuda[]>([]);
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState<number[]>([]);
  const [mostrarDropdownEstudiantes, setMostrarDropdownEstudiantes] = useState(false);
  const dropdownEstudiantesRef = useRef<HTMLDivElement>(null);

  // Tarifas
  const [tarifaActiva, setTarifaActiva] = useState<TarifaActiva | null>(null);
  
  // Resumen
  const [resumenCuotas, setResumenCuotas] = useState({
    colegiaturaPagadas: 0,
    colegiaturaTotal: 11,
    transportePagadas: 0,
    transporteTotal: 10,
    colegiaturaProximaFecha: null as Date | null,
    transporteProximaFecha: null as Date | null
  });
  const [mensajeEstado, setMensajeEstado] = useState({ texto: "✅ Tutor al día", tieneDeuda: false });

  // Otros ingresos
  const [estudiantes, setEstudiantes] = useState<EstudianteConDeuda[]>([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteConDeuda | null>(null);
  const [conceptoOtro, setConceptoOtro] = useState("");
  const [descripcionOtro, setDescripcionOtro] = useState("");
  const [montoOtro, setMontoOtro] = useState("");
  const [cargandoOtro, setCargandoOtro] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Listado de Recibos
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [cargandoRecibos, setCargandoRecibos] = useState(false);
  const [fechaDesdeRecibo, setFechaDesdeRecibo] = useState("");
  const [fechaHastaRecibo, setFechaHastaRecibo] = useState("");
  const [conceptoFiltro, setConceptoFiltro] = useState("TODOS");
  const [haBuscado, setHaBuscado] = useState(false);
  const [reciboSeleccionado, setReciboSeleccionado] = useState<Recibo | null>(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownEstudiantesRef.current && !dropdownEstudiantesRef.current.contains(event.target as Node)) {
        setMostrarDropdownEstudiantes(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const obtenerTutorId = async () => {
      if (status === "authenticated" && rol === "TUTOR") {
        try {
          const res = await fetch("/api/usuarios/tutor-actual");
          const data = await res.json();
          
          if (data.tutorId) {
            setTutorId(data.tutorId);
            }
        } catch (error) {
          console.error("Error obteniendo tutorId:", error);
        }
      }
    };
    obtenerTutorId();
  }, [status, rol, session?.user?.email]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "TUTOR") {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    if (tutorId) {
      cargarTarifaActiva();
      cargarCargos();
      cargarEstudiantesConDeuda();
    }
  }, [tutorId]);

  const cargarTarifaActiva = async () => {
    try {
      const res = await fetch("/api/administracion/tarifas/activas");
      const data = await res.json();
      if (data.tarifaActiva) {
        setTarifaActiva({
          id: data.tarifaActiva.id,
          anioEscolar: data.tarifaActiva.anioEscolar,
          colegiaturaNumCuotas: data.tarifaActiva.colegiaturaNumCuotas || 11,
          transporteNumCuotas: data.tarifaActiva.transporteNumCuotas || 10,
          recargoPorcentaje: data.tarifaActiva.recargoPorcentaje || 0,
          colegiaturaDiasGracia: data.tarifaActiva.colegiaturaDiasGracia || 0,
          transporteDiasGracia: data.tarifaActiva.transporteDiasGracia || 0,
        });
      }
    } catch (error) {
      console.error("Error cargando tarifa activa:", error);
    }
  };

  const cargarEstudiantesConDeuda = async () => {
    if (!tutorId) return;
    try {
        const allEstudiantesRes = await fetch("/api/tutor/representados/");
        const allEstudiantesData = await allEstudiantesRes.json();
        
        if (allEstudiantesRes.ok) {
        const estudiantesData = allEstudiantesData.estudiantes || [];
        
        // Verificar si tiene estudiantes con cargos de colegiatura, pagados o pendientes, después de cargar los cargos
        setEstudiantesConDeuda(estudiantesData.map((est: any) => ({
            id: est.id,
            codigo: est.codigo,
            nombre: est.nombre,
            apellido: est.apellido,
            tieneDeuda: true,
            tieneTransporte: false
        })));
        setEstudiantes(estudiantesData);
        const todosIds = estudiantesData.map((e: any) => e.id);
        setEstudiantesSeleccionados(todosIds);
        }
    } catch (error) {
        console.error("Error cargando estudiantes:", error);
        setError("Error al cargar los estudiantes");
        setTimeout(() => setError(""), 5000);
    }
    };

  const cargarCargos = async () => {
    if (!tutorId) return;
    setCargandoCargos(true);
    try {
      const res = await fetch(`/api/financiero/cargos-pendientes?tutorId=${tutorId}`);
      const data = await res.json();
      
      if (res.ok) {
        const cargosData = data.cargosPendientes || [];
        setCargos(cargosData);
        setBalanceTotal(data.balanceTotal || 0);
        await calcularResumen(cargosData);
      } else {
        console.error("Error en API de cargos:", data.error);
        setError(data.error || "Error al cargar los cargos");
      }
    } catch (error) {
      console.error("Error cargando cargos:", error);
      setError("Error al cargar los cargos");
    } finally {
      setCargandoCargos(false);
    }
  };

  const calcularResumen = async (cargosList: Cargo[]) => {
    // Colegiatura: contar cuotas pagadas (saldoPendiente === 0)
    const colegiaturaCargos = cargosList.filter(c => c.tipo === "COLEGIATURA");
    const colegiaturaPagadas = colegiaturaCargos.filter(c => c.saldoPendiente === 0).length;
    const colegiaturaTotal = colegiaturaCargos.length;
    
    // Transporte: contar cuotas pagadas (saldoPendiente === 0)
    const transporteCargos = cargosList.filter(c => c.tipo === "TRANSPORTE");
    const transportePagadas = transporteCargos.filter(c => c.saldoPendiente === 0).length;
    const transporteTotal = transporteCargos.length;
    
    // Próximas fechas de vencimiento (la más cercana con saldo pendiente)
    const colegiaturaPendientes = colegiaturaCargos
      .filter(c => c.saldoPendiente > 0)
      .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
    
    const transportePendientes = transporteCargos
      .filter(c => c.saldoPendiente > 0)
      .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
    
    setResumenCuotas({
      colegiaturaPagadas,
      colegiaturaTotal,
      transportePagadas,
      transporteTotal,
      colegiaturaProximaFecha: colegiaturaPendientes.length > 0 ? new Date(colegiaturaPendientes[0].fechaVencimiento) : null,
      transporteProximaFecha: transportePendientes.length > 0 ? new Date(transportePendientes[0].fechaVencimiento) : null,
    });
    
    console.log("Resumen actualizado:", {
      colegiatura: `${colegiaturaPagadas}/${colegiaturaTotal}`,
      transporte: `${transportePagadas}/${transporteTotal}`
    });
  };

  const aplicarFiltros = (cargosList?: Cargo[]) => {
    const listaCargos = cargosList || cargos;
    const { fechaHasta: fechaLimite } = ajustarFechasAPI(undefined, fechaHasta);
    
    let filtrados = listaCargos.filter(cargo => {
      if (!cargo) return false;
      const fechaVenc = new Date(cargo.fechaVencimiento);
      const cumpleFecha = fechaLimite ? fechaVenc <= fechaLimite : true;
      const cumpleEstudiante = estudiantesSeleccionados.length === 0 || (cargo.estudiante && estudiantesSeleccionados.includes(cargo.estudiante.id));
      return cumpleFecha && cumpleEstudiante;
    });

    if (conceptoCargo === "PAGO COLEGIATURA") {
      filtrados = filtrados.filter(c => c.tipo === "COLEGIATURA");
    } else if (conceptoCargo === "PAGO TRANSPORTE") {
      filtrados = filtrados.filter(c => c.tipo === "TRANSPORTE");
    }  else if (conceptoCargo === "PAGO INSCRIPCION") {
    filtrados = filtrados.filter(c => c.tipo === "INSCRIPCION" && c.saldoPendiente > 0);
    }

    setCargosFiltrados(filtrados);
    const balance = filtrados.reduce((sum, c) => sum + c.saldoPendiente, 0);
    setBalanceFiltrado(balance);
    setCargosSeleccionados({});
  };

  const handleEstudianteToggle = (estudianteId: number) => {
    setEstudiantesSeleccionados(prev => {
      const nuevos = prev.includes(estudianteId) 
        ? prev.filter(id => id !== estudianteId) 
        : [...prev, estudianteId];
      setTimeout(() => aplicarFiltros(), 0);
      return nuevos;
    });
  };

  const seleccionarTodosEstudiantes = () => {
    const todosIds = estudiantesConDeuda.map(e => e.id);
    const nuevosIds = estudiantesSeleccionados.length === todosIds.length ? [] : todosIds;
    setEstudiantesSeleccionados(nuevosIds);
    setTimeout(() => aplicarFiltros(), 0);
  };

  const limpiarFiltrosCargos = () => {
    setFechaHasta(formatFechaLocal(new Date()));
    setConceptoCargo("PAGO COLEGIATURA & TRANSPORTE");
    setEstudiantesSeleccionados(estudiantesConDeuda.map(e => e.id));
    setHaFiltrado(false);
    setCargosFiltrados([]);
    setCargosSeleccionados({});
    setBalanceFiltrado(0);
    setError("");
    setExito("Filtros limpiados");
    setTimeout(() => setExito(""), 3000);
  };

  const limpiarFormularioCargo = () => {
    setConceptoCargo("PAGO COLEGIATURA & TRANSPORTE");
    setFechaHasta(formatFechaLocal(new Date()));
    setCargosSeleccionados({});
    setHaFiltrado(false);
    setCargosFiltrados([]);
    setBalanceFiltrado(0);
  };

  const limpiarFormularioOtro = () => {
    setConceptoOtro("");
    setEstudianteSeleccionado(null);
    setDescripcionOtro("");
    setMontoOtro("");
    setError("");
  };

  const calcularTotalSeleccionado = () => {
    let subTotal = 0;
    let recargoTotal = 0;

    Object.entries(cargosSeleccionados).forEach(([id, valorCobrado]) => {
      const cargo = cargosFiltrados.find(c => c.id === parseInt(id));
      if (cargo && valorCobrado && valorCobrado > 0) {
        const saldoPendiente = cargo.saldoPendiente || 0;
        const recargo = cargo.recargo || 0;

        if (valorCobrado <= saldoPendiente) {
          subTotal += valorCobrado;
        } else {
          subTotal += saldoPendiente;
          const recargoAPagar = Math.min(recargo, valorCobrado - saldoPendiente);
          recargoTotal += recargoAPagar;
        }
      }
    });

    return { 
        subTotal: Math.round(subTotal * 100) / 100, 
        recargoTotal: Math.round(recargoTotal * 100) / 100 
    };
  };

  // Para el pago de cargos como saldo pendiente de inscripción, colegiatura y transporte
  const registrarPagoCargos = async () => {
    if (Object.keys(cargosSeleccionados).length === 0) {
      setError("Seleccione al menos un cargo para pagar");
      return;
    }

    let subTotal = 0, recargoTotal = 0;

    Object.entries(cargosSeleccionados).forEach(([id, valorCobrado]) => {
      const cargo = cargosFiltrados.find(c => c.id === parseInt(id));
      if (cargo && valorCobrado && valorCobrado > 0) {
        const saldoPendiente = cargo.saldoPendiente || 0;
        const recargo = cargo.recargo || 0;

        if (valorCobrado <= saldoPendiente) {
          subTotal += valorCobrado;
        } else {
          subTotal += saldoPendiente;
          recargoTotal += Math.min(recargo, valorCobrado - saldoPendiente);
        }
      }
    });

    subTotal = Math.round(subTotal * 100) / 100;
    recargoTotal = Math.round(recargoTotal * 100) / 100;
    const total = subTotal + recargoTotal;

    // 🔍 LOG: Datos que se enviarán
    console.log("=== [Pago en Línea] registrarPagoCargos ===");
    console.log("tutorId:", tutorId);
    console.log("total:", total);
    console.log("concepto:", conceptoCargo);
    console.log("origen a enviar:", "EN_LINEA");
    console.log("==========================================");

    const pagos = Object.entries(cargosSeleccionados).map(([id, valor]) => ({
      cargoId: parseInt(id),
      montoPagado: valor,
    }));

    setCargando(true);
    setError("");

  try {
    const payload = {
      tutorId,
      pagos: Object.entries(cargosSeleccionados).map(([id, valor]) => ({
        cargoId: parseInt(id),
        montoPagado: valor,
      })),
      metodoPago: "TARJETA",
      subTotal,
      recargoTotal,
      descuento: 0,
      total,
      concepto: conceptoCargo,
      origen: "EN_LINEA",
    };
    
    console.log("Payload completo:", JSON.stringify(payload, null, 2));
    
    const res = await fetch("/api/financiero/registrar-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

      console.log("Respuesta del servidor:", data);

      if (!res.ok) throw new Error(data.error);

      setExito(`${data.mensaje} - Recibo: ${data.reciboNo}`);

      // Esperar a que el recibo se guarde completamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recargar cargos y recalcular resumen
      await cargarCargos();

      setReciboParaImprimir({
        reciboNo: data.reciboNo,
        fecha: new Date(),
        total,
        metodoPago: "TARJETA",
        concepto: conceptoCargo,
        realizadoPor: session?.user?.name,
      });

      limpiarFormularioCargo();
      await cargarCargos();
      await cargarRecibos();
      setTimeout(() => handleImprimir(), 500);
      setTimeout(() => setExito(""), 5000);
    } catch (error) {
      setError("Error al registrar el pago");
    } finally {
      setCargando(false);
    }
  };

  // Para Otros Conceptos como derecho a graduación y excursión escolar
  const registrarPagoOtro = async () => {
    const conceptosPermitidosEnLinea = ["DERECHO A GRADUACIÓN", "EXCURSIÓN ESCOLAR"];
  if (!conceptosPermitidosEnLinea.includes(conceptoOtro)) {
    setError("Este concepto no está disponible para pago en línea");
    return;
  }

    const alPortador = estudianteSeleccionado 
      ? `${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellido}`
      : "PAGO EN LÍNEA";

    const payload: any = {
      fecha: formatFechaLocal(new Date()),
      concepto: conceptoOtro,
      alPortador,
      monto: parseFloat(montoOtro),
      metodoPago: "TARJETA",
      descripcion: descripcionOtro || "",
      estudianteId: estudianteSeleccionado?.id,
      origen: "EN_LINEA",
    };

    setCargandoOtro(true);
    setError("");

    try {
      const res = await fetch("/api/financiero/registro-otro-ingreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrar el pago");
        setTimeout(() => setError(""), 8000);
        return;
    }

      setExito(`${data.mensaje} - Recibo: ${data.reciboNo}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      setReciboParaImprimir({
        reciboNo: data.reciboNo,
        fecha: new Date(),
        total: parseFloat(montoOtro),
        metodoPago: "TARJETA",
        concepto: conceptoOtro,
        realizadoPor: session?.user?.name,
      });

      limpiarFormularioOtro();
      await cargarRecibos();
      setTimeout(() => handleImprimir(), 500);
      setTimeout(() => setExito(""), 5000);
    } catch (error) {
      setError("Error al registrar el pago");
      setTimeout(() => setError(""), 5000);
    } finally {
      setCargandoOtro(false);
    }
  };

  const cargarRecibos = async () => {
    if (!tutorId) return;
    setCargandoRecibos(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesdeRecibo) params.append("fechaDesde", fechaDesdeRecibo);
      if (fechaHastaRecibo) params.append("fechaHasta", fechaHastaRecibo);
      if (conceptoFiltro !== "TODOS") params.append("concepto", conceptoFiltro);
      params.append("tutorId", tutorId.toString());

      // 🔍 LOG: Parámetros que envía el frontend
    console.log("=== [Pago en Línea] cargarRecibos ===");
    console.log("tutorId:", tutorId);
    console.log("fechaDesde:", fechaDesdeRecibo);
    console.log("fechaHasta:", fechaHastaRecibo);
    console.log("conceptoFiltro:", conceptoFiltro);
    console.log("URL completa:", `/api/financiero/recibos-otros-ingresos?${params.toString()}`);
    console.log("=====================================");

      const res = await fetch(`/api/financiero/recibos-otros-ingresos?${params.toString()}`);
      const data = await res.json();

      // 🔍 LOG: Respuesta recibida
    console.log("=== [Pago en Línea] Respuesta recibida ===");
    console.log("Cantidad de recibos:", data.recibos?.length || 0);
    if (data.recibos && data.recibos.length > 0) {
      data.recibos.forEach((r: any) => {
        console.log(`- ${r.reciboNo} | ${r.concepto} | total: ${r.total}`);
      });
    }
    console.log("=========================================");

      setRecibos(data.recibos || []);
    } catch (error) {
      console.error("Error cargando recibos:", error);
      setError("Error al cargar los recibos");
    } finally {
      setCargandoRecibos(false);
    }
  };

  const handleBuscarRecibos = () => {
    setHaBuscado(true);
    cargarRecibos();
  };

  const limpiarFiltrosRecibos = () => {
    setFechaDesdeRecibo("");
    setFechaHastaRecibo("");
    setConceptoFiltro("TODOS");
    setRecibos([]);
    setCargosSeleccionados({});
    setHaBuscado(false);
    setHaFiltrado(false);
  };

  const verDetalleRecibo = (recibo: Recibo) => {
    setReciboSeleccionado(recibo);
    setMostrarModalDetalle(true);
  };

  const handleImprimirRecibo = (recibo: Recibo) => {
    setReciboParaImprimir({
      reciboNo: recibo.reciboNo,
      fecha: new Date(recibo.fecha),
      total: recibo.total,
      metodoPago: recibo.metodoPago,
      concepto: recibo.concepto,
      realizadoPor: recibo.realizadoPor,
      alPortador: recibo.alPortador || "Pago en Línea",
      descripcion: recibo.descripcion || "",
    });
    setTimeout(() => handleImprimir(), 100);
  };

  const { subTotal, recargoTotal } = calcularTotalSeleccionado();
  const totalSeleccionado = subTotal + recargoTotal;
  const tieneEstudiantesSeleccionados = estudiantesSeleccionados.length > 0;

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "TUTOR") return null;

  return (
    <main style={s.main}>
      <NavBar titulo="Pago en Línea" icono="💳" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Pago en Línea</h1>
            <p style={s.subtitulo}>Realice pagos de colegiatura, transporte y otros conceptos desde aquí</p>
          </div>
          <div style={{ ...s.estadoBadge, ...(mensajeEstado.tieneDeuda ? s.estadoPendiente : s.estadoAlDia) }}>
            {mensajeEstado.texto}
          </div>
        </div>

        <div style={s.resumenGrid}>
            <div style={s.resCard}>
                <span style={s.resValor}>RD${balanceTotal.toFixed(2)}</span>
                <span style={s.resLabel}>Balance pendiente</span>
            </div>
            <div style={s.resCard}>
                <span style={s.resValor}>RD${totalPagado.toFixed(2)}</span>
                <span style={s.resLabel}>Total pagado</span>
            </div>
            <div style={{ 
                ...s.resCard, 
                ...(cargos.filter(c => c.tipo === "COLEGIATURA").length === 0 ? s.resCardDisabled : {})
                }}>
                <span style={s.resValor}>
                    {cargos.filter(c => c.tipo === "COLEGIATURA").length === 0 ? "—" : `${resumenCuotas.colegiaturaPagadas}/${resumenCuotas.colegiaturaTotal}`}
                </span>
                <span style={s.resLabel}>Cuotas colegiatura</span>
                {cargos.filter(c => c.tipo === "COLEGIATURA").length === 0 && (
                    <span style={s.resSubLabel}>Sin cargos de colegiatura</span>
                )}
                {resumenCuotas.colegiaturaProximaFecha && (
                    <span style={s.resSubLabel}>Próx. vence: {formatFechaLarga(resumenCuotas.colegiaturaProximaFecha)}</span>
                )}
                </div>
                <div style={{ 
                ...s.resCard, 
                ...(cargos.filter(c => c.tipo === "TRANSPORTE").length === 0 ? s.resCardDisabled : {})
                }}>
                <span style={s.resValor}>
                    {cargos.filter(c => c.tipo === "TRANSPORTE").length === 0 ? "—" : `${resumenCuotas.transportePagadas}/${resumenCuotas.transporteTotal}`}
                </span>
                <span style={s.resLabel}>Cuotas transporte</span>
                {cargos.filter(c => c.tipo === "TRANSPORTE").length === 0 && (
                    <span style={s.resSubLabel}>Sin cargos de transporte</span>
                )}
                {resumenCuotas.transporteProximaFecha && (
                    <span style={s.resSubLabel}>Próx. vence: {formatFechaLarga(resumenCuotas.transporteProximaFecha)}</span>
                )}
                </div>
            </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.tabs}>
          <button onClick={() => setTab("cargos")} style={{ ...s.tab, ...(tab === "cargos" ? s.tabActivo : {}) }}>
            📚 Colegiatura / Transporte
          </button>
          <button onClick={() => setTab("otros")} style={{ ...s.tab, ...(tab === "otros" ? s.tabActivo : {}) }}>
            🎓 Otros Conceptos
          </button>
          <button onClick={() => setTab("recibos")} style={{ ...s.tab, ...(tab === "recibos" ? s.tabActivo : {}) }}>
            📋 Mis Recibos ({recibos.length})
          </button>
        </div>

        {/* Pestaña de Cargos */}
        {tab === "cargos" && (
        <div style={s.card}>
            <div style={s.filtrosRow}>
            <div style={s.conceptoSelect}>
                <label style={s.label}>Concepto:</label>
                <select value={conceptoCargo} onChange={(e) => setConceptoCargo(e.target.value)} style={s.select}>
                <option value="PAGO COLEGIATURA & TRANSPORTE">Todos</option>
                <option value="PAGO COLEGIATURA">Colegiatura</option>
                <option value="PAGO TRANSPORTE">Transporte</option>
                <option value="PAGO INSCRIPCION">Inscripción</option>
                </select>
            </div>
            <div>
                <label style={s.label}>Mostrar cargos hasta:</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={s.inputFecha} />
            </div>
            <button onClick={() => { setHaFiltrado(true); aplicarFiltros(); }} style={s.btnFiltrar}>🔍 Filtrar</button>
            <button onClick={() => { setHaFiltrado(false); limpiarFiltrosCargos(); }} style={s.btnLimpiar}>🧹 Limpiar</button>
            </div>

            <div style={s.dropdownContainer} ref={dropdownEstudiantesRef}>
            <label style={s.label}>Estudiantes:</label>
            <div style={s.dropdownHeader} onClick={() => setMostrarDropdownEstudiantes(!mostrarDropdownEstudiantes)}>
                <span style={!tieneEstudiantesSeleccionados ? s.textoPlaceholder : {}}>
                {tieneEstudiantesSeleccionados ? `${estudiantesSeleccionados.length} estudiante(s) seleccionado(s)` : "-- Seleccionar estudiantes --"}
                </span>
                <span style={s.dropdownArrow}>{mostrarDropdownEstudiantes ? "▲" : "▼"}</span>
            </div>
            {mostrarDropdownEstudiantes && estudiantesConDeuda.length > 0 && (
                <div style={s.dropdownContent}>
                <label style={s.checkboxLabel}>
                    <input type="checkbox" checked={estudiantesSeleccionados.length === estudiantesConDeuda.length && estudiantesConDeuda.length > 0} onChange={seleccionarTodosEstudiantes} />
                    <strong>Todos los estudiantes</strong>
                </label>
                {estudiantesConDeuda.map((est) => (
                    <label key={est.id} style={s.checkboxLabel}>
                    <input 
                        type="checkbox" 
                        checked={estudiantesSeleccionados.includes(est.id)} 
                        onChange={() => handleEstudianteToggle(est.id)} 
                    />
                    {est.nombre} {est.apellido} ({est.codigo})
                    {est.tieneTransporte && <span style={s.badgeTransporte}>🚌</span>}
                    </label>
                ))}
                </div>
            )}
            {mostrarDropdownEstudiantes && estudiantesConDeuda.length === 0 && (
                <div style={s.dropdownContent}>
                <div style={{ padding: "8px", color: "#888", textAlign: "center" }}>No hay estudiantes con deuda</div>
                </div>
            )}
            </div>

            <div style={s.balanceInfo}>
            <span>Balance filtrado: <strong>RD${balanceFiltrado.toFixed(2)}</strong></span>
            </div>

            {/* Estado cuando no se ha filtrado */}
            {!haFiltrado && (
            <div style={s.vacio}>🔍 Seleccione los filtros y haga clic en "Filtrar" para ver los cargos</div>
            )}

            {/* Estado de carga */}
            {haFiltrado && cargandoCargos && (
            <div style={s.vacio}>Cargando cargos...</div>
            )}

            {/* Estado sin resultados */}
            {haFiltrado && !cargandoCargos && cargosFiltrados.length === 0 && (
            <div style={s.vacio}>No hay cargos pendientes con los filtros seleccionados</div>
            )}

            {/* Tabla de resultados */}
            {haFiltrado && !cargandoCargos && cargosFiltrados.length > 0 && (
            <>
                <div style={s.tablaWrap}>
                <table style={s.tabla}>
                    <thead>
                    <tr style={s.thead}>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Cargo No.</th>
                        <th style={s.th}>Fecha Venc.</th>
                        <th style={s.th}>Saldo</th>
                        <th style={s.th}>Recargo</th>
                        <th style={s.th}>Valor a pagar</th>
                        <th style={s.th}>Seleccionar</th>
                    </tr>
                    </thead>
                    <tbody>
                    {cargosFiltrados.map((cargo) => {
                        const valorActual = cargosSeleccionados[cargo.id] || 0;
                        const montoTotalCargo = cargo.saldoPendiente + cargo.recargo;
                        return (
                        <tr key={cargo.id}>
                            <td style={s.td}>{cargo.estudiante?.nombre} {cargo.estudiante?.apellido}<br/><small style={s.codigo}>{cargo.estudiante?.codigo}</small></td>
                            <td style={s.td}>{cargo.cargoNo}</td>
                            <td style={s.td}>{new Date(cargo.fechaVencimiento).toLocaleDateString("es-DO")}</td>
                            <td style={s.tdNum}>RD${(cargo.saldoPendiente || 0).toFixed(2)}</td>
                            <td style={s.tdNum}>RD${(cargo.recargo || 0).toFixed(2)}</td>
                            <td style={s.td}>
                            <input
                                type="number"
                                step="0.01"
                                value={valorActual || ""}
                                onChange={(e) => {
                                const valor = parseFloat(e.target.value);
                                const nuevoValor = isNaN(valor) ? 0 : Math.round(valor * 100) / 100;
                                const nuevosSeleccionados = redistribuirExcedente(
                                    cargo.id,
                                    nuevoValor,
                                    cargosFiltrados,
                                    cargosSeleccionados
                                );
                                setCargosSeleccionados(nuevosSeleccionados);
                                }}
                                style={s.inputValor}
                                placeholder="0.00"
                            />
                            </td>
                            <td style={s.td}>
                            <input
                                type="checkbox"
                                checked={valorActual > 0}
                                onChange={() => {
                                if (valorActual > 0) {
                                    const { [cargo.id]: _, ...rest } = cargosSeleccionados;
                                    setCargosSeleccionados(rest);
                                } else {
                                    setCargosSeleccionados(prev => ({ ...prev, [cargo.id]: montoTotalCargo }));
                                }
                                }}
                                style={s.checkbox}
                            />
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
                <div style={s.totalesContainer}>
                <div><strong>Sub-Total:</strong> RD${subTotal.toFixed(2)}</div>
                <div><strong>Recargo:</strong> RD${recargoTotal.toFixed(2)}</div>
                <div style={s.totalBox}><strong>Total a pagar:</strong> RD${totalSeleccionado.toFixed(2)}</div>
                </div>

                <div style={s.metodoCard}>
                <div style={s.metodoInfo}>
                    <span>💳 Método de pago: Tarjeta de Crédito/Débito</span>
                </div>
                <div style={s.buttonGroup}>
                    <button onClick={registrarPagoCargos} disabled={cargando} style={s.btnGuardar}>
                    {cargando ? "Procesando..." : "Pagar ahora"}
                    </button>
                </div>
                </div>
            </>
            )}
        </div>
        )}

    {/* Pestaña de Otros Conceptos */}
    {tab === "otros" && (
        <div style={s.card}>
        <div style={s.formGroup}>
            <label style={s.label}>Concepto *</label>
            <select value={conceptoOtro} onChange={(e) => setConceptoOtro(e.target.value)} style={s.select}>
            <option value="">-- Seleccione un concepto --</option>
            <option value="EXCURSIÓN ESCOLAR">🚌 Excursión Escolar</option>
            <option value="DERECHO A GRADUACIÓN">🎓 Derecho a Graduación</option>
            </select>
        </div>

        {(conceptoOtro === "EXCURSIÓN ESCOLAR" || conceptoOtro === "DERECHO A GRADUACIÓN") && (
            <div style={s.formGroup}>
            <label style={s.label}>Estudiante *</label>
            <select value={estudianteSeleccionado?.id || ""} onChange={(e) => {
                const estudiante = estudiantes.find(est => est.id === parseInt(e.target.value));
                setEstudianteSeleccionado(estudiante || null);
            }} style={s.select}>
                <option value="">-- Seleccione un estudiante --</option>
                {estudiantes.map(est => (
                <option key={est.id} value={est.id}>{est.nombre} {est.apellido} ({est.codigo})</option>
                ))}
            </select>
            </div>
        )}

        <div style={s.formGroup}>
            <label style={s.label}>Descripción</label>
            <textarea value={descripcionOtro} onChange={(e) => setDescripcionOtro(e.target.value)} style={s.textarea} rows={2} placeholder="Descripción del pago..." />
        </div>

        <div style={s.formGroup}>
            <label style={s.label}>Monto (RD$) *</label>
            <input type="number" step="0.01" value={montoOtro} onChange={(e) => setMontoOtro(e.target.value)} style={s.input} placeholder="0.00" />
        </div>

        <div style={s.metodoInfo}>
            <span>💳 Método de pago: Tarjeta de Crédito/Débito</span>
        </div>

        <div style={s.buttonGroup}>
            <button onClick={limpiarFormularioOtro} style={s.btnSecundario}>🧹 Limpiar</button>
            <button onClick={registrarPagoOtro} disabled={cargandoOtro} style={s.btnGuardar}>
            {cargandoOtro ? "Procesando..." : "Pagar ahora"}
            </button>
        </div>
        </div>
    )}

        {/* Pestaña de Listado de Recibos */}
        {tab === "recibos" && (
          <div style={s.recibosContainer}>
            <div style={s.filtrosGrid}>
              <div>
                <label style={s.label}>Fecha desde</label>
                <input type="date" value={fechaDesdeRecibo} onChange={(e) => setFechaDesdeRecibo(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Fecha hasta</label>
                <input type="date" value={fechaHastaRecibo} onChange={(e) => setFechaHastaRecibo(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Concepto</label>
                <select value={conceptoFiltro} onChange={(e) => setConceptoFiltro(e.target.value)} style={s.input}>
                  <option value="TODOS">Todos</option>
                  <option value="DERECHO A GRADUACIÓN">Derecho a Graduación</option>
                  <option value="EXCURSIÓN ESCOLAR">Excursión Escolar</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button onClick={handleBuscarRecibos} style={s.btnFiltrar}>🔍 Filtrar</button>
                <button onClick={limpiarFiltrosRecibos} style={s.btnLimpiar}>🧹 Limpiar</button>
              </div>
            </div>

            {!haBuscado && (
              <div style={s.vacio}>🔍 Haga clic en "Filtrar" para ver sus recibos</div>
            )}

            {haBuscado && cargandoRecibos && (
              <div style={s.vacio}>Cargando recibos...</div>
            )}

            {haBuscado && !cargandoRecibos && recibos.length === 0 && (
              <div style={s.vacio}>No hay recibos con los filtros seleccionados</div>
            )}

            {haBuscado && !cargandoRecibos && recibos.length > 0 && (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Recibo No.</th>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Concepto</th>
                      <th style={s.th}>Monto</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibos.map((recibo) => (
                      <tr key={recibo.id} style={recibo.anulado ? { backgroundColor: "#fff5f5" } : {}}>
                        <td style={s.td}>{recibo.reciboNo}</td>
                        <td style={s.td}>{formatFechaLarga(recibo.fecha)}</td>
                        <td style={s.td}>{recibo.concepto}</td>
                        <td style={s.tdNum}>RD${recibo.total.toFixed(2)}</td>
                        <td style={s.td}>
                          {recibo.anulado ? <span style={s.badgeAnulado}>ANULADO</span> : <span style={s.badgeActivo}>ACTIVO</span>}
                        </td>
                        <td style={s.td}>
                          <button onClick={() => verDetalleRecibo(recibo)} style={s.btnVer}>👁️ Ver</button>
                          <button onClick={() => handleImprimirRecibo(recibo)} style={s.btnImprimir}>🖨️ Imprimir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>

        <ModalDetalleRecibo
          isOpen={mostrarModalDetalle}
          onClose={() => setMostrarModalDetalle(false)}
          onPrint={() => reciboSeleccionado &&  handleImprimirRecibo(reciboSeleccionado)}
          recibo={reciboSeleccionado}
        />

        {/* Componente oculto para imprimir */}
        <div style={{ display: "none" }}>
          {reciboParaImprimir && (
            <ImprimirContenido
              ref={componentRef}
              titulo="Recibo de Pago"
              datos={reciboParaImprimir}
              tipo="recibo-otros"
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
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px", boxSizing: "border-box" as const, wordBreak: "break-word" as const },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  estadoBadge: { padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  estadoAlDia: { borderLeft: "4px solid #276749", color: "#276749" },
  estadoPendiente: { borderLeft: "4px solid #e53e3e", color: "#e53e3e" },
  resumenGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)", gap: "12px", marginBottom: "20px" },
  resCard: { background: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderLeft: "4px solid #2C1810", display: "flex", flexDirection: "column" as const, gap: "4px", wordBreak: "break-word" as const },
  resValor: { fontSize: "18px", fontWeight: "bold", color: "#2C1810" },
  resLabel: { fontSize: "10px", color: "#666" },
  resSubLabel: { fontSize: "9px", color: "#888" },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { background: "#fff", color: "#666", border: "1px solid #ddd", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  tabActivo: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" },
  card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  resCardDisabled: { background: "#f5f5f5", borderLeft: "4px solid #ccc", opacity: 0.7 },
  filtrosRow: { display: "flex", gap: "16px", flexWrap: "wrap" as const, marginBottom: "16px", alignItems: "flex-end" },
  conceptoSelect: { flex: 2, minWidth: "180px", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  inputFecha: { padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  btnSecundario: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", marginRight: "12px" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  balanceInfo: { background: "#f0f4f8", padding: "8px 12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", textAlign: "right" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  textarea: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", fontFamily: "inherit" },
  formGroup: { marginBottom: "20px" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)",width: "100%", maxWidth: "100%", overflow: "auto" as const },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed", minWidth: "700px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" },
  tdNum: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", textAlign: "center", verticalAlign: "middle" },
  codigo: { fontSize: "10px", color: "#888" },
  inputValor: { width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "right" as const, marginRight: "10px", boxSizing: "border-box" as const },
  checkbox: { width: "20px", height: "20px", cursor: "pointer", marginLeft: "10px" },
  totalesContainer: { textAlign: "right", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee" },
  totalBox: { fontSize: "16px", fontWeight: "bold", marginTop: "8px", color: "#2C1810" },
  metodoCard: { background: "#fff", borderRadius: "12px", padding: "16px", marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  metodoInfo: { background: "#f0f4f8", borderRadius: "8px", padding: "10px 16px", marginTop: "16px", fontSize: "13px", color: "#333" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", padding: "4px" },
  buttonGroup: { display: "flex", justifyContent: "flex-end", marginTop: "16px", flexWrap: "wrap" as const, gap: "12px" },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  recibosContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "50px", marginBottom: "20px", alignItems: "flex-end" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAnulado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", textDecoration: "line-through" },
  badgeTransporte: { fontSize: "10px", marginLeft: "4px" },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" },
  dropdownContainer: { position: "relative" as const, width: "100%", marginBottom: "16px" },
  dropdownHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "7px", cursor: "pointer", backgroundColor: "#fff", fontSize: "13px" },
  dropdownArrow: { fontSize: "12px", color: "#666" },
  dropdownContent: { position: "absolute" as const, top: "100%", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "7px", marginTop: "4px", padding: "10px", zIndex: 1000, maxHeight: "200px", overflowY: "auto" as const, boxShadow: "0 4px 8px rgba(0,0,0,0.1)", boxSizing: "border-box" },
  textoPlaceholder: { color: "#999", fontStyle: "italic" },
};