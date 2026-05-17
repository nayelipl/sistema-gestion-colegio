"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "cursos" | "secciones" | "asignaturas";
type Curso     = { id: number; codigo: string; grado: string; nivel: string; activo: boolean; secciones: Seccion[] };
type Seccion   = { id: number; codigo: string; aula: string; cupos: number; activo: boolean; curso?: Curso; maestroEncargado?: { id: number; nombre: string; apellido: string } };
type Asignatura = { id: number; codigo: string; nombre: string; activo: boolean };
type Empleado  = { id: number; nombre: string; apellido: string; rol: string };

const NIVELES = [
  "Nivel Inicial",
  "Nivel Primario — Primer Ciclo",
  "Nivel Primario — Segundo Ciclo",
  "Nivel Secundario — Primer Ciclo",
  "Nivel Secundario — Segundo Ciclo",
];

const CURSOS_PREDEFINIDOS = [
  { codigo: "1-0-0-0", grado: "Párvulo",              nivel: "Nivel Inicial" },
  { codigo: "1-0-0",   grado: "Pre Kínder",            nivel: "Nivel Inicial" },
  { codigo: "1-0",     grado: "Kínder",                nivel: "Nivel Inicial" },
  { codigo: "1-1",     grado: "Pre Primero",           nivel: "Nivel Inicial" },
  { codigo: "2-1",     grado: "Primero Primaria",      nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-2",     grado: "Segundo Primaria",      nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-3",     grado: "Tercero Primaria",      nivel: "Nivel Primario — Primer Ciclo" },
  { codigo: "2-4",     grado: "Cuarto Primaria",       nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "2-5",     grado: "Quinto Primaria",       nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "2-6",     grado: "Sexto Primaria",        nivel: "Nivel Primario — Segundo Ciclo" },
  { codigo: "3-1",     grado: "Primero Secundaria",    nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-2",     grado: "Segundo Secundaria",    nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-3",     grado: "Tercero Secundaria",    nivel: "Nivel Secundario — Primer Ciclo" },
  { codigo: "3-4",     grado: "Cuarto Secundaria",     nivel: "Nivel Secundario — Segundo Ciclo" },
  { codigo: "3-5",     grado: "Quinto Secundaria",     nivel: "Nivel Secundario — Segundo Ciclo" },
  { codigo: "3-6",     grado: "Sexto Secundaria",      nivel: "Nivel Secundario — Segundo Ciclo" },
];

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];

