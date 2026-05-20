"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatFechaLocal } from "@/lib/formatear-fecha";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";
import AsyncSelect from "react-select/async";
import { ModalDetalleReciboCargos } from "../../../../components/Modales/ModalDetalleReciboCargos";
import { ModalContrasenaRol } from "../../../../components/Modales/ModalContraseñaRol";
import { redistribuirExcedente } from "@/lib/redistribuir-excedente";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "@/components/ImprimirContenido";
import NavBar from "@/components/NavBar";

type Tab = "cobro" | "recibos";

type Tutor = {
  id: number;
  cuentaNo: string;
  nombre: string;
  apellido: string;
  direccion?: string;
  celular?: string;
};

type Cargo = {
  id: number;
  tipo: string;
  cargoNo: string;
  fechaVencimiento: string;
  monto: number;
  recargo: number;
  montoTotal: number;
  saldoPendiente: number;
  estudiante?: { nombre: string; apellido: string; codigo: string };
  valorCobrado?: number;
};

type Recibo = {
  id: number;
  reciboNo: string;
  fecha: string;
  hora: string;
  metodoPago: string;
  subTotal: number;
  recargoTotal: number;
  total: number;
  realizadoPor: string;
  anulado: boolean;
  anuladoPor?: string;
  anuladoEn?: string;
  motivoAnulacion?: string;
  tutor: {
    nombre: string;
    apellido: string;
    cuentaNo: string;
  };
  pagos: Array<{
    montoPagado: number;
    cargo: {
      cargoNo: string;
      tipo: string;
      descripcion?: string;
      monto?: number;
      recargo?: number; 
    };
  }>;
};

