"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [totalCobrado, setTotalCobrado] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [cuotasVencidas, setCuotasVencidas] = useState("");
  
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

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    if (status === "authenticated") {
      cargarCuentas();
    }
  }, [status, fechaDesde, fechaHasta, tipo, cuotasVencidas]);

  const cargarCuentas = async () => {
    setCargando(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (tipo !== "TODOS") params.append("tipo", tipo);
      if (cuotasVencidas) params.append("cuotasVencidas", cuotasVencidas);
      
      const res = await fetch(`/api/financiero/cuentas-por-cobrar?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setCuentas(data.cuentas || []);
      setTotalPendiente(data.totalPendiente || 0);
      setTotalCobrado(data.totalCobrado || 0);
    } catch (error) {
      setError("Error al cargar cuentas por cobrar");
    } finally {
      setCargando(false);
    }
  };

  const formatMonto = (monto: number) => `RD$${monto.toFixed(2)}`;
  const formatFecha = (fecha: string) => new Date(fecha).toLocaleDateString("es-DO");

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
          <h1 style={s.titulo}>Cuentas por Cobrar</h1>
          <p style={s.subtitulo}>Control de deudores y cargos pendientes</p>
        </div>

        {error && <div style={s.errorMsg}>❌ {error}</div>}

        {/* Filtros */}
        <div style={s.filtrosCard}>
          <div style={s.filtrosGrid}>
            <div>
              <label style={s.label}>Fecha desde</label>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Fecha hasta</label>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Tipo de cargo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={s.input}>
                <option value="TODOS">Todos</option>
                <option value="COLEGIATURA">Colegiatura</option>
                <option value="TRANSPORTE">Transporte</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Cuotas vencidas (mínimo)</label>
              <input type="number" value={cuotasVencidas} onChange={(e) => setCuotasVencidas(e.target.value)} style={s.input} placeholder="Ej: 3" />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={cargarCuentas} style={s.btnFiltrar}>🔍 Filtrar</button>
              <button onClick={cargarCuentas} style={s.btnActualizar}>🔄 Actualizar</button>
            </div>
          </div>
        </div>

        {/* Totales */}
        <div style={s.totalesCard}>
          <div><strong>Total pendiente:</strong> {formatMonto(totalPendiente)}</div>
          <div><strong>Total cobrado:</strong> {formatMonto(totalCobrado)}</div>
        </div>

        {/* Tabla de cuentas */}
        {cargando ? (
          <div style={s.vacio}>Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div style={s.vacio}>No hay cuentas por cobrar registradas</div>
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
                {cuentas.map((cuenta, idx) => (
                  cuenta.cargos.map((cargo, cargoIdx) => (
                    <tr key={`${cuenta.tutorId}-${cargo.id}`}>
                      {columnas.numero && <td style={s.td}>{idx + 1}</td>}
                      {columnas.cuenta && <td style={s.td}>{cuenta.cuenta}</td>}
                      {columnas.tutor && <td style={s.td}>{cuenta.tutor}</td>}
                      {columnas.cargoNo && <td style={s.td}>{cargo.cargoNo}</td>}
                      {columnas.valorCargo && <td style={s.td}>{formatMonto(cargo.valorCargo)}</td>}
                      {columnas.cantidadCuotas && <td style={s.td}>1</td>}
                      {columnas.monto && <td style={s.td}>{formatMonto(cargo.saldoPendiente)}</td>}
                      {columnas.fechaVencimiento && <td style={s.td}>{formatFecha(cargo.fechaVencimiento)}</td>}
                      {columnas.fechaPago && <td style={s.td}>{cargo.fechaUltimoPago ? formatFecha(cargo.fechaUltimoPago) : "—"}</td>}
                      {columnas.montoPago && <td style={s.td}>{cargo.montoPagado > 0 ? formatMonto(cargo.montoPagado) : "—"}</td>}
                      {columnas.balance && <td style={s.td}>{formatMonto(cargo.saldoPendiente)}</td>}
                      {columnas.estado && <td style={s.td}>{getEstadoBadge(cargo.estado)}</td>}
                      {columnas.actualizadoEn && <td style={s.td}>{new Date(cargo.actualizadoEn || "").toLocaleString()}</td>}
                    </tr>
                  ))
                ))}
              </tbody>
              <tfoot>
                <tr style={s.tfoot}>
                  <td colSpan={Object.values(columnas).filter(Boolean).length - 2} style={s.td}><strong>TOTALES:</strong></td>
                  <td style={s.td}><strong>{formatMonto(totalPendiente)}</strong></td>
                  <td style={s.td}><strong>{formatMonto(totalCobrado)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
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
  contenido: { maxWidth: "1400px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  filtrosCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "16px", alignItems: "center" },
  label: { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", marginRight: "8px" },
  btnActualizar: { background: "#2F855A", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  totalesCard: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between" },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0" },
  tfoot: { background: "#f0f4f8", fontWeight: "bold" },
  badgeCorriente: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgePendiente: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeVencido: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAbonada: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeSalda: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
};