export default function AcademicoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  const [tab,        setTab]        = useState<Tab>("cursos");
  const [cursos,     setCursos]     = useState<Curso[]>([]);
  const [secciones,  setSecciones]  = useState<Seccion[]>([]);
  const [asignaturas,setAsignaturas]= useState<Asignatura[]>([]);
  const [empleados,  setEmpleados]  = useState<Empleado[]>([]);
  const [cargando,   setCargando]   = useState(true);

  // Modal crear
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState<any>({});

  // Modal editar
  const [modalEdit,  setModalEdit]  = useState(false);
  const [formEdit,   setFormEdit]   = useState<any>({});
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    fetch("/api/usuarios/empleados")
      .then(r => r.json())
      .then(d => setEmpleados(Array.isArray(d) ? d : d.empleados || []));
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [c, sec, a] = await Promise.all([
      fetch("/api/academico/cursos").then(r => r.json()),
      fetch("/api/academico/secciones").then(r => r.json()),
      fetch("/api/academico/asignaturas").then(r => r.json()),
    ]);
    setCursos(c.cursos || []);
    setSecciones(sec.secciones || []);
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

  const onChange = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };
  const onChangeEdit = (e: any) => { setFormEdit({ ...formEdit, [e.target.name]: e.target.value }); setError(""); };

  // ── CREAR ──────────────────────────────────────────────────────────────────
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const url = tab === "cursos" ? "/api/academico/cursos"
              : tab === "secciones" ? "/api/academico/secciones"
              : "/api/academico/asignaturas";
    const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false); setForm({});
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  // ── ABRIR EDITAR ───────────────────────────────────────────────────────────
  const abrirEditar = (item: any) => {
    setEditandoId(item.id);
    setError("");
    if (tab === "secciones") {
      setFormEdit({
        codigo:            item.codigo,
        aula:              item.aula,
        cursoId:           item.curso?.id ?? "",
        maestroEncargadoId: item.maestroEncargado?.id ?? "",
        cupos:             item.cupos,
      });
    } else if (tab === "asignaturas") {
      setFormEdit({ codigo: item.codigo, nombre: item.nombre });
    } else {
      setFormEdit({ codigo: item.codigo, grado: item.grado, nivel: item.nivel });
    }
    setModalEdit(true);
  };

  // ── GUARDAR EDICIÓN ────────────────────────────────────────────────────────
  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const url = tab === "cursos"      ? `/api/academico/cursos/${editandoId}`
              : tab === "secciones"   ? `/api/academico/secciones/${editandoId}`
              : `/api/academico/asignaturas/${editandoId}`;
    const res  = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formEdit) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModalEdit(false); setEditandoId(null);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  // ── ELIMINAR ───────────────────────────────────────────────────────────────
  const eliminar = async (id: number) => {
    const nombre = tab === "cursos" ? "curso" : tab === "secciones" ? "sección" : "asignatura";
    if (!confirm(`¿Eliminar esta ${nombre}? Esta acción no se puede deshacer.`)) return;
    const url = tab === "cursos"      ? `/api/academico/cursos/${id}`
              : tab === "secciones"   ? `/api/academico/secciones/${id}`
              : `/api/academico/asignaturas/${id}`;
    const res  = await fetch(url, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setExito(data.mensaje);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  // ── CAMBIAR ESTADO SECCIÓN (solo DIRECCION_ACADEMICA) ─────────────────────
  const toggleEstadoSeccion = async (sec: Seccion) => {
    const accion = sec.activo ? "desactivar" : "activar";
    if (!confirm(`¿Deseas ${accion} la sección ${sec.aula}?`)) return;
    const res  = await fetch(`/api/academico/secciones/${sec.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ activo: !sec.activo }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setExito(data.mensaje);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const cargarCursosPredefinidos = async () => {
    let creados = 0;
    for (const curso of CURSOS_PREDEFINIDOS) {
      const res = await fetch("/api/academico/cursos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(curso),
      });
      if (res.ok) creados++;
    }
    setExito(`${creados} cursos cargados.`);
    cargarDatos();
    setTimeout(() => setExito(""), 4000);
  };

  const esDirAcademica = rol === "DIRECCION_ACADEMICA" || rol === "ADMINISTRADOR";

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
          <button onClick={() => { setModal(true); setForm({}); setError(""); }} style={s.btnNuevo}>
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
                    <th style={s.th}>Código</th><th style={s.th}>Grado</th>
                    <th style={s.th}>Nivel</th><th style={s.th}>Secciones</th>
                    <th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                  </>}
                  {tab === "secciones" && <>
                    <th style={s.th}>Código</th><th style={s.th}>Aula</th>
                    <th style={s.th}>Grado</th><th style={s.th}>Maestro Encargado</th>
                    <th style={s.th}>Cupos</th><th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </>}
                  {tab === "asignaturas" && <>
                    <th style={s.th}>Código</th><th style={s.th}>Nombre</th>
                    <th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {/* ── CURSOS ── */}
                {tab === "cursos" && cursos.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{c.codigo}</code></td>
                    <td style={s.td}>{c.grado}</td>
                    <td style={s.td}><span style={s.nivelBadge}>{c.nivel}</span></td>
                    <td style={s.td}>{c.secciones?.length ?? 0} sección(es)</td>
                    <td style={s.td}><span style={c.activo ? s.activo : s.inactivo}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <button onClick={() => abrirEditar(c)} style={s.btnEditar}>✏️ Editar</button>
                        <button onClick={() => eliminar(c.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* ── SECCIONES ── */}
                {tab === "secciones" && secciones.map((sec, i) => (
                  <tr key={sec.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{sec.codigo}</code></td>
                    <td style={s.td}>{sec.aula}</td>
                    <td style={s.td}>{sec.curso?.grado ?? "—"}</td>
                    <td style={s.td}>{sec.maestroEncargado ? `${sec.maestroEncargado.nombre} ${sec.maestroEncargado.apellido}` : "—"}</td>
                    <td style={s.td}>{sec.cupos}</td>
                    <td style={s.td}><span style={sec.activo ? s.activo : s.inactivo}>{sec.activo ? "Activo" : "Inactivo"}</span></td>
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <button onClick={() => abrirEditar(sec)} style={s.btnEditar}>✏️ Editar</button>
                        {esDirAcademica && (
                          <button onClick={() => toggleEstadoSeccion(sec)}
                            style={sec.activo ? s.btnDesactivar : s.btnActivar}>
                            {sec.activo ? "⏸ Desactivar" : "▶ Activar"}
                          </button>
                        )}
                        <button onClick={() => eliminar(sec.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* ── ASIGNATURAS ── */}
                {tab === "asignaturas" && asignaturas.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><code style={s.codigo}>{a.codigo}</code></td>
                    <td style={s.td}>{a.nombre}</td>
                    <td style={s.td}><span style={a.activo ? s.activo : s.inactivo}>{a.activo ? "Activo" : "Inactivo"}</span></td>
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <button onClick={() => abrirEditar(a)} style={s.btnEditar}>✏️ Editar</button>
                        <button onClick={() => eliminar(a.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {((tab === "cursos" && cursos.length === 0) ||
                  (tab === "secciones" && secciones.length === 0) ||
                  (tab === "asignaturas" && asignaturas.length === 0)) && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                    No hay {tab} registrados aún.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal CREAR ─────────────────────────────────────────────────────── */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>
              Nuevo {tab === "cursos" ? "Curso" : tab === "secciones" ? "Sección" : "Asignatura"}
            </h2>
            <form onSubmit={guardar}>
              <div style={s.formGrid}>
                {tab === "cursos" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <select name="codigo" value={form.codigo || ""} onChange={onChange} style={s.input}>
                      <option value="">Selecciona código</option>
                      {CURSOS_PREDEFINIDOS.map(cp => (
                        <option key={cp.codigo} value={cp.codigo}>{cp.codigo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <input name="grado" value={form.grado || ""} onChange={onChange} style={s.input} required placeholder="Ej.: Primero" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Nivel *</label>
                    <select name="nivel" value={form.nivel || ""} onChange={onChange} style={s.input} required>
                      <option value="">Selecciona nivel</option>
                      {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </>}
                {tab === "secciones" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <input name="codigo" value={form.codigo || ""} onChange={onChange} style={s.input} required placeholder="Ej.: 2-1 A" />
                  </div>
                  <div>
                    <label style={s.label}>Aula *</label>
                    <input name="aula" value={form.aula || ""} onChange={onChange} style={s.input} required placeholder="Ej.: Primero A" />
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <select name="cursoId" value={form.cursoId || ""} onChange={onChange} style={s.input} required>
                      <option value="">Selecciona grado</option>
                      {cursos.map(cur => <option key={cur.id} value={cur.id}>{cur.grado} ({cur.codigo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Maestro Encargado</label>
                    <select name="maestroEncargadoId" value={form.maestroEncargadoId || ""} onChange={onChange} style={s.input}>
                      <option value="">Sin asignar</option>
                      {empleados.filter(e => e.rol === "MAESTRO").map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Cupos</label>
                    <input type="number" name="cupos" value={form.cupos || "30"} onChange={onChange} style={s.input} min="1" />
                  </div>
                </>}
                {tab === "asignaturas" && <>
                  <div>
                    <label style={s.label}>Código * (ej: MATE01)</label>
                    <input name="codigo" value={form.codigo || ""} onChange={onChange} style={s.input} required placeholder="MATE01" />
                  </div>
                  <div>
                    <label style={s.label}>Nombre *</label>
                    <input name="nombre" value={form.nombre || ""} onChange={onChange} style={s.input} required placeholder="Matemáticas" />
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

      {/* ── Modal EDITAR ────────────────────────────────────────────────────── */}
      {modalEdit && editandoId !== null && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>
              Editar {tab === "cursos" ? "Curso" : tab === "secciones" ? "Sección" : "Asignatura"}
            </h2>
            <form onSubmit={guardarEdicion}>
              <div style={s.formGrid}>
                {tab === "cursos" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <input name="codigo" value={formEdit.codigo || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <input name="grado" value={formEdit.grado || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Nivel *</label>
                    <select name="nivel" value={formEdit.nivel || ""} onChange={onChangeEdit} style={s.input} required>
                      <option value="">Selecciona nivel</option>
                      {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </>}
                {tab === "secciones" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <input name="codigo" value={formEdit.codigo || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Aula *</label>
                    <input name="aula" value={formEdit.aula || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Grado *</label>
                    <select name="cursoId" value={formEdit.cursoId || ""} onChange={onChangeEdit} style={s.input} required>
                      <option value="">Selecciona grado</option>
                      {cursos.map(cur => <option key={cur.id} value={cur.id}>{cur.grado} ({cur.codigo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Maestro Encargado</label>
                    <select name="maestroEncargadoId" value={formEdit.maestroEncargadoId || ""} onChange={onChangeEdit} style={s.input}>
                      <option value="">Sin asignar</option>
                      {empleados.filter(e => e.rol === "MAESTRO").map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Cupos</label>
                    <input type="number" name="cupos" value={formEdit.cupos || "30"} onChange={onChangeEdit} style={s.input} min="1" />
                  </div>
                </>}
                {tab === "asignaturas" && <>
                  <div>
                    <label style={s.label}>Código *</label>
                    <input name="codigo" value={formEdit.codigo || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Nombre *</label>
                    <input name="nombre" value={formEdit.nombre || ""} onChange={onChangeEdit} style={s.input} required />
                  </div>
                </>}
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => { setModalEdit(false); setEditandoId(null); }} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Guardar cambios</button>
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
  enlace:       { color: "#2C1810", fontWeight: "bold" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:      { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navUser:      { fontSize: "14px" },
  contenido:    { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  btnNuevo:     { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs:         { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:          { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600" as any, color: "#666" },
  tabActivo:    { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  infoBox:      { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#744210" },
  btnSecundario:{ background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:    { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  acciones:     { display: "flex", gap: "6px", flexWrap: "wrap" as any },
  btnEditar:    { background: "#ebf8ff", color: "#2b6cb0", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnEliminar:  { background: "#fff5f5", color: "#c53030", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnActivar:   { background: "#f0fff4", color: "#276749", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnDesactivar:{ background: "#fffbeb", color: "#744210", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  activo:       { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:     { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  nivelBadge:   { background: "#EBF3FB", color: "#2C1810", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  codigo:       { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  overlay:      { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" as any },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 20px" },
  formGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
  label:        { fontSize: "12px", fontWeight: "600" as any, color: "#333", display: "block", marginBottom: "4px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
