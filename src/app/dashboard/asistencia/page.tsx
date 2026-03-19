"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Estudiante = { id: number; codigo: string; nombre: string; apellido: string };
type Asistencia = {
  id: number; estado: string; fecha: string;
  estudiante: { nombre: string; apellido: string; codigo: string };
};
type Tab = "paselista" | "reporte";

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "SECRETARIA_DOCENTE", "MAESTRO"];

export default function AsistenciaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("paselista");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [registros, setRegistros]   = useState<Record<number, string>>({});
  const [fecha, setFecha]           = useState(new Date().toISOString().split("T")[0]);
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError]           = useState("");
  const [exito, setExito]           = useState("");
  const [cargando, setCargando]     = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => {
      const ests = d.estudiantes || [];
      setEstudiantes(ests);
      // Inicializar todos como PRESENTE
      const init: Record<number, string> = {};
      ests.forEach((e: Estudiante) => { init[e.id] = "PRESENTE"; });
      setRegistros(init);
    });
  }, []);

  useEffect(() => {
    if (tab === "reporte") cargarReporte();
  }, [tab, fechaReporte]);

  const cargarReporte = async () => {
    const res  = await fetch(`/api/asistencia?fecha=${fechaReporte}`);
    const data = await res.json();
    setAsistencias(data.asistencias || []);
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const cambiarEstado = (id: number, estado: string) => {
    setRegistros({ ...registros, [id]: estado });
  };

  const guardarAsistencia = async () => {
    setCargando(true);
    setError(""); setExito("");
    const data = Object.entries(registros).map(([id, estado]) => ({
      estudianteId: parseInt(id),
      estado,
    }));
    const res  = await fetch("/api/asistencia", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ registros: data, fecha }),
    });
    const result = await res.json();
    setCargando(false);
    if (!res.ok) { setError(result.error); return; }
    setExito(result.mensaje);
    setTimeout(() => setExito(""), 3000);
  };

  const presentes  = Object.values(registros).filter(e => e === "PRESENTE").length;
  const ausentes   = Object.values(registros).filter(e => e === "AUSENTE").length;
  const tardanzas  = Object.values(registros).filter(e => e === "TARDANZA").length;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📋 Asistencia</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Control de Asistencia</h1>
          <p style={s.subtitulo}>Pase de lista diario y reportes de asistencia</p>
        </div>

        <div style={s.tabs}>
          <button onClick={() => setTab("paselista")}
            style={{ ...s.tab, ...(tab === "paselista" ? s.tabActivo : {}) }}>
            ✏️ Pase de Lista
          </button>
          <button onClick={() => setTab("reporte")}
            style={{ ...s.tab, ...(tab === "reporte" ? s.tabActivo : {}) }}>
            📊 Reporte
          </button>
        </div>

        {/* ── PASE DE LISTA ── */}
        {tab === "paselista" && (
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <label style={s.label}>Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...s.input, width: "180px" }} />
              </div>
              <div style={s.resumenFila}>
                <span style={s.badgePresente}>✅ {presentes} presentes</span>
                <span style={s.badgeAusente}>❌ {ausentes} ausentes</span>
                <span style={s.badgeTardanza}>⏰ {tardanzas} tardanzas</span>
              </div>
            </div>

            {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
            {error && <div style={s.errorMsg}>{error}</div>}

            {estudiantes.length === 0 ? (
              <div style={s.vacio}>No hay estudiantes registrados.</div>
            ) : (
              <>
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead>
                      <tr style={s.thead}>
                        <th style={s.th}>Código</th>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantes.map((e, i) => (
                        <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                          <td style={s.td}><code style={s.codigo}>{e.codigo}</code></td>
                          <td style={s.td}>{e.nombre} {e.apellido}</td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {["PRESENTE", "AUSENTE", "TARDANZA"].map(est => (
                                <button key={est} onClick={() => cambiarEstado(e.id, est)}
                                  style={{
                                    ...s.btnEstado,
                                    ...(registros[e.id] === est ? s.btnEstadoActivo[est as keyof typeof s.btnEstadoActivo] : {}),
                                  }}>
                                  {est === "PRESENTE" ? "✅" : est === "AUSENTE" ? "❌" : "⏰"}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button onClick={guardarAsistencia} disabled={cargando}
                    style={{ ...s.btnGuardar, opacity: cargando ? 0.7 : 1 }}>
                    {cargando ? "Guardando..." : "💾 Guardar asistencia"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REPORTE ── */}
        {tab === "reporte" && (
          <div style={s.card}>
            <div style={{ marginBottom: "20px" }}>
              <label style={s.label}>Fecha del reporte</label>
              <input type="date" value={fechaReporte}
                onChange={e => setFechaReporte(e.target.value)}
                style={{ ...s.input, width: "180px" }} />
            </div>

            {asistencias.length === 0 ? (
              <div style={s.vacio}>No hay registros de asistencia para esta fecha.</div>
            ) : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Estudiante</th>
                      <th style={s.th}>Código</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencias.map((a, i) => (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}>{a.estudiante.nombre} {a.estudiante.apellido}</td>
                        <td style={s.td}><code style={s.codigo}>{a.estudiante.codigo}</code></td>
                        <td style={s.td}>
                          <span style={
                            a.estado === "PRESENTE" ? s.badgePresente :
                            a.estado === "AUSENTE"  ? s.badgeAusente  : s.badgeTardanza
                          }>{a.estado}</span>
                        </td>
                        <td style={s.td}>{new Date(a.fecha).toLocaleDateString("es-DO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, any> = {
  loading:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:    { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:       { color: "#1F5C99", fontWeight: "bold" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:      { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navUser:      { fontSize: "14px" },
  contenido:    { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:       { marginBottom: "24px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  tabs:         { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:          { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:    { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  card:         { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  label:        { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:        { padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" },
  resumenFila:  { display: "flex", gap: "8px", flexWrap: "wrap" },
  badgePresente:{ background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  badgeAusente: { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  badgeTardanza:{ background: "#fefcbf", color: "#744210", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888" },
  tablaWrap:    { overflowX: "auto", background: "#fff", borderRadius: "10px" },
  tabla:        { width: "100%", borderCollapse: "collapse" },
  thead:        { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  codigo:       { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  btnEstado:    { padding: "6px 10px", border: "2px solid #ddd", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "14px" },
  btnEstadoActivo: {
    PRESENTE:  { borderColor: "#276749", background: "#c6f6d5" },
    AUSENTE:   { borderColor: "#c53030", background: "#fed7d7" },
    TARDANZA:  { borderColor: "#744210", background: "#fefcbf" },
  },
  btnGuardar:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
