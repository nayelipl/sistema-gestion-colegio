"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const PERIODOS = ["P1", "P2", "P3", "P4"];
const ROLES_VER = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE", "MAESTRO"];
const ROLES_REGISTRAR = ["ADMINISTRADOR", "SECRETARIA_DOCENTE", "MAESTRO"];
const ROLES_PUBLICAR  = ["ADMINISTRADOR", "SECRETARIA_DOCENTE"];

type Seccion    = { id: number; codigo: string; aula: string; curso: { grado: string } };
type Asignatura = { id: number; codigo: string; nombre: string };
type Estudiante = { id: number; codigo: string; nombre: string; apellido: string };
type Calificacion = {
  id: number; periodo: string; notaFinal: number; condicion: string; publicado: boolean;
  prueba1: number; prueba2: number; prueba3: number; prueba4: number; notaPruebas: number;
  practica1: number; practica2: number; notaPracticas: number;
  trabajoFinal: number; asistencia: number;
  estudiante: { nombre: string; apellido: string; codigo: string };
  asignatura:  { nombre: string; codigo: string };
  seccion:     { aula: string; curso: { grado: string } };
};

export default function CalificacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [secciones, setSecciones]       = useState<Seccion[]>([]);
  const [asignaturas, setAsignaturas]   = useState<Asignatura[]>([]);
  const [estudiantes, setEstudiantes]   = useState<Estudiante[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [seccionId, setSeccionId]       = useState("");
  const [asignaturaId, setAsignaturaId] = useState("");
  const [periodo, setPeriodo]           = useState("P1");
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState<any>({});
  const [error, setError]               = useState("");
  const [exito, setExito]               = useState("");
  const [cargando, setCargando]         = useState(true);

  const rol   = (session?.user as any)?.role ?? "";
  const email = session?.user?.email ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/academico/secciones").then(r => r.json()),
      fetch("/api/academico/asignaturas").then(r => r.json()),
    ]).then(([s, a]) => {
      setSecciones(s.secciones || []);
      setAsignaturas(a.asignaturas || []);
      setCargando(false);
    });
  }, [status]);

  useEffect(() => {
    if (!seccionId) { setEstudiantes([]); setCalificaciones([]); return; }
    fetch(`/api/usuarios?seccionId=${seccionId}`).then(r => r.json()).then(d => setEstudiantes(d.estudiantes || []));
    cargarCalificaciones();
  }, [seccionId, asignaturaId, periodo]);

  const cargarCalificaciones = async () => {
    if (!seccionId) return;
    let url = `/api/calificaciones?seccionId=${seccionId}&periodo=${periodo}`;
    if (asignaturaId) url += `&asignaturaId=${asignaturaId}`;
    const data = await fetch(url).then(r => r.json());
    setCalificaciones(data.calificaciones || []);
  };

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_VER.includes(rol)) return <div style={s.sinAcceso}>🚫 Sin permiso. <a href="/dashboard" style={s.enlace}>Volver</a></div>;

  const puedeRegistrar = ROLES_REGISTRAR.includes(rol);
  const puedePublicar  = ROLES_PUBLICAR.includes(rol);

  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const abrirModal = (est: Estudiante) => {
    const calif = calificaciones.find(c => c.estudiante.codigo === est.codigo && c.asignatura?.codigo === asignaturas.find(a => String(a.id) === asignaturaId)?.codigo);
    setForm({
      estudianteId: est.id, asignaturaId, seccionId, periodo,
      prueba1: calif?.prueba1 ?? "", prueba2: calif?.prueba2 ?? "",
      prueba3: calif?.prueba3 ?? "", prueba4: calif?.prueba4 ?? "",
      practica1: calif?.practica1 ?? "", practica2: calif?.practica2 ?? "",
      trabajoFinal: calif?.trabajoFinal ?? "", asistencia: calif?.asistencia ?? "",
    });
    setModal(true);
    setError("");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/calificaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    cargarCalificaciones();
    setTimeout(() => setExito(""), 3000);
  };

  const publicar = async (id: number, publicar: boolean) => {
    const res  = await fetch("/api/calificaciones", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, publicar }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    cargarCalificaciones();
    setTimeout(() => setExito(""), 3000);
  };

  const publicarTodas = async () => {
    const sinPublicar = calificaciones.filter(c => !c.publicado);
    for (const c of sinPublicar) await publicar(c.id, true);
  };

  const calif = (estudianteId: number) => calificaciones.find(c => {
    const asigActual = asignaturas.find(a => String(a.id) === asignaturaId);
    return c.estudiante && estudiantes.find(e => e.id === estudianteId)?.codigo === c.estudiante.codigo
      && (!asignaturaId || c.asignatura?.codigo === asigActual?.codigo);
  });

  return (
    <main style={s.main}>
      <NavBar titulo="Calificaciones" icono="📝" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Registro de Calificaciones</h1>
            <p style={s.subtitulo}>Basado en: Pruebas 50% · Prácticas 15% · Trabajo Final 20% · Asistencia 15%</p>
          </div>
          {puedePublicar && calificaciones.some(c => !c.publicado) && (
            <button onClick={publicarTodas} style={s.btnPublicar}>📢 Publicar todas</button>
          )}
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.filtros}>
          <div>
            <label style={s.label}>Sección</label>
            <select value={seccionId} onChange={e => setSeccionId(e.target.value)} style={s.select}>
              <option value="">Selecciona sección</option>
              {secciones.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.curso.grado} — {sec.aula} ({sec.codigo})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Asignatura</label>
            <select value={asignaturaId} onChange={e => setAsignaturaId(e.target.value)} style={s.select}>
              <option value="">Todas</option>
              {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Período</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={s.select}>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {!seccionId ? (
          <div style={s.vacio}>Selecciona una sección para ver las calificaciones.</div>
        ) : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Estudiante</th>
                  <th style={s.th}>P1</th><th style={s.th}>P2</th><th style={s.th}>P3</th><th style={s.th}>P4</th>
                  <th style={{...s.th, background:"#2D6A9F"}}>Pruebas</th>
                  <th style={s.th}>Pr1</th><th style={s.th}>Pr2</th>
                  <th style={{...s.th, background:"#2D6A9F"}}>Prácticas</th>
                  <th style={s.th}>T.Final</th>
                  <th style={s.th}>Asist.</th>
                  <th style={{...s.th, background:"#1a4a7a"}}>Nota Final</th>
                  <th style={s.th}>Condición</th>
                  <th style={s.th}>Estado</th>
                  {(puedeRegistrar || puedePublicar) && <th style={s.th}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {estudiantes.map((est, i) => {
                  const c = calificaciones.find(cal => {
                    const asigActual = asignaturas.find(a => String(a.id) === asignaturaId);
                    return cal.estudiante?.codigo === est.codigo &&
                      (!asignaturaId || cal.asignatura?.codigo === asigActual?.codigo);
                  });
                  return (
                    <tr key={est.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={s.td}>{est.nombre} {est.apellido}<br/><span style={s.codigo}>{est.codigo}</span></td>
                      <td style={s.tdNum}>{c?.prueba1 ?? "—"}</td>
                      <td style={s.tdNum}>{c?.prueba2 ?? "—"}</td>
                      <td style={s.tdNum}>{c?.prueba3 ?? "—"}</td>
                      <td style={s.tdNum}>{c?.prueba4 ?? "—"}</td>
                      <td style={{...s.tdNum, fontWeight:"bold", color:"#2C1810"}}>{c?.notaPruebas?.toFixed(2) ?? "—"}</td>
                      <td style={s.tdNum}>{c?.practica1 ?? "—"}</td>
                      <td style={s.tdNum}>{c?.practica2 ?? "—"}</td>
                      <td style={{...s.tdNum, fontWeight:"bold", color:"#2C1810"}}>{c?.notaPracticas?.toFixed(2) ?? "—"}</td>
                      <td style={s.tdNum}>{c?.trabajoFinal ?? "—"}</td>
                      <td style={s.tdNum}>{c?.asistencia ?? "—"}</td>
                      <td style={{...s.tdNum, fontWeight:"bold", fontSize:"15px", color: c?.notaFinal != null ? (c.notaFinal >= 6 ? "#276749" : "#c53030") : "#333"}}>
                        {c?.notaFinal?.toFixed(2) ?? "—"}
                      </td>
                      <td style={s.td}>
                        {c ? (
                          <span style={{ ...s.badge, background: c.condicion === "APROBADO" ? "#f0fff4" : "#fff5f5", color: c.condicion === "APROBADO" ? "#276749" : "#c53030", border: `1px solid ${c.condicion === "APROBADO" ? "#9ae6b4" : "#fed7d7"}` }}>
                            {c.condicion}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={s.td}>
                        {c ? (
                          <span style={{ ...s.badge, background: c.publicado ? "#EBF8FF" : "#FFFBEB", color: c.publicado ? "#2B6CB0" : "#B7791F", border: `1px solid ${c.publicado ? "#BEE3F8" : "#F6E05E"}` }}>
                            {c.publicado ? "Publicado" : "Pendiente"}
                          </span>
                        ) : "—"}
                      </td>
                      {(puedeRegistrar || puedePublicar) && (
                        <td style={s.td}>
                          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                            {puedeRegistrar && asignaturaId && (
                              <button onClick={() => abrirModal(est)} style={s.btnEditar}>
                                {c ? "✏️ Editar" : "➕ Registrar"}
                              </button>
                            )}
                            {puedePublicar && c && !c.publicado && (
                              <button onClick={() => publicar(c.id, true)} style={s.btnPub}>📢 Publicar</button>
                            )}
                            {puedePublicar && c && c.publicado && (
                              <button onClick={() => publicar(c.id, false)} style={s.btnDespub}>↩️ Despublicar</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Registrar Calificaciones — {periodo}</h2>
            <p style={s.modalSub}>
              {estudiantes.find(e => e.id === form.estudianteId)?.nombre} {estudiantes.find(e => e.id === form.estudianteId)?.apellido}
              {" · "}{asignaturas.find(a => String(a.id) === asignaturaId)?.nombre}
            </p>
            <form onSubmit={guardar}>
              <p style={s.secLabel}>Pruebas y Exámenes (peso 50%)</p>
              <div style={s.gridCuatro}>
                {["prueba1","prueba2","prueba3","prueba4"].map((f,i) => (
                  <div key={f}>
                    <label style={s.label}>Prueba {i+1}</label>
                    <input name={f} value={form[f]} onChange={c} type="number" min="0" max="10" step="0.01" style={s.input} placeholder="0-10" />
                  </div>
                ))}
              </div>
              <p style={s.secLabel}>Prácticas (peso 15%)</p>
              <div style={s.gridDos}>
                {["practica1","practica2"].map((f,i) => (
                  <div key={f}>
                    <label style={s.label}>Práctica {i+1}</label>
                    <input name={f} value={form[f]} onChange={c} type="number" min="0" max="10" step="0.01" style={s.input} placeholder="0-10" />
                  </div>
                ))}
              </div>
              <p style={s.secLabel}>Trabajo Final (peso 20%) · Asistencia (peso 15%)</p>
              <div style={s.gridDos}>
                <div>
                  <label style={s.label}>Trabajo Final</label>
                  <input name="trabajoFinal" value={form.trabajoFinal} onChange={c} type="number" min="0" max="10" step="0.01" style={s.input} placeholder="0-10" />
                </div>
                <div>
                  <label style={s.label}>Asistencia</label>
                  <input name="asistencia" value={form.asistencia} onChange={c} type="number" min="0" max="10" step="0.01" style={s.input} placeholder="0-10" />
                </div>
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
  loading:    { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  sinAcceso:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" },
  enlace:     { color:"#2C1810" },
  main:       { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:  { maxWidth:"1400px", margin:"0 auto", padding:"28px 20px" },
  header:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" },
  titulo:     { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:  { fontSize:"13px", color:"#666", margin:0 },
  btnPublicar:{ background:"linear-gradient(135deg,#276749,#2D9D5E)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  exitoMsg:   { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:   { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  filtros:    { display:"flex", gap:"16px", flexWrap:"wrap", marginBottom:"20px", background:"#fff", padding:"16px", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  label:      { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  select:     { padding:"9px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"13px", minWidth:"200px" },
  vacio:      { textAlign:"center", padding:"40px", color:"#888", background:"#fff", borderRadius:"8px" },
  tablaWrap:  { overflowX:"auto", background:"#fff", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  tabla:      { width:"100%", borderCollapse:"collapse" },
  theadRow:   { background:"linear-gradient(135deg,#2C1810,#4a2518)" },
  th:         { padding:"10px 8px", color:"#fff", fontSize:"11px", fontWeight:"bold", textAlign:"center", whiteSpace:"nowrap" },
  td:         { padding:"8px 10px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle" },
  tdNum:      { padding:"8px 6px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", textAlign:"center", verticalAlign:"middle" },
  codigo:     { fontSize:"11px", color:"#999" },
  badge:      { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold", whiteSpace:"nowrap" },
  btnEditar:  { background:"#EBF3FB", color:"#2C1810", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  btnPub:     { background:"#f0fff4", color:"#276749", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  btnDespub:  { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalCard:  { background:"#fff", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflowY:"auto" },
  modalTitulo:{ fontSize:"18px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  modalSub:   { fontSize:"13px", color:"#666", margin:"0 0 20px" },
  secLabel:   { fontSize:"12px", fontWeight:"bold", color:"#C0392B", margin:"16px 0 8px", textTransform:"uppercase" },
  gridCuatro: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px" },
  gridDos:    { display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"10px" },
  input:      { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  modalBotones:{ display:"flex", gap:"10px", justifyContent:"flex-end", marginTop:"20px" },
  btnCancelar:{ background:"#f0f0f0", color:"#333", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  btnGuardar: { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
};
