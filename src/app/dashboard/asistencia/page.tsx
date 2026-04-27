"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const ROLES_VER      = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE", "MAESTRO"];
const ROLES_REGISTRAR = ["MAESTRO", "ADMINISTRADOR", "SECRETARIA_DOCENTE"];
const ROLES_PUBLICAR  = ["SECRETARIA_DOCENTE", "ADMINISTRADOR"];

type Seccion    = { id: number; codigo: string; aula: string; curso: { grado: string } };
type Estudiante = { id: number; codigo: string; nombre: string; apellido: string };
type Asistencia = { id: number; estudianteId: number; fecha: string; estado: string; publicado: boolean; estudiante: { nombre: string; apellido: string; codigo: string } };

export default function AsistenciaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [secciones, setSecciones]     = useState<Seccion[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [seccionId, setSeccionId]     = useState("");
  const [fecha, setFecha]             = useState(new Date().toISOString().split("T")[0]);
  const [estados, setEstados]         = useState<Record<number, string>>({});
  const [error, setError]             = useState("");
  const [exito, setExito]             = useState("");
  const [cargando, setCargando]       = useState(true);
  const [guardando, setGuardando]     = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/academico/secciones").then(r => r.json()).then(d => {
      setSecciones(d.secciones || []);
      setCargando(false);
    });
  }, [status]);

  useEffect(() => {
    if (!seccionId) { setEstudiantes([]); setAsistencias([]); setEstados({}); return; }
    cargarDatos();
  }, [seccionId, fecha]);

  const cargarDatos = async () => {
    const [resEst, resAsist] = await Promise.all([
      fetch(`/api/usuarios?seccionId=${seccionId}`).then(r => r.json()),
      fetch(`/api/asistencia?seccionId=${seccionId}&fecha=${fecha}`).then(r => r.json()),
    ]);
    const ests   = resEst.estudiantes || [];
    const asists = resAsist.asistencias || [];
    setEstudiantes(ests);
    setAsistencias(asists);
    const mapa: Record<number, string> = {};
    ests.forEach((e: Estudiante) => {
      const a = asists.find((a: Asistencia) => a.estudianteId === e.id);
      mapa[e.id] = a ? a.estado : "PRESENTE";
    });
    setEstados(mapa);
  };

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_VER.includes(rol)) return <div style={s.sinAcceso}>🚫 Sin permiso. <a href="/dashboard" style={s.enlace}>Volver</a></div>;

  const puedeRegistrar = ROLES_REGISTRAR.includes(rol);
  const puedePublicar  = ROLES_PUBLICAR.includes(rol);
  const yaPublicado    = asistencias.length > 0 && asistencias.every(a => a.publicado);

  const marcarTodos = (estado: string) => {
    const nuevo: Record<number, string> = {};
    estudiantes.forEach(e => { nuevo[e.id] = estado; });
    setEstados(nuevo);
  };

  const guardar = async () => {
    setError(""); setExito(""); setGuardando(true);
    const registros = estudiantes.map(e => ({ estudianteId: e.id, estado: estados[e.id] || "PRESENTE" }));
    const res  = await fetch("/api/asistencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registros, fecha, seccionId }) });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const publicar = async (pub: boolean) => {
    setError(""); setExito("");
    const res  = await fetch("/api/asistencia", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fecha, seccionId, publicar: pub }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const resumen = {
    presentes:  estudiantes.filter(e => estados[e.id] === "PRESENTE").length,
    ausentes:   estudiantes.filter(e => estados[e.id] === "AUSENTE").length,
    tardanzas:  estudiantes.filter(e => estados[e.id] === "TARDANZA").length,
    justificados: estudiantes.filter(e => estados[e.id] === "JUSTIFICADO").length,
  };

  return (
    <main style={s.main}>
      <NavBar titulo="Control de Asistencia" icono="✅" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Control de Asistencia</h1>
            <p style={s.subtitulo}>Pase de lista diario por sección</p>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            {puedeRegistrar && seccionId && estudiantes.length > 0 && (
              <button onClick={guardar} disabled={guardando} style={s.btnGuardar}>
                {guardando ? "Guardando..." : "💾 Guardar"}
              </button>
            )}
            {puedePublicar && asistencias.length > 0 && (
              <button onClick={() => publicar(!yaPublicado)} style={yaPublicado ? s.btnDespub : s.btnPublicar}>
                {yaPublicado ? "↩️ Despublicar" : "📢 Publicar"}
              </button>
            )}
          </div>
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
            <label style={s.label}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={s.select} />
          </div>
        </div>

        {seccionId && estudiantes.length > 0 && (
          <>
            <div style={s.resumenRow}>
              <div style={{...s.resCard, borderColor:"#9ae6b4"}}><span style={{color:"#276749", fontWeight:"bold"}}>{resumen.presentes}</span><span style={s.resLabel}>Presentes</span></div>
              <div style={{...s.resCard, borderColor:"#fed7d7"}}><span style={{color:"#c53030", fontWeight:"bold"}}>{resumen.ausentes}</span><span style={s.resLabel}>Ausentes</span></div>
              <div style={{...s.resCard, borderColor:"#fbd38d"}}><span style={{color:"#c05621", fontWeight:"bold"}}>{resumen.tardanzas}</span><span style={s.resLabel}>Tardanzas</span></div>
              <div style={{...s.resCard, borderColor:"#bee3f8"}}><span style={{color:"#2b6cb0", fontWeight:"bold"}}>{resumen.justificados}</span><span style={s.resLabel}>Justificados</span></div>
            </div>

            {puedeRegistrar && (
              <div style={s.accionesRow}>
                <span style={s.label}>Marcar todos:</span>
                {["PRESENTE","AUSENTE","TARDANZA","JUSTIFICADO"].map(e => (
                  <button key={e} onClick={() => marcarTodos(e)} style={{...s.btnMarcador, ...colorEstado(e)}}>{e}</button>
                ))}
              </div>
            )}

            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Estudiante</th>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Estado</th>
                    {!puedeRegistrar && <th style={s.th}>Publicado</th>}
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((est, i) => (
                    <tr key={est.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={s.tdNum}>{i + 1}</td>
                      <td style={s.td}>{est.nombre} {est.apellido}</td>
                      <td style={s.tdNum}><span style={s.codigo}>{est.codigo}</span></td>
                      <td style={s.td}>
                        {puedeRegistrar ? (
                          <div style={s.estadoRow}>
                            {["PRESENTE","AUSENTE","TARDANZA","JUSTIFICADO"].map(e => (
                              <button key={e} onClick={() => setEstados({...estados, [est.id]: e})}
                                style={{...s.btnEstado, ...(estados[est.id] === e ? colorEstado(e) : s.btnEstadoInactivo)}}>
                                {e === "PRESENTE" ? "✓ P" : e === "AUSENTE" ? "✗ A" : e === "TARDANZA" ? "⏰ T" : "📋 J"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{...s.badge, ...colorEstado(estados[est.id] || "PRESENTE")}}>
                            {estados[est.id] || "—"}
                          </span>
                        )}
                      </td>
                      {!puedeRegistrar && (
                        <td style={s.td}>
                          {asistencias.find(a => a.estudianteId === est.id)?.publicado
                            ? <span style={{...s.badge, background:"#EBF8FF", color:"#2B6CB0"}}>Publicado</span>
                            : <span style={{...s.badge, background:"#FFFBEB", color:"#B7791F"}}>Pendiente</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {seccionId && estudiantes.length === 0 && (
          <div style={s.vacio}>No hay estudiantes en esta sección.</div>
        )}

        {!seccionId && (
          <div style={s.vacio}>Selecciona una sección para tomar asistencia.</div>
        )}
      </div>
    </main>
  );
}

function colorEstado(estado: string): React.CSSProperties {
  switch (estado) {
    case "PRESENTE":    return { background:"#f0fff4", color:"#276749", border:"1px solid #9ae6b4" };
    case "AUSENTE":     return { background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7" };
    case "TARDANZA":    return { background:"#FFFBEB", color:"#c05621", border:"1px solid #fbd38d" };
    case "JUSTIFICADO": return { background:"#EBF8FF", color:"#2b6cb0", border:"1px solid #bee3f8" };
    default:            return { background:"#f0f0f0", color:"#333", border:"1px solid #ddd" };
  }
}

const s: Record<string, React.CSSProperties> = {
  loading:      { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  sinAcceso:    { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" },
  enlace:       { color:"#2C1810" },
  main:         { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:    { maxWidth:"1100px", margin:"0 auto", padding:"28px 20px" },
  header:       { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" },
  titulo:       { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:    { fontSize:"13px", color:"#666", margin:0 },
  btnGuardar:   { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  btnPublicar:  { background:"linear-gradient(135deg,#276749,#2D9D5E)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  btnDespub:    { background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  exitoMsg:     { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:     { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  filtros:      { display:"flex", gap:"16px", flexWrap:"wrap", marginBottom:"20px", background:"#fff", padding:"16px", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  label:        { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  select:       { padding:"9px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"13px", minWidth:"220px" },
  resumenRow:   { display:"flex", gap:"12px", marginBottom:"16px", flexWrap:"wrap" },
  resCard:      { background:"#fff", borderRadius:"10px", padding:"16px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderLeft:"4px solid #ddd", fontSize:"22px", fontWeight:"bold" },
  resLabel:     { fontSize:"12px", color:"#666", fontWeight:"normal" },
  accionesRow:  { display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px", flexWrap:"wrap" },
  btnMarcador:  { border:"none", borderRadius:"6px", padding:"6px 12px", fontSize:"12px", cursor:"pointer", fontWeight:"bold" },
  vacio:        { textAlign:"center", padding:"40px", color:"#888", background:"#fff", borderRadius:"8px" },
  tablaWrap:    { overflowX:"auto", background:"#fff", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width:"100%", borderCollapse:"collapse" },
  theadRow:     { background:"linear-gradient(135deg,#2C1810,#4a2518)" },
  th:           { padding:"12px 10px", color:"#fff", fontSize:"12px", fontWeight:"bold", textAlign:"left" },
  td:           { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle" },
  tdNum:        { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", textAlign:"center", verticalAlign:"middle" },
  codigo:       { fontSize:"11px", color:"#999", background:"#f0f0f0", borderRadius:"4px", padding:"2px 6px" },
  estadoRow:    { display:"flex", gap:"6px" },
  btnEstado:    { border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"11px", cursor:"pointer", fontWeight:"bold" },
  btnEstadoInactivo: { background:"#f0f0f0", color:"#999", border:"1px solid #ddd" },
  badge:        { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold" },
};