export default function CobroCargosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [tab, setTab] = useState<Tab>("cobro");

  // Estados para cobro de cargos
  const [tutorSeleccionado, setTutorSeleccionado] = useState<Tutor | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [balanceTotal, setBalanceTotal] = useState(0);
  const [balanceFiltrado, setBalanceFiltrado] = useState(0);
  const [cargosSeleccionados, setCargosSeleccionados] = useState<Record<number, number>>({});
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE" | "">("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cobroNo, setCobroNo] = useState("");
  const [concepto, setConcepto] = useState("TODOS");
  const [fechaHasta, setFechaHasta] = useState(formatFechaLocal(new Date()));
  const [cargosFiltrados, setCargosFiltrados] = useState<Cargo[]>([]);

  // Estados para Listado de Recibos
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [cargandoRecibos, setCargandoRecibos] = useState(false);
  const [fechaDesdeRecibo, setFechaDesdeRecibo] = useState("");
  const [fechaHastaRecibo, setFechaHastaRecibo] = useState("");
  const [tutorFiltro, setTutorFiltro] = useState("");
  const [mostrarModalContrasena, setMostrarModalContrasena] = useState(false);
  const [reciboParaImprimir, setReciboParaImprimir] = useState<any>(null);
  const [reciboParaAnular, setReciboParaAnular] = useState<Recibo | null>(null);
  const { componentRef, handleImprimir } = useImprimir();
  const [reciboSeleccionado, setReciboSeleccionado] = useState<Recibo | null>(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [tutorSeleccionadoFiltro, setTutorSeleccionadoFiltro] = useState<any>(null);

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    concepto: "TODOS",
    fechaHasta: formatFechaLocal(new Date())
  });

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    cargarTutores();
    generarCobroNo();
  }, []);

  useEffect(() => {
    if (cargos.length > 0) {
      filtrarCargosPorFecha(cargos, filtrosAplicados.fechaHasta, filtrosAplicados.concepto);
    }
  }, [filtrosAplicados, cargos]);

  // Funciones para cobro de cargos
  const generarCobroNo = async () => {
    try {
      const res = await fetch("/api/financiero/ultimo-recibo");
      const data = await res.json();
      setCobroNo(data.reciboNo || "RI-0000000001");
    } catch (error) {
      console.error("Error generando cobroNo:", error);
      setCobroNo("RI-0000000001");
    }
  };

  const cargarTutores = async () => {
    try {
      const res = await fetch("/api/usuarios/tutores");
      const data = await res.json();
    } catch (error) {
      console.error("Error cargando tutores:", error);
    }
  };

  const cargarCargos = async (tutorId: number) => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/financiero/cargos-pendientes?tutorId=${tutorId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setTutorSeleccionado(data.tutor);
      setCargos(data.cargosPendientes || []);
      setBalanceTotal(data.balanceTotal);
      setCargosSeleccionados({});

      const fechaLocal = formatFechaLocal(new Date());
      setFechaHasta(fechaLocal);
      setConcepto("TODOS");
      setFiltrosAplicados({
        concepto: "TODOS",
        fechaHasta: fechaLocal
      });
    } catch (error) {
      setError("Error al cargar los cargos del tutor");
    } finally {
      setCargando(false);
    }
  };

  const filtrarCargosPorFecha = (cargosList: Cargo[], fecha: string, conceptoFiltro: string) => {
    if (!fecha || !cargosList.length) {
      let filtrados = [...cargosList];
      
      if (conceptoFiltro === "PAGO COLEGIATURA") {
        filtrados = filtrados.filter(c => c.tipo === "COLEGIATURA");
      } else if (conceptoFiltro === "PAGO TRANSPORTE") {
        filtrados = filtrados.filter(c => c.tipo === "TRANSPORTE");
      } else if (conceptoFiltro === "PAGO INSCRIPCION") {
        filtrados = filtrados.filter(c => c.tipo === "INSCRIPCION" && c.saldoPendiente > 0);
      } else if (conceptoFiltro === "PAGO COLEGIATURA & TRANSPORTE") {
        filtrados = filtrados.filter(c => c.tipo === "COLEGIATURA" || c.tipo === "TRANSPORTE");
      }
      
      setCargosFiltrados(filtrados);
      const balance = filtrados.reduce((sum: number, c: Cargo) => sum + (c.monto + c.recargo), 0);
      setBalanceFiltrado(balance);
      setCargosSeleccionados({});
      return;
    }

    const { fechaHasta: fechaLimite } = ajustarFechasAPI(undefined, fecha);
    
    let filtrados = cargosList.filter(cargo => {
      if (!cargo) return false;
      const fechaVenc = new Date(cargo.fechaVencimiento);
      return fechaLimite ? fechaVenc <= fechaLimite : true;
    });

    if (conceptoFiltro === "PAGO COLEGIATURA") {
      filtrados = filtrados.filter(c => c.tipo === "COLEGIATURA");
    } else if (conceptoFiltro === "PAGO TRANSPORTE") {
      filtrados = filtrados.filter(c => c.tipo === "TRANSPORTE");
    } else if (conceptoFiltro === "PAGO INSCRIPCION") {
      filtrados = filtrados.filter(c => c.tipo === "INSCRIPCION" && c.saldoPendiente > 0);
    } else if (conceptoFiltro === "PAGO COLEGIATURA & TRANSPORTE") {
      filtrados = filtrados.filter(c => c.tipo === "COLEGIATURA" || c.tipo === "TRANSPORTE");
    }

    setCargosFiltrados(filtrados);
    const balance = filtrados.reduce((sum: number, c: Cargo) => sum + (c.saldoPendiente + (c.recargo || 0)), 0);
    setBalanceFiltrado(balance);
    setCargosSeleccionados({});
  };

  const handleFechaHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = e.target.value;
    setFechaHasta(nuevaFecha);
  };

  const cargarTutoresParaFiltro = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) {
      return [];
    }

    try {
      const response = await fetch(`/api/usuarios/tutores/buscar?q=${encodeURIComponent(inputValue)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      return data.map((tutor: any) => ({
        value: tutor.id,
        label: `${tutor.cuentaNo} - ${tutor.nombre} ${tutor.apellido}`,
        tutor: tutor,
        sublabel: `${tutor.email || ""} | ${tutor.celular || ""}`
      }));
    } catch (error) {
      console.error("Error cargando tutores:", error);
      return [];
    }
  };

  const formatoOptionTutor = (data: any) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{data.label}</span>
      <span style={{ fontSize: "11px", color: "#666" }}>{data.sublabel}</span>
    </div>
  );

  const aplicarFiltros = () => {
    setFiltrosAplicados({
      concepto: concepto,
      fechaHasta: fechaHasta
    });
  };

  const limpiarFiltros = () => {
    const hoy = formatFechaLocal(new Date());
    setFechaHasta(hoy);
    setConcepto("TODOS");
    setCargosSeleccionados({});
    
    setFiltrosAplicados({
      concepto: "TODOS",
      fechaHasta: hoy
    });
    
    setMetodoPago("");
    setExito("Filtros limpiados");
    setTimeout(() => setExito(""), 2000);
  };

  const toggleCargo = (cargo: Cargo) => {
    setCargosSeleccionados(prev => {
      const nuevo = { ...prev };
      if (nuevo[cargo.id]) {
        delete nuevo[cargo.id];
      } else {
        // El valor total a pagar es monto + recargo
        nuevo[cargo.id] = (cargo.monto || 0) + (cargo.recargo || 0);
      }
      return nuevo;
    });
  };

  const obtenerEstadoCuota = (cargo: Cargo, valorCobrado: number | undefined): string => {
    const montoOriginal = cargo.monto || 0;
    const recargo = cargo.recargo || 0;
    const totalDeuda = montoOriginal + recargo;
    const valor = valorCobrado || 0;
    
    if (!valor || valorCobrado === 0) {
      return "NO AFECTA";
    }
    else if (valor < totalDeuda) {
      return "ABONO";
    }
    else if (valor === totalDeuda) {
      return "SALDO";
    }
    // Si es mayor (esto debería manejarse con la redistribución)
    return "ABONO";
  };

  const actualizarValorCobrado = (cargoId: number, valor: number) => {
    const valorLimitado = Math.min(valor, 1000000);
    const nuevosSeleccionados = redistribuirExcedente(
      cargoId,
      valorLimitado,
      cargosFiltrados,
      cargosSeleccionados
    );
    setCargosSeleccionados(nuevosSeleccionados);
  };

  const calcularTotales = () => {
    let subTotal = 0;
    let recargoTotal = 0;
    
    Object.entries(cargosSeleccionados).forEach(([id, valorCobrado]) => {
      const cargo = cargosFiltrados.find(c => c.id === parseInt(id));
      if (cargo && valorCobrado && valorCobrado > 0) {
        const montoOriginal = cargo.monto || 0;
        const recargo = cargo.recargo || 0;
                
        // Primero se paga el monto original, luego el recargo
        let pagoMonto = 0;
        let pagoRecargo = 0;
        
        if (valorCobrado <= montoOriginal) {
          // El pago no alcanza ni para cubrir el saldo pendiente
          pagoMonto = valorCobrado;
          pagoRecargo = 0;
        } else {
          // Primero cubre el saldo pendiente, el resto va al recargo
          pagoMonto = montoOriginal;
          pagoRecargo = Math.min(recargo, valorCobrado - montoOriginal);
        }
        
        subTotal += pagoMonto;
        recargoTotal += pagoRecargo;
      }
    });
    
    subTotal = Math.round(subTotal * 100) / 100;
    recargoTotal = Math.round(recargoTotal * 100) / 100;
    const total = Math.round((subTotal + recargoTotal) * 100) / 100;
    
    return { subTotal, recargoTotal, total };
  };

  const registrarPagoPresencial = async () => {
    if (Object.keys(cargosSeleccionados).length === 0) {
      setError("Seleccione al menos un cargo para pagar");
      return;
    }
    if (!metodoPago) {
      setError("Seleccione un método de pago");
      return;
    }

    const { subTotal, recargoTotal, total } = calcularTotales();
    
    const pagos = Object.entries(cargosSeleccionados).map(([id, valor]) => ({
      cargoId: parseInt(id),
      montoPagado: valor,
    }));

    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/financiero/registrar-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutorSeleccionado?.id,
          pagos,
          metodoPago,
          subTotal,
          recargoTotal,
          descuento: 0,
          total,
          concepto,
          origen: "PRESENCIAL",
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setExito(`${data.mensaje} - Recibo: ${data.reciboNo}`);
      
      const nuevoRecibo = {
        id: 0,
        reciboNo: data.reciboNo,
        fecha: new Date().toISOString(),
        hora: new Date().toLocaleTimeString("es-DO"),
        subTotal,
        recargoTotal,
        total,
        metodoPago,
        realizadoPor: session?.user?.name,
        tutor: tutorSeleccionado,
        pagos: pagos.map(pago => {
          const cargo = cargosFiltrados.find(c => c.id === pago.cargoId);
          return {
            montoPagado: pago.montoPagado,
            cargo: {
              cargoNo: cargo?.cargoNo || "",
              tipo: cargo?.tipo || "COLEGIATURA"
            }
          };
        }),
      };
      
      setReciboSeleccionado(nuevoRecibo as any);
      setMostrarModalDetalle(true);

      setCargosSeleccionados({});
      setMetodoPago("");
      setCargosFiltrados([]);
      setCargos([]);
      setBalanceFiltrado(0);
      setBalanceTotal(0);
      setTutorSeleccionado(null);
      
      await cargarRecibos();

    // Esperar un momento para que el componente se actualice y luego imprimir
    setTimeout(() => {
      handleImprimir();
    }, 500);

      setTimeout(() => setExito(""), 5000);
    } catch (error) {
      setError("Error al registrar el pago");
    } finally {
      setCargando(false);
    }
  };

  // Funciones para Listado de Recibos
  const cargarRecibos = async () => {
    setCargandoRecibos(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (fechaDesdeRecibo) params.append("fechaDesde", fechaDesdeRecibo);
      if (fechaHastaRecibo) params.append("fechaHasta", fechaHastaRecibo);
      if (tutorFiltro) params.append("tutorId", tutorFiltro);

      const res = await fetch(`/api/financiero/recibos?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setRecibos(data.recibos || []);
    } catch (error) {
      console.error("Error al cargar los recibos:", error);
      setError("Error al cargar los recibos");
    } finally {
      setCargandoRecibos(false);
    }
  };

  const imprimirRecibo = (recibo: Recibo) => {
    const datosParaImprimir = {
      reciboNo: recibo.reciboNo,
      fecha: recibo.fecha,
      subTotal: recibo.subTotal,
      recargoTotal: recibo.recargoTotal,
      total: recibo.total,
      metodoPago: recibo.metodoPago,
      realizadoPor: recibo.realizadoPor,
      tutor: recibo.tutor,
      pagos: recibo.pagos.map(p => ({
        montoPagado: p.montoPagado,
        cargo: {
          cargoNo: p.cargo.cargoNo,
          tipo: p.cargo.tipo
        }
      })),
      anulado: recibo.anulado,
      motivoAnulacion: recibo.motivoAnulacion,
    };
    
    setReciboParaImprimir(datosParaImprimir);
    setTimeout(() => {
      handleImprimir();
      setReciboParaImprimir(null);
    }, 100);
  };

  const anularRecibo = async (recibo: Recibo, contrasena?: string) => {
    if (recibo.anulado) {
      setError("Este recibo ya está anulado");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const motivo = prompt("Motivo de anulación:", "Pago registrado por error");
    if (!motivo) return;

    try {
      const body: any = { anulado: true, motivo };
      
      if (contrasena) {
        body.contrasenaAutorizacion = contrasena;
      }

      const res = await fetch(`/api/financiero/recibos/${recibo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExito(`✅ Recibo ${recibo.reciboNo} anulado correctamente`);
      setTimeout(() => setExito(""), 4000);
      cargarRecibos();
    } catch (error) {
      setError("Error al anular el recibo");
    }
  };

  // Función para decidir si pedir la contraseña)
  const handleAnularRecibo = (recibo: Recibo) => {
    if (rol === "CONTADOR" || rol === "ADMINISTRADOR") {
      anularRecibo(recibo);
    } else {
      // Si es Cajero, pedir contraseña de autorización
      setReciboParaAnular(recibo);
      setMostrarModalContrasena(true);
    }
  };

  const handleConfirmarAutorizacion = async (contrasena: string) => {
    if (reciboParaAnular) {
      anularRecibo(reciboParaAnular, contrasena);
      setReciboParaAnular(null);
    }
  };

  const verDetalleRecibo = (recibo: Recibo) => {
    setReciboSeleccionado(recibo);
    setMostrarModalDetalle(true);
  };

  const handlePrintRecibo = () => {
    if (reciboSeleccionado) {
      handleImprimir();
    }
  };

  const limpiarFiltrosRecibos = () => {
    setFechaDesdeRecibo("");
    setFechaHastaRecibo("");
    setTutorSeleccionadoFiltro(null);
    setTutorFiltro("");
    setRecibos([]);
    setError("");
  };

  const { subTotal, recargoTotal, total } = calcularTotales();

  const InputValorCobrado = ({ cargo, valorActual, actualizarValor }: { 
    cargo: Cargo; 
    valorActual: number; 
    actualizarValor: (cargoId: number, valor: number) => void;
  }) => {
    const [valorLocal, setValorLocal] = useState<string>(valorActual && valorActual > 0 ? valorActual.toString() : "");
    const inputRef = useRef<HTMLInputElement>(null);

    const aplicarValor = () => {
      let valor = parseFloat(valorLocal);
      if (isNaN(valor)) valor = 0;
      actualizarValor(cargo.id, Math.round(valor * 100) / 100);
    };

    const handleBlur = () => {
      aplicarValor();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        aplicarValor();
        inputRef.current?.blur();
      }
    };

    useEffect(() => {
      // Actualizar cuando cambia valorLocal
      setValorLocal(valorActual && valorActual > 0 ? valorActual.toString() : "");
    }, [valorActual, cargo.id]);

    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={valorLocal}
        onChange={(e) => setValorLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={s.inputValor}
        placeholder="0.00"
      />
    );
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <NavBar titulo="Cobro de Cargos a Tutores" icono="💰" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Cobro de Cargos a Tutores</h1>
          <p style={s.subtitulo}>Registro de pagos presenciales de colegiatura y transporte</p>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        {/* Tabs */}
        <div style={s.tabs}>
          <button onClick={() => setTab("cobro")} style={{ ...s.tab, ...(tab === "cobro" ? s.tabActivo : {}) }}>
            💰 Cobro de Cargos
          </button>
          <button onClick={() => setTab("recibos")} style={{ ...s.tab, ...(tab === "recibos" ? s.tabActivo : {}) }}>
            📋 Listado de Recibos ({recibos.length})
          </button>
        </div>

        {/* Pestaña de Cobro de Cargos */}
        {tab === "cobro" && (
          <>
            <div style={s.infoBar}>
              <div><strong>Cobro no.:</strong> {cobroNo}</div>
              <div style={s.tutorHeader}>
                <label style={s.label}>Tutor:</label>
                <div style={{ flex: 1 }}>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={cargarTutoresParaFiltro}
                    defaultOptions={false}
                    onChange={(option: any) => {
                      if (option) {
                        cargarCargos(option.value);
                      } else {
                        setTutorSeleccionado(null);
                        setCargos([]);
                        setCargosFiltrados([]);
                        setCargosSeleccionados({});
                        setBalanceFiltrado(0);
                      }
                    }}
                    value={tutorSeleccionado ? {
                      value: tutorSeleccionado.id,
                      label: `${tutorSeleccionado.cuentaNo} - ${tutorSeleccionado.nombre} ${tutorSeleccionado.apellido}`
                    } : null}
                    placeholder="Buscar por número de cuenta, nombre, apellido..."
                    isClearable
                    formatOptionLabel={formatoOptionTutor}
                    noOptionsMessage={({ inputValue }) => 
                      !inputValue || inputValue.length < 2 
                        ? "Escribe al menos 2 caracteres para buscar..." 
                        : "No se encontraron tutores"
                    }
                    loadingMessage={() => "Buscando tutores..."}
                    styles={{
                      control: (base) => ({ ...base, padding: "4px", borderRadius: "7px", border: "1px solid #ddd", minHeight: "42px"
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                </div>
              </div>
            </div>

            {tutorSeleccionado && (
              <div style={s.card}>
                <div style={s.conceptoRow}>
                  <label style={s.label}>Concepto:</label>
                  <select value={concepto} onChange={(e) => setConcepto(e.target.value)} style={s.selectConcepto}>
                    <option value="TODOS">TODOS</option>
                    <option value="PAGO INSCRIPCION">PAGO INSCRIPCION</option>
                    <option value="PAGO COLEGIATURA & TRANSPORTE">PAGO COLEGIATURA & TRANSPORTE</option>
                    <option value="PAGO COLEGIATURA">PAGO COLEGIATURA</option>
                    <option value="PAGO TRANSPORTE">PAGO TRANSPORTE</option>
                  </select>
                </div>
                <div style={s.fechaRow}>
                  <label style={s.label}>Presentar cargos hasta:</label>
                  <input 
                    type="date" 
                    value={fechaHasta} 
                    onChange={handleFechaHastaChange} 
                    style={s.inputFecha} 
                  />
                  <button onClick={aplicarFiltros} style={s.btnFiltrar}>🔍 Filtrar</button>
                  <span style={s.balanceFiltrado}>Balance: RD${balanceFiltrado.toFixed(2)}</span>
                  <button onClick={limpiarFiltros} style={s.btnLimpiar}>🧹 Limpiar</button>
                </div>
              </div>
            )}

            {cargosFiltrados.length > 0 && (
              <div style={s.card}>
                <div style={{...s.tablaWrap, ...s.tablaScroll}}>
                  <table style={s.tabla}>
                    <thead>
                      <tr style={s.thead}>
                        <th style={s.th}>Cargo no.</th>
                        <th style={s.th}>Fecha</th>
                        <th style={s.th}>Monto</th>
                        <th style={s.th}>Recargo</th>
                        <th style={s.th}>Valor cobrado</th>
                        <th style={s.th}>Estado</th>
                        <th style={s.th}>Seleccionar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargosFiltrados.filter(c => c).map((cargo) => {
                        const valorCobradoActual = cargosSeleccionados[cargo.id] || 0;
                        const estadoCuota = obtenerEstadoCuota(cargo, valorCobradoActual);
                        
                        const getBadgeStyle = () => {
                          switch(estadoCuota) {
                            case "SALDO": return s.badgeSaldo;
                            case "ABONO": return s.badgeAbono;
                            default: return s.badgeNoAfecta;
                          }
                        };
                        
                        return (
                          <tr key={cargo.id}>
                            <td style={s.td}>{cargo.cargoNo}</td>
                            <td style={s.td}>{new Date(cargo.fechaVencimiento).toLocaleDateString("es-DO")}</td>
                            <td style={s.td}>RD${(cargo.monto || 0).toFixed(2)}</td>
                            <td style={s.td}>RD${(cargo.recargo || 0).toFixed(2)}</td>
                            <td style={s.td}>
                              <InputValorCobrado
                                  cargo={cargo}
                                  valorActual={valorCobradoActual}
                                  actualizarValor={actualizarValorCobrado}
                                />
                            </td>
                            <td style={s.td}>
                              <span style={getBadgeStyle()}>{estadoCuota}</span>
                            </td>
                            <td style={s.td}>
                              <input
                                type="checkbox"
                                checked={valorCobradoActual > 0}
                                onChange={() => toggleCargo(cargo)}
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
                  <div><strong>Descuento:</strong> RD$0.00</div>
                  <div style={s.totalBox}><strong>Total:</strong> RD${total.toFixed(2)}</div>
                </div>
              </div>
            )}

            {Object.keys(cargosSeleccionados).length > 0 && (
              <div style={s.metodoCard}>
                <div style={s.metodoGrid}>
                  <label style={s.checkboxLabel}>
                    <input type="radio" name="metodoPago" value="EFECTIVO" checked={metodoPago === "EFECTIVO"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                    💵 Efectivo
                  </label>
                  <label style={s.checkboxLabel}>
                    <input type="radio" name="metodoPago" value="CHEQUE" checked={metodoPago === "CHEQUE"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                    📝 Cheque
                  </label>
                  <label style={s.checkboxLabel}>
                    <input type="radio" name="metodoPago" value="TRANSFERENCIA" checked={metodoPago === "TRANSFERENCIA"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                    🏦 Transferencia
                  </label>
                  <label style={s.checkboxLabel}>
                    <input type="radio" name="metodoPago" value="TARJETA" checked={metodoPago === "TARJETA"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                    💳 Tarjeta
                  </label>
                </div>
                <div style={s.buttonGroup}>
                  <button onClick={registrarPagoPresencial} disabled={cargando} style={s.btnGuardar}>
                    {cargando ? "Procesando..." : "Registrar Pago"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pestaña de Listado de Recibos */}
        {tab === "recibos" && (
          <div style={s.recibosContainer}>
            <div style={s.filtrosRecibos}>
              <div style={s.filtroItem}>
                <label style={s.label}>Fecha desde</label>
                <input type="date" value={fechaDesdeRecibo} onChange={(e) => setFechaDesdeRecibo(e.target.value)} style={s.input} />
              </div>
              <div style={s.filtroItem}>
                <label style={s.label}>Fecha hasta</label>
                <input type="date" value={fechaHastaRecibo} onChange={(e) => setFechaHastaRecibo(e.target.value)} style={s.input} />
              </div>
              <div style={s.filtroItem}>
                <label style={s.label}>Tutor</label>
                <AsyncSelect
                  cacheOptions
                  loadOptions={cargarTutoresParaFiltro}
                  defaultOptions={false}
                  onChange={(option: any) => {
                    setTutorSeleccionadoFiltro(option);
                    setTutorFiltro(option?.value?.toString() || "");
                  }}
                  value={tutorSeleccionadoFiltro}
                  placeholder="Buscar por cuenta, nombre, apellido..."
                  isClearable
                  formatOptionLabel={formatoOptionTutor}
                  noOptionsMessage={({ inputValue }) => 
                    !inputValue || inputValue.length < 2 
                      ? "Escribe al menos 2 caracteres para buscar..." 
                      : "No se encontraron tutores"
                  }
                  loadingMessage={() => "Buscando tutores..."}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      padding: "4px", 
                      borderRadius: "7px", 
                      border: "1px solid #ddd",
                      minHeight: "38px"
                    }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div style={s.filtroItem}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <button onClick={cargarRecibos} style={s.btnFiltrar}>🔍 Filtrar</button>
                  <button onClick={limpiarFiltrosRecibos} style={s.btnLimpiar}>🧹 Limpiar</button>
                </div>
              </div>
            </div>

            {cargandoRecibos ? (
              <div style={s.vacio}>Cargando recibos...</div>
            ) : recibos.length === 0 ? (
              <div style={s.vacio}>
                {fechaDesdeRecibo || fechaHastaRecibo || tutorFiltro 
                  ? "No hay recibos con los filtros seleccionados" 
                  : "Use los filtros para buscar recibos"}
              </div>
            ) : (
              <div style={{...s.tablaWrap, ...s.tablaScroll}}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Recibo No.</th>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Tutor</th>
                      <th style={s.th}>Total</th>
                      <th style={s.th}>Realizado por</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibos.map((recibo) => (
                      <tr key={recibo.id} style={recibo.anulado ? { backgroundColor: "#fff5f5" } : {}}>
                        <td style={s.td}>{recibo.reciboNo}</td>
                        <td style={s.td}>{new Date(recibo.fecha).toLocaleString("es-DO")}</td>
                        <td style={s.td}>{recibo.tutor.nombre} {recibo.tutor.apellido}<br/><small>{recibo.tutor.cuentaNo}</small></td>
                        <td style={s.td}>RD${recibo.total.toFixed(2)}</td>
                        <td style={s.td}>{recibo.realizadoPor}</td>
                        <td style={s.td}>
                          {recibo.anulado ? (
                            <span style={s.badgeAnulado}>ANULADO</span>
                          ) : (
                            <span style={s.badgeActivo}>ACTIVO</span>
                          )}
                        </td>
                        <td style={s.td}>
                          <button onClick={() => verDetalleRecibo(recibo)} style={s.btnVer}>👁️ Ver</button>
                          <button onClick={() => imprimirRecibo(recibo)} style={s.btnImprimir}>🖨️ Imprimir</button>
                          {!recibo.anulado && (
                            <button onClick={() => handleAnularRecibo(recibo)} style={s.btnAnular}>🚫 Anular</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <ModalDetalleReciboCargos
          isOpen={mostrarModalDetalle}
          onClose={() => setMostrarModalDetalle(false)}
          onPrint={() => imprimirRecibo(reciboSeleccionado!)}
          recibo={reciboSeleccionado}
        />

        <ModalContrasenaRol
          isOpen={mostrarModalContrasena}
          onClose={() => {
            setMostrarModalContrasena(false);
            setReciboParaAnular(null);
          }}
          onConfirm={handleConfirmarAutorizacion}
          rol="CONTADOR"
          accion="anular el recibo"
        />

        {/* Componente oculto para imprimir */}
        <ModalDetalleReciboCargos
          isOpen={mostrarModalDetalle}
          onClose={() => {
            setMostrarModalDetalle(false);
            setReciboSeleccionado(null);
          }}
          onPrint={handlePrintRecibo}
          recibo={reciboSeleccionado}
          />

          {/* Componente oculto para imprimir */}
          <div style={{ display: "none" }}>
            {reciboParaImprimir && (
              <ImprimirContenido
                ref={componentRef}
                titulo="Recibo de Pago"
                datos={reciboParaImprimir}
                tipo="recibo-cargos"
              />
            )}
            {reciboSeleccionado && (
              <ImprimirContenido
                ref={componentRef}
                titulo="Recibo de Pago"
                datos={reciboSeleccionado}
                tipo="recibo-cargos"
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
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { border: "1px solid #2C1810", color: "#2C1810", background: "#EBF3FB" },
  infoBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tutorHeader: { display: "flex", alignItems: "center", gap: "16px", flex: 1, marginLeft: "20px" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "4px" },
  card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  conceptoRow: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" },
  selectConcepto: { flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" },
  fechaRow: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  inputFecha: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" },
  balanceFiltrado: { background: "#f0f4f8", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", color: "#2C1810" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", width: "100%", WebkitOverflowScrolling: "touch" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "700px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left", whiteSpace: "nowrap" as const },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: "13px", whiteSpace: "nowrap" as const },
  inputValor: { width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "right" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  badgeSaldo: { background: "#c6f6d5", color: "#22543d", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAbono: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeNoAfecta: { background: "#e2e8f0", color: "#4a5568", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAnulado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", textDecoration: "line-through" },
  totalesContainer: { textAlign: "right", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee" },
  totalBox: { fontSize: "16px", fontWeight: "bold", marginTop: "8px", color: "#2C1810" },
  metodoCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginTop: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  metodoGrid: { display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "20px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" },
  buttonGroup: { display: "flex", justifyContent: "flex-end" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px", fontSize: "12px" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px", fontSize: "12px" },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", fontSize: "12px" },
  recibosContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" as const, width: "100%" },
  filtrosRecibos: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px", alignItems: "flex-end" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  filtroItem: { minWidth: "0", width: "100%" },
  tablaScroll: { maxHeight: "500px", overflowY: "auto" as const, },
};
