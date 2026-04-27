"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "cursos" | "secciones" | "asignaturas";
type Curso = { id: number; codigo: string; grado: string; nivel: string; activo: boolean; secciones: Seccion[] };
type Seccion = {
  id: number;
  codigo: string;
  aula: string;
  cupos: number;
  maestroEncargado?: { id: number; nombre: string; apellido: string };
  activo: boolean;
  curso?: Curso
};
type Asignatura = { id: number; codigo: string; nombre: string; activo: boolean };
type Empleado = {  id: number;  nombre: string;  apellido: string;  rol: string; };

const NIVELES = [
  "Nivel Inicial",
  "Nivel Primario — Primer Ciclo",
  "Nivel Primario — Segundo Ciclo",
  "Nivel Secundario — Primer Ciclo",
  "Nivel Secundario — Segundo Ciclo",
];

const CURSOS_PREDEFINIDOS = [
  { codigo: "1-0-0-0", grado: "Párvulo", nivel: "Nivel Inicial" },
  { codigo: "1-0-0",   grado: "Pre Kínder", nivel: "Nivel Inicial" },
  { codigo: "1-0",     grado: "Kínder", nivel: "Nivel Inicial" },
  { codigo: "1-1",     grado: "Pre Primero", nivel: "Nivel Inicial" },
  { codigo: "2-1",     grado: "Primero Primaria", nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-2",     grado: "Segundo Primaria", nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-3",     grado: "Tercero Primaria", nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-4",     grado: "Cuarto Primaria", nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "2-5",     grado: "Quinto Primaria", nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "2-6",     grado: "Sexto Primaria", nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "3-1",     grado: "Primero Secundaria", nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-2",     grado: "Segundo Secundaria", nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-3",     grado: "Tercero Secundaria", nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-4",     grado: "Cuarto Secundaria", nivel: "Nivel Secundario — Segundo Ciclo" },
  { codigo: "3-5",     grado: "Quinto Secundaria", nivel: "Nivel Secundario — Segundo Ciclo" },
  { codigo: "3-6",     grado: "Sexto Secundaria", nivel: "Nivel Secundario — Segundo Ciclo" },
];

const ROLES_PERMITIDOS = [
  "ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"
];

