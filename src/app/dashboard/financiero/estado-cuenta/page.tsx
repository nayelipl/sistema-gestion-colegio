"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Movimiento = {
  id: number;
  docNo: string;
  fecha: string;
  hora: string;
  tipo: string;
  descripcion: string;
  debito: number;
  credito: number;
  balance: number;
  realizadoPor: string;
  estudiante?: { nombre: string; apellido: string; codigo: string };
};

export default function EstadoCuentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [tutor, setTutor] = useState<any>(null);
  const [resumen, setResumen] = useState({ totalDebito: 0, totalCredito: 0, balance: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tutores, setTutores] = useState<any[]>([]);
  const [tutorSeleccionado, setTutorSeleccionado] = useState<string>("");
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  // Cargar lista de tutores (solo para admin/contador/cajero)
  useEffect(() => {
    if (rol !== "TUTOR") {
      fetch("/api/usuarios/tutores")
        .then(r => r.json())
        .then(setTutores)
        .catch(console.error);
    }
  }, [rol]);

  useEffect(() => {
    if (status === "authenticated") {
      // Si es TUTOR, cargar automáticamente su estado de cuenta
      if (rol === "TUTOR") {
        cargarEstadoCuenta();
      }
    }
  }, [status, rol]);

  useEffect(() => {
    if (tutorSeleccionado) {
      cargarEstadoCuenta(tutorSeleccionado);
    }
  }, [tutorSeleccionado, fechaDesde, fechaHasta, tipoFiltro]);

  const cargarEstadoCuenta = async (tutorId?: string) => {
    setCargando(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      if (tutorId) params.append("tutorId", tutorId);
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (tipoFiltro !== "TODOS") params.append("tipo", tipoFiltro);
      
      const res = await fetch(`/api/financiero/estado-cuenta?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
      } else {
        setTutor(data.tutor);
        setMovimientos(data.movimientos || []);
        setResumen(data.resumen || { totalDebito: 0, totalCredito: 0, balance: 0 });
      }
    } catch (error) {
      setError("Error al cargar el estado de cuenta");
    } finally {
      setCargando(false);
    }
  };

  const formatFecha = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString("es-DO");
  };

  const formatMonto = (monto: number | string | null | undefined) => {
    if (monto === null || monto === undefined) return "RD$0.00";
    const num = typeof monto === "number" ? monto : parseFloat(monto);
    if (isNaN(num)) return "RD$0.00";
    return `RD$${num.toFixed(2)}`;
    };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "CARGO": return <span style={s.badgeCargo}>📝 CARGO</span>;
      case "PAGO": return <span style={s.badgePago}>💰 PAGO</span>;
      case "AJUSTE": return <span style={s.badgeAjuste}>⚙️ AJUSTE</span>;
      default: return <span>{tipo}</span>;
    }
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📄 Estado de Cuenta</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Estado de Cuenta</h1>
          <p style={s.subtitulo}>Historial de movimientos y balance actual</p>
        </div>

        {error && <div style={s.errorMsg}>❌ {error}</div>}

        {/* Selector de Tutor (solo para admin/contador/cajero) */}
        {rol !== "TUTOR" && (
          <div style={s.filtrosCard}>
            <div style={s.filtrosGrid}>
              <div>
                <label style={s.label}>Seleccionar Tutor</label>
                <select 
                  value={tutorSeleccionado} 
                  onChange={(e) => setTutorSeleccionado(e.target.value)} 
                  style={s.input}
                >
                  <option value="">-- Seleccione un tutor --</option>
                  {tutores.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.cuentaNo} - {t.nombre} {t.apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Información del Tutor */}
        {tutor && (
          <div style={s.tutorCard}>
            <div style={s.tutorGrid}>
              <div><strong>Cuenta No.:</strong> {tutor.cuentaNo}</div>
              <div><strong>Tutor:</strong> {tutor.nombre} {tutor.apellido}</div>
              <div><strong>Dirección:</strong> {tutor.direccion || "—"}</div>
              <div><strong>Celular:</strong> {tutor.celular || "—"}</div>
            </div>
          </div>
        )}

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
              <label style={s.label}>Tipo de movimiento</label>
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} style={s.input}>
                <option value="TODOS">Todos</option>
                <option value="CARGO">Cargos</option>
                <option value="PAGO">Pagos</option>
                <option value="AJUSTE">Ajustes</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={() => cargarEstadoCuenta(tutorSeleccionado)} style={s.btnFiltrar}>🔍 Filtrar</button>
            </div>
          </div>
        </div>

        {/* Tabla de movimientos */}
        {cargando ? (
          <div style={s.vacio}>Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div style={s.vacio}>
            {tutorSeleccionado || rol === "TUTOR" 
              ? "No hay movimientos registrados para este tutor" 
              : "Seleccione un tutor para ver su estado de cuenta"}
          </div>
        ) : (
          <>
            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>DOC No.</th>
                    <th style={s.th}>Descripción</th>
                    <th style={s.th}>Débito</th>
                    <th style={s.th}>Crédito</th>
                    <th style={s.th}>Balance</th>
                    <th style={s.th}>Realizado por</th>
                    <th style={s.th}>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, i) => (
                    <tr key={mov.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={s.td}>{formatFecha(mov.fecha)}</td>
                      <td style={s.td}><code style={s.codigo}>{mov.docNo}</code></td>
                      <td style={s.td}>
                        {getTipoBadge(mov.tipo)} {mov.descripcion}
                        {mov.estudiante && (
                          <span style={s.estudianteRef}>
                            ({mov.estudiante.codigo} - {mov.estudiante.nombre} {mov.estudiante.apellido})
                          </span>
                        )}
                      </td>
                      <td style={s.td}>{mov.debito > 0 ? formatMonto(mov.debito) : "—"}</td>
                      <td style={s.td}>{mov.credito > 0 ? formatMonto(mov.credito) : "—"}</td>
                      <td style={s.td}><strong>{formatMonto(mov.balance)}</strong></td>
                      <td style={s.td}>{mov.realizadoPor}</td>
                      <td style={s.td}>{mov.hora}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={s.tfoot}>
                    <td colSpan={3} style={s.td}><strong>TOTALES:</strong></td>
                    <td style={s.td}><strong>{formatMonto(resumen.totalDebito)}</strong></td>
                    <td style={s.td}><strong>{formatMonto(resumen.totalCredito)}</strong></td>
                    <td style={s.td}><strong>{formatMonto(resumen.balance)}</strong></td>
                    <td colSpan={2} style={s.td}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
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
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px" },
  tutorCard: { background: "#fff", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tutorGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" },
  filtrosCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "center" },
  label: { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0" },
  tfoot: { background: "#f0f4f8", fontWeight: "bold" },
  codigo: { background: "#f0f4f8", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" },
  badgeCargo: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", marginRight: "6px" },
  badgePago: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", marginRight: "6px" },
  badgeAjuste: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", marginRight: "6px" },
  estudianteRef: { fontSize: "11px", color: "#666", marginLeft: "6px" },
};
