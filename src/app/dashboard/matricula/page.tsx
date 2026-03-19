"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Estudiante = {
  id: number; codigo: string; nombre: string; apellido: string;
  cedula?: string; activo: boolean;
  tutor?: { nombre: string; apellido: string; codigo: string } | null;
  seccion?: { id: number; nombre: string; codigo: string; curso: { nombre: string } } | null;
};
type Seccion = { id: number; codigo: string; nombre: string; cupos: number; curso: { nombre: string } };

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "SECRETARIA_DOCENTE"];

export default function MatriculaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [secciones, setSecciones]     = useState<Seccion[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [modal, setModal]             = useState<Estudiante | null>(null);
  const [seccionSel, setSeccionSel]   = useState("");
  const [error, setError]             = useState("");
  const [exito, setExito]             = useState("");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [u, s] = await Promise.all([
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/academico/secciones").then(r => r.json()),
    ]);
    setEstudiantes(u.estudiantes || []);
    setSecciones(s.secciones || []);
    setCargando(false);
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

  const asignarSeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch(`/api/matricula/${modal?.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ seccionId: parseInt(seccionSel) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(null);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const filtrados = estudiantes.filter(e =>
    `${e.nombre} ${e.apellido} ${e.cedula || ""} ${e.codigo}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🎓 Matrícula</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Gestión de Matrícula</h1>
            <p style={s.subtitulo}>Asignación de estudiantes a cursos y secciones</p>
          </div>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar estudiante por nombre, cédula o código..."
          style={s.inputBusqueda} />

        {cargando ? <div style={s.vacio}>Cargando...</div> :
          filtrados.length === 0 ? <div style={s.vacio}>No hay estudiantes registrados.</div> : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Código</th>
                  <th style={s.th}>Estudiante</th>
                  <th style={s.th}>Tutor</th>
                  <th style={s.th}>Sección actual</th>
                  <th style={s.th}>Estado</th>
                  <th style={s.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{e.codigo}</code></td>
                    <td style={s.td}>{e.nombre} {e.apellido}</td>
                    <td style={s.td}>{e.tutor ? `${e.tutor.nombre} ${e.tutor.apellido}` : "—"}</td>
                    <td style={s.td}>
                      {(e as any).seccion
                        ? <span style={s.seccionBadge}>{(e as any).seccion.nombre}</span>
                        : <span style={{ color: "#999" }}>Sin asignar</span>}
                    </td>
                    <td style={s.td}><span style={e.activo ? s.activo : s.inactivo}>{e.activo ? "Activo" : "Inactivo"}</span></td>
                    <td style={s.td}>
                      <button onClick={() => { setModal(e); setSeccionSel(""); setError(""); }}
                        style={s.btnAsignar}>
                        📋 Asignar sección
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Asignar Sección</h2>
            <p style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
              Estudiante: <strong>{modal.nombre} {modal.apellido}</strong>
            </p>
            <form onSubmit={asignarSeccion}>
              <label style={s.label}>Sección *</label>
              <select value={seccionSel} onChange={e => setSeccionSel(e.target.value)}
                style={{ ...s.input, marginBottom: "16px" }} required>
                <option value="">Selecciona una sección</option>
                {secciones.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.curso.nombre} — {sec.nombre} (Cupos: {sec.cupos})
                  </option>
                ))}
              </select>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(null)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Asignar</button>
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
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  inputBusqueda:{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:    { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  activo:       { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:     { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  seccionBadge: { background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  codigo:       { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  btnAsignar:   { background: "#EBF3FB", color: "#1F5C99", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  overlay:      { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "450px" },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 12px" },
  label:        { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