export default function AcademicoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("cursos");
  const [cursos, setCursos]         = useState<Curso[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [secciones, setSecciones]   = useState<Seccion[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState<any>({});
  const [error, setError]           = useState("");
  const [exito, setExito]           = useState("");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
  fetch("/api/usuarios/empleados").then(r => r.json()).then(d => setEmpleados(d));
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [c, s, a] = await Promise.all([
      fetch("/api/academico/cursos").then(r => r.json()),
      fetch("/api/academico/secciones").then(r => r.json()),
      fetch("/api/academico/asignaturas").then(r => r.json()),
    ]);
    setCursos(c.cursos || []);
    setSecciones(s.secciones || []);
    setAsignaturas(a.asignaturas || []);
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
    const url = tab === "cursos"
      ? "/api/academico/cursos"
      : tab === "secciones"
      ? "/api/academico/secciones"
      : "/api/academico/asignaturas";

    const res  = await fetch(url, {
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

  const cargarCursosPredefinidos = async () => {
    let creados = 0;
    for (const curso of CURSOS_PREDEFINIDOS) {
      const res = await fetch("/api/academico/cursos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(curso),
      });
      if (res.ok) creados++;
    }
    setExito(`${creados} cursos cargados según nomenclatura del plan.`);
    cargarDatos();
    setTimeout(() => setExito(""), 4000);
  };

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📚 Módulo Académico</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Módulo Académico</h1>
            <p style={s.subtitulo}>Gestión de cursos, secciones y asignaturas</p>
          </div>
          <button onClick={() => { setModal(true); setForm({}); setError(""); }}
            style={s.btnNuevo}>
            + Nuevo {tab === "cursos" ? "curso" : tab === "secciones" ? "sección" : "asignatura"}
          </button>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}

        <div style={s.tabs}>
          {([
            { key: "cursos",      label: `🏫 Cursos (${cursos.length})` },
            { key: "secciones",   label: `📋 Secciones (${secciones.length})` },
            { key: "asignaturas", label: `📖 Asignaturas (${asignaturas.length})` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...s.tab, ...(tab === t.key ? s.tabActivo : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Botón cargar cursos predefinidos */}
        {tab === "cursos" && cursos.length === 0 && (
          <div style={s.infoBox}>
            <p>¿Deseas cargar los cursos según la nomenclatura del plan de proyecto?</p>
            <button onClick={cargarCursosPredefinidos} style={s.btnSecundario}>
              📥 Cargar cursos predefinidos
            </button>
          </div>
        )}

        {cargando ? <div style={s.vacio}>Cargando...</div> : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.thead}>
                  {tab === "cursos" && <>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Grado</th>
                    <th style={s.th}>Nivel</th>
                    <th style={s.th}>Secciones</th>
                    <th style={s.th}>Estado</th>
                  </>}
                  {tab === "secciones" && <>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Aula</th>
                    <th style={s.th}>Grado</th>
                    <th style={s.th}>Maestro Encargado</th>
                    <th style={s.th}>Cupos</th>
                    <th style={s.th}>Estado</th>
                  </>}
                  {tab === "asignaturas" && <>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Estado</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {tab === "cursos" && cursos.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{c.codigo}</code></td>
                    <td style={s.td}>{c.grado}</td>
                    <td style={s.td}><span style={s.nivelBadge}>{c.nivel}</span></td>
                    <td style={s.td}>{c.secciones?.length ?? 0} sección(es)</td>
                    <td style={s.td}><span style={c.activo ? s.activo : s.inactivo}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                  </tr>
                ))}
                {tab === "secciones" && secciones.map((sec, i) => (
                  <tr key={sec.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{sec.codigo}</code></td>
                    <td style={s.td}>{sec.aula}</td>
                    <td style={s.td}>{sec.curso?.grado ?? "—"}</td>
                    <td style={s.td}>{sec.maestroEncargado?.nombre ?? "—"} {sec.maestroEncargado?.apellido ?? "—"}</td>
                    <td style={s.td}>{sec.cupos}</td>
                    <td style={s.td}><span style={sec.activo ? s.activo : s.inactivo}>{sec.activo ? "Activo" : "Inactivo"}</span></td>
                  </tr>
                ))}
                {tab === "asignaturas" && asignaturas.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{a.codigo}</code></td>
                    <td style={s.td}>{a.nombre}</td>
                    <td style={s.td}><span style={a.activo ? s.activo : s.inactivo}>{a.activo ? "Activo" : "Inactivo"}</span></td>
                  </tr>
                ))}
                {((tab === "cursos" && cursos.length === 0) ||
                  (tab === "secciones" && secciones.length === 0) ||
                  (tab === "asignaturas" && asignaturas.length === 0)) && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                    No hay {tab} registrados aún.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>
              Nuevo {tab === "cursos" ? "curso" : tab === "secciones" ? "sección" : "asignatura"}
            </h2>
            <form onSubmit={guardar}>
              <div style={s.formGrid}>
                {tab === "cursos" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <select name="codigo" value={form.codigo || ""} onChange={c} style={s.input}>
                      <option value="">Selecciona o escribe</option>
                      {CURSOS_PREDEFINIDOS.map(cp => (
                        <option key={cp.codigo} value={cp.codigo}
                          onClick={() => setForm({ ...form, codigo: cp.codigo, grado: cp.grado, nivel: cp.nivel })}>
                          {cp.codigo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <input name="grado" value={form.grado || ""} onChange={c} style={s.input} required placeholder="Ej.: Primero" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Nivel *</label>
                    <select name="nivel" value={form.nivel || ""} onChange={c} style={s.input} required>
                      <option value="">Selecciona nivel</option>
                      {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </>}

                {tab === "secciones" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <input name="codigo" value={form.codigo || ""} onChange={c} style={s.input} required placeholder="Ej.: 2-1 A" />
                  </div>
                  <div>
                    <label style={s.label}>Aula *</label>
                    <input name="aula" value={form.aula || ""} onChange={c} style={s.input} required placeholder="Ej.: Primero Primaria A" />
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <select name="cursoId" value={form.cursoId || ""} onChange={c} style={s.input} required>
                      <option value="">Selecciona el grado</option>
                      {cursos.map(cur => (
                        <option key={cur.id} value={cur.id}>{cur.grado} ({cur.codigo})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Maestro Encargado (opcional)</label>
                    <select name="maestroEncargadoId" value={form.maestroEncargadoId || ""} onChange={c} style={s.input}>
                      <option value="">Sin asignar</option>
                      {empleados.filter(emp => emp.rol === "MAESTRO").map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Cupos</label>
                    <input type="number" name="cupos" value={form.cupos || "30"} onChange={c} style={s.input} min="1" />
                  </div>
                </>}

                {tab === "asignaturas" && <>
                  <div>
                    <label style={s.label}>Código * (ej: MATE01)</label>
                    <input name="codigo" value={form.codigo || ""} onChange={c} style={s.input} required placeholder="MATE01" />
                  </div>
                  <div>
                    <label style={s.label}>Nombre *</label>
                    <input name="nombre" value={form.nombre || ""} onChange={c} style={s.input} required placeholder="Matemáticas" />
                  </div>
                </>}
              </div>

              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:      { color: "#2C1810", fontWeight: "bold" },
  main:        { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:         { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:     { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:    { fontWeight: "bold", fontSize: "16px" },
  navUser:     { fontSize: "14px" },
  contenido:   { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", margin: 0 },
  btnNuevo:    { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg:    { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs:        { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:         { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:   { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  infoBox:     { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#744210" },
  btnSecundario:{ background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  vacio:       { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:   { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:       { width: "100%", borderCollapse: "collapse" as any },
  thead:       { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:          { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:          { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  activo:      { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:    { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  nivelBadge:  { background: "#EBF3FB", color: "#2C1810", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  codigo:      { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  overlay:     { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:   { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" as any },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 20px" },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
  label:       { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:       { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:    { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones:{ display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar: { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:  { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
