"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";

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
  cargoNo: string;
  fechaVencimiento: string;
  monto: number;
  recargo: number;
  saldoPendiente: number;
  estudiante?: { nombre: string; apellido: string; codigo: string };
  valorCobrado?: number;
};

export default function CobroCargosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [tutores, setTutores] = useState<Tutor[]>([]);
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
  const [concepto, setConcepto] = useState("PAGO COLEGIATURA & TRANSPORTE");
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [cargosFiltrados, setCargosFiltrados] = useState<Cargo[]>([]);

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
      setTutores(data);
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
      filtrarCargosPorFecha(data.cargosPendientes || [], fechaHasta);
    } catch (error) {
      setError("Error al cargar los cargos del tutor");
    } finally {
      setCargando(false);
    }
  };

  const filtrarCargosPorFecha = (cargosList: Cargo[], fecha: string) => {
    const fechaLimite = new Date(fecha);
    fechaLimite.setHours(23, 59, 59);
    const filtrados = (cargosList || []).filter(cargo => {
      if (!cargo) return false;
    const fechaVenc = new Date(cargo.fechaVencimiento);
    return fechaVenc <= fechaLimite;
    });
    console.log(`Cargos totales: ${cargosList.length}, filtrados: ${filtrados.length}`);
    setCargosFiltrados(filtrados);
    
    const balance = filtrados.reduce((sum, c) => sum + (c.saldoPendiente || (c.monto + (c.recargo || 0))), 0);
    setBalanceFiltrado(balance);
    setCargosSeleccionados({});
  };

  const handleFechaHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = e.target.value;
    setFechaHasta(nuevaFecha);
    if (cargos.length > 0) {
      filtrarCargosPorFecha(cargos, nuevaFecha);
    }
  };

  const toggleCargo = (cargo: Cargo) => {
    setCargosSeleccionados(prev => {
      const nuevo = { ...prev };
      if (nuevo[cargo.id]) {
        delete nuevo[cargo.id];
      } else {
        nuevo[cargo.id] = cargo.saldoPendiente || (cargo.monto + (cargo.recargo || 0));
      }
      return nuevo;
    });
  };

  // Función para obtener el estado de la cuota basado en el valor cobrado
  const obtenerEstadoCuota = (cargo: Cargo, valorCobrado: number | undefined): string => {
    const montoTotal = (cargo.monto || 0) + (cargo.recargo || 0);
    
    // Si no se ha introducido valor o es 0
    if (!valorCobrado || valorCobrado === 0) {
      return "NO AFECTA";
    }
    // Si el valor cobrado es menor al monto total
    else if (valorCobrado < montoTotal) {
      return "ABONO";
    }
    // Si el valor cobrado es igual al monto total
    else if (valorCobrado === montoTotal) {
      return "SALDO";
    }
    // Si es mayor (esto debería manejarse con la redistribución)
    return "ABONO";
  };

  // Función principal para actualizar valor cobrado con redistribución automática
  const actualizarValorCobrado = (cargoId: number, valor: number) => {
    const cargoIndex = cargosFiltrados.findIndex(c => c.id === cargoId);
    if (cargoIndex === -1) return;
    
    const cargo = cargosFiltrados[cargoIndex];
    const montoTotal = (cargo.monto || 0) + (cargo.recargo || 0);
    
    // Validar que el valor sea un número válido y redondear a 2 decimales
    let nuevoValor = isNaN(valor) ? 0 : Math.round(valor * 100) / 100;
    nuevoValor = Math.max(0, nuevoValor);
    
    // Si el valor es mayor al monto total y hay más cargos después
    if (nuevoValor > montoTotal && cargoIndex < cargosFiltrados.length - 1) {
      // Calcular el excedente
      const excedente = nuevoValor - montoTotal;
      
      // Crear nuevo objeto de cargos seleccionados
      const nuevosSeleccionados: Record<number, number> = {};
      
      // Primero, establecer el cargo actual al máximo (montoTotal)
      nuevosSeleccionados[cargo.id] = montoTotal;
      
      // Variable para seguir el excedente a distribuir
      let excedenteRestante = excedente;
      
      // Distribuir el excedente entre los cargos siguientes
      for (let i = cargoIndex + 1; i < cargosFiltrados.length && excedenteRestante > 0; i++) {
        const cargoSiguiente = cargosFiltrados[i];
        const montoSiguiente = (cargoSiguiente.monto || 0) + (cargoSiguiente.recargo || 0);
        const valorActual = cargosSeleccionados[cargoSiguiente.id] || 0;
        
        // Calcular cuánto se puede asignar a este cargo hasta su monto total
        const espacioDisponible = montoSiguiente - valorActual;
        
        if (espacioDisponible > 0) {
          let asignar = excedenteRestante;
          if (asignar > espacioDisponible) {
            asignar = espacioDisponible;
          }
          // Redondear a 2 decimales
          asignar = Math.round(asignar * 100) / 100;
          nuevosSeleccionados[cargoSiguiente.id] = Math.round((valorActual + asignar) * 100) / 100;
          excedenteRestante = Math.round((excedenteRestante - asignar) * 100) / 100;
        } else {
          nuevosSeleccionados[cargoSiguiente.id] = valorActual;
        }
      }
      
      // Mantener los valores de los cargos anteriores sin cambios
      for (let i = 0; i < cargoIndex; i++) {
        const cargoAnterior = cargosFiltrados[i];
        if (cargosSeleccionados[cargoAnterior.id] !== undefined) {
          nuevosSeleccionados[cargoAnterior.id] = cargosSeleccionados[cargoAnterior.id];
        }
      }
      
      // Mantener los valores de los cargos después de los que ya fueron procesados
      for (let i = cargoIndex + 1 + (excedenteRestante > 0 ? cargosFiltrados.slice(cargoIndex + 1).length : 0); i < cargosFiltrados.length; i++) {
        const cargoRestante = cargosFiltrados[i];
        if (cargosSeleccionados[cargoRestante.id] !== undefined && nuevosSeleccionados[cargoRestante.id] === undefined) {
          nuevosSeleccionados[cargoRestante.id] = cargosSeleccionados[cargoRestante.id];
        }
      }
      
      setCargosSeleccionados(nuevosSeleccionados);
    } 
    // Si el valor es mayor al monto total pero es el último cargo, limitar al monto total
    else if (nuevoValor > montoTotal && cargoIndex === cargosFiltrados.length - 1) {
      setCargosSeleccionados(prev => ({
        ...prev,
        [cargoId]: montoTotal,
      }));
    }
    // Si el valor es menor o igual al monto total, actualizar normalmente
    else {
      setCargosSeleccionados(prev => ({
        ...prev,
        [cargoId]: nuevoValor,
      }));
    }
  };

  const calcularTotales = () => {
    let subTotal = 0;
    let recargoTotal = 0;
    
    // Sumar los valores que el usuario ha ingresado en "Valor Cobrado"
    Object.entries(cargosSeleccionados).forEach(([id, valorCobrado]) => {
      const cargo = cargosFiltrados.find(c => c.id === parseInt(id));
      if (cargo && valorCobrado && valorCobrado > 0) {
        // Calcular la proporción del pago para este cargo
        const montoTotalCargo = (cargo.monto || 0) + (cargo.recargo || 0);
        const proporcion = valorCobrado / montoTotalCargo;
        
        // Aplicar la proporción al monto y recargo
        subTotal += (cargo.monto || 0) * proporcion;
        recargoTotal += (cargo.recargo || 0) * proporcion;
      }
    });
    
    // Redondear a 2 decimales
    subTotal = Math.round(subTotal * 100) / 100;
    recargoTotal = Math.round(recargoTotal * 100) / 100;
    const total = Math.round((subTotal + recargoTotal) * 100) / 100;
    
    return { subTotal, recargoTotal, total };
  };

  const registrarPago = async () => {
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
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setExito(`${data.mensaje} - Recibo: ${data.reciboNo}`);
      setCargosSeleccionados({});
      setMetodoPago("");
      if (tutorSeleccionado) {
        cargarCargos(tutorSeleccionado.id);
      }
      setTimeout(() => setExito(""), 5000);
    } catch (error) {
      setError("Error al registrar el pago");
    } finally {
      setCargando(false);
    }
  };

  const { subTotal, recargoTotal, total } = calcularTotales();

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>💰 Cobro de Cargos a Tutores</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Cobro de Cargos a Tutores</h1>
          <p style={s.subtitulo}>Registro de pagos presenciales de colegiatura y transporte</p>
        </div>

        <div style={s.infoBar}>
          <div><strong>Cobro no.:</strong> {cobroNo}</div>
          <div><strong>Fecha:</strong> {new Date().toLocaleDateString("es-DO")}</div>
        </div>

        <div style={s.card}>
          <div style={s.tutorHeader}>
            <label style={s.label}>Tutor:</label>
            <select
              value={tutorSeleccionado?.id || ""}
              onChange={(e) => cargarCargos(parseInt(e.target.value))}
              style={s.selectTutor}
            >
              <option value="">-- Seleccione un tutor --</option>
              {tutores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.cuentaNo} - {t.nombre} {t.apellido}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tutorSeleccionado && (
          <div style={s.card}>
            <div style={s.conceptoRow}>
              <label style={s.label}>Concepto:</label>
              <select value={concepto} onChange={(e) => setConcepto(e.target.value)} style={s.selectConcepto}>
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
              <span style={s.balanceFiltrado}>Balance: RD${balanceFiltrado.toFixed(2)}</span>
            </div>
          </div>
        )}

        {cargosFiltrados.length > 0 && (
          <div style={s.card}>
            <div style={s.tablaWrap}>
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
                  {cargosFiltrados && cargosFiltrados.filter(c => c).map((cargo) => {
                    const montoTotal = (cargo.monto || 0) + (cargo.recargo || 0);
                    const estaSeleccionado = !!cargosSeleccionados[cargo.id];
                    const valorCobradoActual = cargosSeleccionados[cargo.id];
                    const estadoCuota = obtenerEstadoCuota(cargo, valorCobradoActual);
                    
                    // Determinar el estilo del badge según el estado
                    const getBadgeStyle = () => {
                      switch(estadoCuota) {
                        case "SALDO":
                          return s.badgeSaldo;
                        case "ABONO":
                          return s.badgeAbono;
                        default:
                          return s.badgeNoAfecta;
                      }
                    };
                    
                    return (
                      <tr key={cargo.id}>
                        <td style={s.td}>{cargo.cargoNo}</td>
                        <td style={s.td}>{new Date(cargo.fechaVencimiento).toLocaleDateString("es-DO")}</td>
                        <td style={s.td}>RD${(cargo.monto || 0).toFixed(2)}</td>
                        <td style={s.td}>RD${(cargo.recargo || 0).toFixed(2)}</td>
                        <td style={s.td}>
                          <input
                            type="number"
                            step="0.01"
                            value={valorCobradoActual || ""}
                            onChange={(e) => {
                              const valor = parseFloat(e.target.value);
                              if (!isNaN(valor)) {
                                actualizarValorCobrado(cargo.id, Math.round(valor * 100) / 100);
                              } else {
                                actualizarValorCobrado(cargo.id, 0);
                              }
                            }}
                            style={s.inputValor}
                            placeholder="0.00"
                          />
                          </td>
                        <td style={s.td}>
                          <span style={getBadgeStyle()}>
                            {estadoCuota}
                          </span>
                        </td>
                        <td style={s.td}>
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
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
              <button onClick={registrarPago} disabled={cargando} style={s.btnGuardar}>
                {cargando ? "Procesando..." : "Registrar Pago"}
              </button>
            </div>
          </div>
        )}
        
        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}
        
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1000px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  infoBar: { display: "flex", justifyContent: "space-between", background: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tutorHeader: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333" },
  selectTutor: { flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", minWidth: "200px" },
  tutorNombre: { fontSize: "14px", fontWeight: "bold", color: "#1F5C99" },
  balanceCard: { background: "#1F5C99", color: "#fff", borderRadius: "12px", padding: "12px 20px", marginTop: "16px", textAlign: "center", fontSize: "14px" },
  conceptoRow: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" },
  selectConcepto: { flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" },
  fechaRow: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  inputFecha: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" },
  balanceFiltrado: { background: "#f0f4f8", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", color: "#1F5C99" },
  tablaWrap: { overflowX: "auto" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  thead: { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0" },
  inputValor: { width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "right" },
  checkbox: { width: "20px", height: "20px", cursor: "pointer" },
  badgeSaldo: { background: "#c6f6d5", color: "#22543d", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAbono: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeNoAfecta: { background: "#e2e8f0", color: "#4a5568", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  totalesContainer: { textAlign: "right", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee" },
  totalBox: { fontSize: "16px", fontWeight: "bold", marginTop: "8px", color: "#1F5C99" },
  metodoCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginTop: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  metodoGrid: { display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "20px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" },
  buttonGroup: { display: "flex", justifyContent: "flex-end" },
  btnGuardar: { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
