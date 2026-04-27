"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const ROLES_GESTION = ["ADMINISTRADOR", "DIRECCION_ACADEMICA"];
const TIPOS = ["INICIO_CLASES","FIN_CLASES","FERIADO","EXAMEN","ACTIVIDAD","RECESO","OTRO"];
const TIPO_COLOR: Record<string, React.CSSProperties> = {
  INICIO_CLASES: { background:"#f0fff4", color:"#276749", border:"1px solid #9ae6b4" },
  FIN_CLASES:    { background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7" },
  FERIADO:       { background:"#FFFBEB", color:"#c05621", border:"1px solid #fbd38d" },
  EXAMEN:        { background:"#fff5f5", color:"#702459", border:"1px solid #fed7d7" },
  ACTIVIDAD:     { background:"#EBF8FF", color:"#2b6cb0", border:"1px solid #bee3f8" },
  RECESO:        { background:"#FAF5FF", color:"#553c9a", border:"1px solid #d6bcfa" },
  OTRO:          { background:"#f0f0f0", color:"#555",    border:"1px solid #ddd" },
};

type Evento = {
  id: number; titulo: string; descripcion: string; fechaInicio: string;
  fechaFin: string; tipo: string; anio: string; publicado: boolean;
};

export default function CalendarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [eventos, setEventos]   = useState<Evento[]>([]);
  const [anio, setAnio]         = useState(new Date().getFullYear().toString());
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [form, setForm]         = useState<any>({});
  const [error, setError]       = useState("");
  const [exito, setExito]       = useState("");
  const [cargando, setCargando] = useState(true);
  const [vistaCalendario, setVistaCalendario] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    cargarEventos();
  }, [status, anio]);

  const cargarEventos = async () => {
    setCargando(true);
    const data = await fetch(`/api/calendario?anio=${anio}`).then(r => r.json());
    setEventos(data.eventos || []);
    setCargando(false);
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;

  const puedeGestionar = ROLES_GESTION.includes(rol);

  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ anio, tipo: "ACTIVIDAD" });
    setModal(true);
    setError("");
  };

  const abrirEditar = (ev: Evento) => {
    setEditando(ev);
    setForm({
      titulo:      ev.titulo,
      descripcion: ev.descripcion || "",
      fechaInicio: ev.fechaInicio.split("T")[0],
      fechaFin:    ev.fechaFin.split("T")[0],
      tipo:        ev.tipo,
      anio:        ev.anio,
    });
    setModal(true);
    setError("");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const method = editando ? "PUT" : "POST";
    const body   = editando ? { ...form, id: editando.id } : form;
    const res    = await fetch("/api/calendario", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data   = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    cargarEventos();
    setTimeout(() => setExito(""), 3000);
  };

  const publicar = async (id: number, pub: boolean) => {
    const res  = await fetch("/api/calendario", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, publicar: pub }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    cargarEventos();
    setTimeout(() => setExito(""), 3000);
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este evento?")) return;
    await fetch(`/api/calendario?id=${id}`, { method: "DELETE" });
    cargarEventos();
  };

  // Agrupar por mes
  const porMes: Record<string, Evento[]> = {};
  eventos.forEach(ev => {
    const mes = new Date(ev.fechaInicio).toLocaleString("es-DO", { month: "long", year: "numeric" });
    if (!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(ev);
  });

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  return (
    <main style={s.main}>
      <NavBar titulo="Calendario Escolar" icono="🗓️" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Calendario Escolar</h1>
            <p style={s.subtitulo}>Eventos, feriados, exámenes y actividades del año escolar</p>
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <select value={anio} onChange={e => setAnio(e.target.value)} style={s.selectAnio}>
              {["2024","2025","2026","2027"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setVistaCalendario(!vistaCalendario)} style={s.btnVista}>
              {vistaCalendario ? "📋 Lista" : "📅 Calendario"}
            </button>
            {puedeGestionar && (
              <button onClick={abrirNuevo} style={s.btnNuevo}>+ Nuevo evento</button>
            )}
          </div>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.leyenda}>
          {TIPOS.map(t => (
            <span key={t} style={{...s.badge, ...TIPO_COLOR[t]}}>{t.replace("_"," ")}</span>
          ))}
        </div>

        {cargando ? (
          <div style={s.vacio}>Cargando eventos...</div>
        ) : eventos.length === 0 ? (
          <div style={s.vacio}>No hay eventos registrados para {anio}.{puedeGestionar && " Usa el botón + para agregar."}</div>
        ) : vistaCalendario ? (
          // Vista por meses
          <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>
            {meses.map(mes => {
              const clave = Object.keys(porMes).find(k => k.toLowerCase().startsWith(mes.toLowerCase()));
              if (!clave) return null;
              return (
                <div key={mes} style={s.mesCard}>
                  <h2 style={s.mesTitulo}>{clave}</h2>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {porMes[clave].map(ev => (
                      <div key={ev.id} style={{...s.eventoRow, ...TIPO_COLOR[ev.tipo]}}>
                        <div style={s.eventoFecha}>
                          {new Date(ev.fechaInicio).toLocaleDateString("es-DO",{day:"numeric",month:"short"})}
                          {ev.fechaFin !== ev.fechaInicio && ` – ${new Date(ev.fechaFin).toLocaleDateString("es-DO",{day:"numeric",month:"short"})}`}
                        </div>
                        <div style={s.eventoInfo}>
                          <strong>{ev.titulo}</strong>
                          {ev.descripcion && <span style={s.eventoDesc}>{ev.descripcion}</span>}
                        </div>
                        <div style={s.eventoAcciones}>
                          <span style={{...s.badge, ...TIPO_COLOR[ev.tipo], fontSize:"10px"}}>{ev.tipo.replace("_"," ")}</span>
                          {!ev.publicado && <span style={{...s.badge, background:"#FFFBEB", color:"#B7791F", fontSize:"10px"}}>Borrador</span>}
                          {puedeGestionar && (
                            <>
                              <button onClick={() => abrirEditar(ev)} style={s.btnIcono}>✏️</button>
                              <button onClick={() => publicar(ev.id, !ev.publicado)} style={s.btnIcono}>{ev.publicado ? "↩️" : "📢"}</button>
                              <button onClick={() => eliminar(ev.id)} style={s.btnIconoRed}>🗑️</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vista lista tabla
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Fecha inicio</th>
                  <th style={s.th}>Fecha fin</th>
                  <th style={s.th}>Título</th>
                  <th style={s.th}>Tipo</th>
                  <th style={s.th}>Estado</th>
                  {puedeGestionar && <th style={s.th}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev, i) => (
                  <tr key={ev.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}>{new Date(ev.fechaInicio).toLocaleDateString("es-DO")}</td>
                    <td style={s.td}>{new Date(ev.fechaFin).toLocaleDateString("es-DO")}</td>
                    <td style={s.td}>
                      <strong>{ev.titulo}</strong>
                      {ev.descripcion && <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#666" }}>{ev.descripcion}</p>}
                    </td>
                    <td style={s.td}><span style={{...s.badge, ...TIPO_COLOR[ev.tipo]}}>{ev.tipo.replace("_"," ")}</span></td>
                    <td style={s.td}>
                      <span style={{...s.badge, ...(ev.publicado ? {background:"#EBF8FF",color:"#2B6CB0",border:"1px solid #BEE3F8"} : {background:"#FFFBEB",color:"#B7791F",border:"1px solid #F6E05E"})}}>
                        {ev.publicado ? "Publicado" : "Borrador"}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td style={s.td}>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <button onClick={() => abrirEditar(ev)} style={s.btnEditar}>✏️ Editar</button>
                          <button onClick={() => publicar(ev.id, !ev.publicado)} style={ev.publicado ? s.btnDespub : s.btnPub}>
                            {ev.publicado ? "↩️" : "📢"}
                          </button>
                          <button onClick={() => eliminar(ev.id)} style={s.btnEliminar}>🗑️</button>
                        </div>
                      </td>
                    )}
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
            <h2 style={s.modalTitulo}>{editando ? "Editar evento" : "Nuevo evento"}</h2>
            <form onSubmit={guardar}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"16px" }}>
                <div>
                  <label style={s.label}>Título *</label>
                  <input name="titulo" value={form.titulo||""} onChange={c} style={s.input} required placeholder="Ej: Inicio del año escolar" />
                </div>
                <div>
                  <label style={s.label}>Descripción</label>
                  <textarea name="descripcion" value={form.descripcion||""} onChange={c} style={{...s.input, height:"70px", resize:"vertical"}} placeholder="Descripción opcional" />
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Fecha inicio *</label>
                    <input name="fechaInicio" type="date" value={form.fechaInicio||""} onChange={c} style={s.input} required />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Fecha fin</label>
                    <input name="fechaFin" type="date" value={form.fechaFin||""} onChange={c} style={s.input} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Tipo *</label>
                    <select name="tipo" value={form.tipo||""} onChange={c} style={s.input} required>
                      {TIPOS.map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Año *</label>
                    <select name="anio" value={form.anio||anio} onChange={c} style={s.input} required>
                      {["2024","2025","2026","2027"].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
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
  loading:     { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  sinAcceso:   { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  main:        { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:   { maxWidth:"1100px", margin:"0 auto", padding:"28px 20px" },
  header:      { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", flexWrap:"wrap", gap:"12px" },
  titulo:      { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:   { fontSize:"13px", color:"#666", margin:0 },
  selectAnio:  { padding:"9px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px" },
  btnVista:    { background:"#fff", color:"#2C1810", border:"1px solid #1F5C99", borderRadius:"8px", padding:"9px 16px", fontSize:"13px", cursor:"pointer" },
  btnNuevo:    { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  exitoMsg:    { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:    { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  leyenda:     { display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px" },
  badge:       { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold", whiteSpace:"nowrap" },
  vacio:       { textAlign:"center", padding:"40px", color:"#888", background:"#fff", borderRadius:"8px" },
  mesCard:     { background:"#fff", borderRadius:"10px", padding:"20px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  mesTitulo:   { fontSize:"16px", fontWeight:"bold", color:"#2C1810", margin:"0 0 12px", textTransform:"capitalize" },
  eventoRow:   { display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderRadius:"8px", flexWrap:"wrap" },
  eventoFecha: { fontSize:"12px", fontWeight:"bold", minWidth:"80px" },
  eventoInfo:  { flex:1, display:"flex", flexDirection:"column", gap:"2px", fontSize:"13px" },
  eventoDesc:  { fontSize:"12px", opacity:0.8 },
  eventoAcciones: { display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" },
  btnIcono:    { background:"rgba(255,255,255,0.6)", border:"none", borderRadius:"6px", padding:"4px 8px", cursor:"pointer", fontSize:"13px" },
  btnIconoRed: { background:"rgba(255,200,200,0.6)", border:"none", borderRadius:"6px", padding:"4px 8px", cursor:"pointer", fontSize:"13px" },
  tablaWrap:   { overflowX:"auto", background:"#fff", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  tabla:       { width:"100%", borderCollapse:"collapse" },
  theadRow:    { background:"linear-gradient(135deg,#2C1810,#4a2518)" },
  th:          { padding:"12px 14px", color:"#fff", fontSize:"12px", fontWeight:"bold", textAlign:"left" },
  td:          { padding:"10px 14px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle" },
  btnEditar:   { background:"#EBF3FB", color:"#2C1810", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  btnPub:      { background:"#f0fff4", color:"#276749", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"12px", cursor:"pointer" },
  btnDespub:   { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"12px", cursor:"pointer" },
  btnEliminar: { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"12px", cursor:"pointer" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalCard:   { background:"#fff", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"500px", maxHeight:"90vh", overflowY:"auto" },
  modalTitulo: { fontSize:"18px", fontWeight:"bold", color:"#2C1810", margin:"0 0 20px" },
  label:       { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  input:       { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  modalBotones:{ display:"flex", gap:"10px", justifyContent:"flex-end" },
  btnCancelar: { background:"#f0f0f0", color:"#333", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  btnGuardar:  { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
};
