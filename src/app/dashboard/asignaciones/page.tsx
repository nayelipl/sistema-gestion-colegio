"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Asignacion = {
  id: number;
  maestro:    { nombre: string; apellido: string; email: string };
  seccion:    { aula: string; codigo: string; curso: { grado: string } };
  asignatura: { nombre: string; codigo: string };
};
type Empleado   = { id: number; nombre: string; apellido: string; email: string };
type Seccion    = { id: number; aula: string; codigo: string; curso: { grado: string } };
type Asignatura = { id: number; nombre: string; codigo: string };

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECCION_ACADEMICA"];

export default function AsignacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [empleados, setEmpleados]       = useState<Empleado[]>([]);
  const [secciones, setSecciones]       = useState<Seccion[]>([]);
  const [asignaturas, setAsignaturas]   = useState<Asignatura[]>([]);
  const [form, setForm]     = useState<any>({});
  const [modal, setModal]   = useState(false);
  const [error, setError]   = useState("");
  const [exito, setExito]   = useState("");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [a, u, s, as] = await Promise.all([
      fetch("/api/asignaciones").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/academico/secciones").then(r => r.json()),
      fetch("/api/academico/asignaturas").then(r => r.json()),
    ]);
    setAsignaciones(a.asignaciones || []);
    // Solo empleados que sean maestros
    setEmpleados(u.empleados?.filter((e: any) => e.rol === "MAESTRO") || []);
    setSecciones(s.secciones || []);
    setAsignaturas(as.asignaturas || []);
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

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/asignaciones", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    setForm({});
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    await fetch(`/api/asignaciones/${id}`, { method: "DELETE" });
    cargarDatos();
  };

  const filtradas = asignaciones.filter(a =>
    `${a.maestro.nombre} ${a.maestro.apellido} ${a.seccion.aula} ${a.asignatura.nombre}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📋 Asignaciones de Maestros</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Asignaciones de Maestros</h1>
            <p style={s.subtitulo}>Asigna maestros a secciones y asignaturas</p>
          </div>
          <button onClick={() => { setModal(true); setForm({}); setError(""); }}
            style={s.btnNuevo}>
            + Nueva asignación
          </button>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por maestro, sección o asignatura..."
          style={s.inputBusqueda} />

        {cargando ? <div style={s.vacio}>Cargando...</div> :
          filtradas.length === 0 ? <div style={s.vacio}>No hay asignaciones registradas.</div> : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead><tr style={s.thead}>
                <th style={s.th}>Maestro</th>
                <th style={s.th}>Sección</th>
                <th style={s.th}>Asignatura</th>
                <th style={s.th}>Acciones</th>
              </tr></thead>
              <tbody>
                {filtradas.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}>{a.maestro.nombre} {a.maestro.apellido}</td>
                    <td style={s.td}><span style={s.seccionBadge}>{a.seccion.aula}</span></td>
                    <td style={s.td}>{a.asignatura.nombre}</td>
                    <td style={s.td}>
                      <button onClick={() => eliminar(a.id)} style={s.btnEliminar}>
                        🗑️ Eliminar
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
            <h2 style={s.modalTitulo}>Nueva Asignación</h2>
            <form onSubmit={guardar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={s.label}>Maestro *</label>
                  <select name="maestroId" value={form.maestroId || ""} onChange={c} style={s.input} required>
                    <option value="">Selecciona maestro</option>
                    {empleados.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Sección *</label>
                  <select name="seccionId" value={form.seccionId || ""} onChange={c} style={s.input} required>
                    <option value="">Selecciona sección</option>
                    {secciones.map(sec => (
                      <option key={sec.id} value={sec.id}>
                        {sec.curso.grado} — {sec.aula} ({sec.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Asignatura *</label>
                  <select name="asignaturaId" value={form.asignaturaId || ""} onChange={c} style={s.input} required>
                    <option value="">Selecciona asignatura</option>
                    {asignaturas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
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
  btnNuevo:     { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  inputBusqueda:{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:    { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  seccionBadge: { background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  btnEliminar:  { background: "#fff5f5", color: "#c53030", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  overlay:      { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "480px" },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  label:        { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
