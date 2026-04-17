"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Estudiante  = { id: number; codigo: string; nombre: string; apellido: string };
type Asignacion  = {
  id: number;
  seccion:    { aula: string; curso: { grado: string } };
  asignatura: { id: number; nombre: string; codigo: string };
};
type Calificacion = {
  id: number; periodo: string; nota: number; estado: string;
  estudiante: { nombre: string; apellido: string; codigo: string };
  asignatura: { nombre: string };
};

const PERIODOS = ["P1", "P2", "P3", "P4"];

export default function MisCursosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]                   = useState<"asistencia" | "calificaciones">("asistencia");
  const [estudiantes, setEstudiantes]   = useState<Estudiante[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [registros, setRegistros]       = useState<Record<number, string>>({});
  const [fecha, setFecha]               = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm]                 = useState<any>({});
  const [modal, setModal]               = useState(false);
  const [error, setError]               = useState("");
  const [exito, setExito]               = useState("");
  const [cargando, setCargando]         = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/maestro/mis-estudiantes").then(r => r.json()),
      fetch("/api/calificaciones").then(r => r.json()),
    ]).then(([d, c]) => {
      const ests = d.estudiantes || [];
      setEstudiantes(ests);
      setAsignaciones(d.asignaciones || []);
      setCalificaciones(c.calificaciones || []);
      const init: Record<number, string> = {};
      ests.forEach((e: Estudiante) => { init[e.id] = "PRESENTE"; });
      setRegistros(init);
      setCargando(false);
    });
  }, [status]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "MAESTRO" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const guardarAsistencia = async () => {
    setError(""); setExito("");
    const data = Object.entries(registros).map(([id, estado]) => ({
      estudianteId: parseInt(id), estado,
    }));
    const res = await fetch("/api/asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registros: data, fecha }),
    });
    const result = await res.json();
    if (!res.ok) { setError(result.error); return; }
    setExito(result.mensaje);
    setTimeout(() => setExito(""), 3000);
  };

  const guardarCalificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res = await fetch("/api/calificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    setForm({});
    fetch("/api/calificaciones").then(r => r.json()).then(d => setCalificaciones(d.calificaciones || []));
    setTimeout(() => setExito(""), 3000);
  };

  // Asignaturas del maestro para el formulario de calificaciones
    const misAsignaturas = asignaciones && asignaciones.length > 0 
      ? asignaciones.map(a => a.asignatura)
          .filter((a, i, arr) => a && arr.findIndex(x => x?.id === a?.id) === i)
      : [];

    // Si no hay asignaciones, mostrar mensaje
    if (asignaciones.length === 0) {
      return (
        <main style={s.main}>
          <nav style={s.nav}>
            <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
            <span style={s.navTitle}>📚 Mis Cursos</span>
            <span style={s.navUser}>👤 {session?.user?.name}</span>
          </nav>
          <div style={s.contenido}>
            <div style={s.card}>
              <p>No tienes cursos asignados todavía. Contacta al administrador.</p>
            </div>
          </div>
        </main>
      );
    }

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🏫 Mis Cursos</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Mis Cursos</h1>
            <p style={s.subtitulo}>Gestión de asistencia y calificaciones de mis estudiantes asignados</p>
          </div>
        </div>

        {/* Resumen de secciones asignadas */}
        <div style={s.resumenGrid}>
          {asignaciones.length === 0 ? (
            <p>No tienes cursos asignados.</p>
          ) : (
            asignaciones.map((a, i) => (
              <div key={a.id} style={s.resumenCard}>
                <p style={s.resumenLabel}>{a.asignatura.nombre}</p>
                <p style={s.resumenValor}>{a.seccion.aula}</p>
                <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
                  {a.seccion.curso.grado}
                </p>
              </div>
            ))
          )}
        </div>

        <div style={s.tabs}>
          <button onClick={() => setTab("asistencia")}
            style={{ ...s.tab, ...(tab === "asistencia" ? s.tabActivo : {}) }}>
            📋 Pase de Lista
          </button>
          <button onClick={() => setTab("calificaciones")}
            style={{ ...s.tab, ...(tab === "calificaciones" ? s.tabActivo : {}) }}>
            📝 Calificaciones
          </button>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>{error}</div>}

        {tab === "asistencia" && (
          <div style={s.card}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={s.label}>Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  style={{ ...s.input, width: "180px" }} />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={s.badgePresente}>✅ {Object.values(registros).filter(e => e === "PRESENTE").length} presentes</span>
                <span style={s.badgeAusente}>❌ {Object.values(registros).filter(e => e === "AUSENTE").length} ausentes</span>
                <span style={s.badgeTardanza}>⏰ {Object.values(registros).filter(e => e === "TARDANZA").length} tardanzas</span>
              </div>
            </div>

            {cargando ? <div style={s.vacio}>Cargando...</div> :
              estudiantes.length === 0 ? (
                <div style={s.vacio}>
                  No tienes estudiantes asignados aún. Contacta al administrador para que te asigne secciones.
                </div>
              ) : (
              <>
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead><tr style={s.thead}>
                      <th style={s.th}>Código</th>
                      <th style={s.th}>Estudiante</th>
                      <th style={s.th}>Estado</th>
                    </tr></thead>
                    <tbody>
                      {estudiantes.map((e, i) => (
                        <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                          <td style={s.td}><code style={s.codigo}>{e.codigo}</code></td>
                          <td style={s.td}>{e.nombre} {e.apellido}</td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {["PRESENTE", "AUSENTE", "TARDANZA"].map(est => (
                                <button key={est}
                                  onClick={() => setRegistros({ ...registros, [e.id]: est })}
                                  style={{
                                    padding: "6px 10px", fontSize: "14px", cursor: "pointer",
                                    border: `2px solid ${registros[e.id] === est ? "#1F5C99" : "#ddd"}`,
                                    borderRadius: "6px",
                                    background: registros[e.id] === est ? "#EBF3FB" : "#fff",
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
                  <button onClick={guardarAsistencia} style={s.btnGuardar}>
                    💾 Guardar asistencia
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "calificaciones" && (
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button onClick={() => { setModal(true); setForm({}); setError(""); }}
                style={s.btnGuardar}>
                + Registrar calificación
              </button>
            </div>
            {calificaciones.length === 0 ? (
              <div style={s.vacio}>No hay calificaciones registradas.</div>
            ) : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Estudiante</th>
                    <th style={s.th}>Asignatura</th>
                    <th style={s.th}>Período</th>
                    <th style={s.th}>Nota</th>
                    <th style={s.th}>Estado</th>
                  </tr></thead>
                  <tbody>
                    {calificaciones.map((cal, i) => (
                      <tr key={cal.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}>{cal.estudiante.nombre} {cal.estudiante.apellido}</td>
                        <td style={s.td}>{cal.asignatura.nombre}</td>
                        <td style={s.td}><span style={s.periodoBadge}>{cal.periodo}</span></td>
                        <td style={s.td}><span style={cal.nota >= 70 ? s.aprobado : s.reprobado}>{cal.nota}</span></td>
                        <td style={s.td}><span style={cal.estado === "PUBLICADA" ? s.aprobado : s.pendiente}>{cal.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Registrar Calificación</h2>
            <form onSubmit={guardarCalificacion}>
              <div style={s.formGrid}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Estudiante *</label>
                  <select name="estudianteId" value={form.estudianteId || ""} onChange={c}
                    style={s.input} required>
                    <option value="">Selecciona estudiante</option>
                    {estudiantes.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Asignatura *</label>
                  <select name="asignaturaId" value={form.asignaturaId || ""} onChange={c}
                    style={s.input} required>
                    <option value="">Selecciona asignatura</option>
                    {misAsignaturas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Período *</label>
                  <select name="periodo" value={form.periodo || ""} onChange={c}
                    style={s.input} required>
                    <option value="">Selecciona período</option>
                    {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Nota * (0-100)</label>
                  <input type="number" name="nota" value={form.nota || ""} onChange={c}
                    style={s.input} required min="0" max="100" />
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:    { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:       { color: "#1F5C99", fontWeight: "bold" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:      { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navUser:      { fontSize: "14px" },
  contenido:    { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:       { marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  resumenGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" },
  resumenCard:  { background: "#fff", borderRadius: "10px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderTop: "3px solid #1F5C99" },
  resumenLabel: { fontSize: "12px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  resumenValor: { fontSize: "13px", color: "#333", margin: "0 0 2px", fontWeight: "600" },
  tabs:         { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:          { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:    { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  card:         { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888" },
  tablaWrap:    { overflowX: "auto" as any },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  codigo:       { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  badgePresente:{ background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  badgeAusente: { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  badgeTardanza:{ background: "#fefcbf", color: "#744210", borderRadius: "12px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold" },
  periodoBadge: { background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  aprobado:     { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  reprobado:    { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  pendiente:    { background: "#fefcbf", color: "#744210", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  label:        { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  overlay:      { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "500px" },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  formGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
