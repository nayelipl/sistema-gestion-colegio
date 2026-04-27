"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const ROLES_GESTION  = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE"];
const TIPOS          = ["CIRCULAR", "COMUNICADO", "NOTIFICACION", "BLOG"];
const DESTINATARIOS  = ["TODOS", "TUTOR", "ESTUDIANTE", "MAESTRO", "INTERNO"];

const TIPO_COLOR: Record<string, React.CSSProperties> = {
  CIRCULAR:     { background:"#EBF8FF", color:"#2b6cb0", border:"1px solid #bee3f8" },
  COMUNICADO:   { background:"#FAF5FF", color:"#553c9a", border:"1px solid #d6bcfa" },
  NOTIFICACION: { background:"#FFFBEB", color:"#c05621", border:"1px solid #fbd38d" },
  BLOG:         { background:"#f0fff4", color:"#276749", border:"1px solid #9ae6b4" },
};

type Publicacion = {
  id: number; titulo: string; contenido: string; tipo: string;
  destinatario: string; publicado: boolean; creadoEn: string;
  publicadoEn: string; creadoPor: string;
};

export default function ComunicacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [filtroTipo, setFiltroTipo]       = useState("");
  const [modal, setModal]                 = useState(false);
  const [editando, setEditando]           = useState<Publicacion | null>(null);
  const [detalle, setDetalle]             = useState<Publicacion | null>(null);
  const [form, setForm]                   = useState<any>({ tipo:"CIRCULAR", destinatario:"TODOS" });
  const [error, setError]                 = useState("");
  const [exito, setExito]                 = useState("");
  const [cargando, setCargando]           = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    cargar();
  }, [status, filtroTipo]);

  const cargar = async () => {
    setCargando(true);
    let url = "/api/comunicaciones";
    if (filtroTipo) url += `?tipo=${filtroTipo}`;
    const data = await fetch(url).then(r => r.json());
    setPublicaciones(data.publicaciones || []);
    setCargando(false);
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;

  const puedeGestionar = ROLES_GESTION.includes(rol);
  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ tipo:"CIRCULAR", destinatario:"TODOS" });
    setModal(true);
    setError("");
  };

  const abrirEditar = (p: Publicacion) => {
    setEditando(p);
    setForm({ titulo: p.titulo, contenido: p.contenido, tipo: p.tipo, destinatario: p.destinatario });
    setModal(true);
    setError("");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const method = editando ? "PUT" : "POST";
    const body   = editando ? { ...form, id: editando.id } : form;
    const res    = await fetch("/api/comunicaciones", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data   = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    cargar();
    setTimeout(() => setExito(""), 3000);
  };

  const publicar = async (id: number, pub: boolean) => {
    const res  = await fetch("/api/comunicaciones", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, publicar: pub }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    cargar();
    setTimeout(() => setExito(""), 3000);
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este comunicado?")) return;
    await fetch(`/api/comunicaciones?id=${id}`, { method:"DELETE" });
    cargar();
  };

  return (
    <main style={s.main}>
      <NavBar titulo="Comunicados y Circulares" icono="📣" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Comunicados y Circulares</h1>
            <p style={s.subtitulo}>Gestión de comunicaciones institucionales</p>
          </div>
          {puedeGestionar && (
            <button onClick={abrirNuevo} style={s.btnNuevo}>+ Nuevo comunicado</button>
          )}
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.filtros}>
          <label style={s.label}>Tipo:</label>
          <div style={s.tipoRow}>
            <button onClick={() => setFiltroTipo("")} style={{...s.btnFiltro, ...(filtroTipo===""?s.btnFiltroActivo:{})}}>Todos</button>
            {TIPOS.map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                style={{...s.btnFiltro, ...(filtroTipo===t?s.btnFiltroActivo:{}), ...TIPO_COLOR[t]}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div style={s.vacio}>Cargando...</div>
        ) : publicaciones.length === 0 ? (
          <div style={s.vacio}>No hay comunicados.{puedeGestionar && " Usa el botón + para crear uno."}</div>
        ) : (
          <div style={s.lista}>
            {publicaciones.map(p => (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={s.cardMeta}>
                    <span style={{...s.badge, ...TIPO_COLOR[p.tipo]}}>{p.tipo}</span>
                    <span style={{...s.badge, background:"#f0f0f0", color:"#555"}}>→ {p.destinatario}</span>
                    <span style={{...s.badge, ...(p.publicado?{background:"#EBF8FF",color:"#2B6CB0"}:{background:"#FFFBEB",color:"#B7791F"})}}>
                      {p.publicado ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <span style={s.fecha}>{new Date(p.creadoEn).toLocaleDateString("es-DO")}</span>
                </div>
                <h3 style={s.cardTitulo}>{p.titulo}</h3>
                <p style={s.cardContenido}>{p.contenido.slice(0, 200)}{p.contenido.length > 200 ? "..." : ""}</p>
                <div style={s.cardBotones}>
                  <button onClick={() => setDetalle(p)} style={s.btnVer}>👁️ Ver completo</button>
                  {puedeGestionar && (
                    <>
                      <button onClick={() => abrirEditar(p)} style={s.btnEditar}>✏️ Editar</button>
                      <button onClick={() => publicar(p.id, !p.publicado)} style={p.publicado ? s.btnDespub : s.btnPub}>
                        {p.publicado ? "↩️ Despublicar" : "📢 Publicar"}
                      </button>
                      <button onClick={() => eliminar(p.id)} style={s.btnEliminar}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>{editando ? "Editar comunicado" : "Nuevo comunicado"}</h2>
            <form onSubmit={guardar}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"16px" }}>
                <div>
                  <label style={s.label}>Título *</label>
                  <input name="titulo" value={form.titulo||""} onChange={c} style={s.input} required placeholder="Título del comunicado" />
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Tipo *</label>
                    <select name="tipo" value={form.tipo||"CIRCULAR"} onChange={c} style={s.input} required>
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Destinatario *</label>
                    <select name="destinatario" value={form.destinatario||"TODOS"} onChange={c} style={s.input} required>
                      {DESTINATARIOS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Contenido *</label>
                  <textarea name="contenido" value={form.contenido||""} onChange={c}
                    style={{...s.input, height:"160px", resize:"vertical"}} required
                    placeholder="Redacta el contenido del comunicado..." />
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

      {detalle && (
        <div style={s.overlay}>
          <div style={{...s.modalCard, maxWidth:"640px"}}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <span style={{...s.badge, ...TIPO_COLOR[detalle.tipo]}}>{detalle.tipo}</span>
                <span style={{...s.badge, background:"#f0f0f0", color:"#555"}}>→ {detalle.destinatario}</span>
              </div>
              <button onClick={() => setDetalle(null)} style={s.btnCerrar}>✕</button>
            </div>
            <h2 style={s.modalTitulo}>{detalle.titulo}</h2>
            <p style={{ fontSize:"12px", color:"#999", margin:"0 0 16px" }}>
              {new Date(detalle.creadoEn).toLocaleDateString("es-DO", { day:"numeric", month:"long", year:"numeric" })}
            </p>
            <div style={{ fontSize:"14px", color:"#444", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{detalle.contenido}</div>
            <div style={{ marginTop:"24px", display:"flex", justifyContent:"flex-end" }}>
              <button onClick={() => setDetalle(null)} style={s.btnCancelar}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:       { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  main:          { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:     { maxWidth:"1000px", margin:"0 auto", padding:"28px 20px" },
  header:        { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" },
  titulo:        { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:     { fontSize:"13px", color:"#666", margin:0 },
  btnNuevo:      { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  exitoMsg:      { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:      { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  filtros:       { display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px", flexWrap:"wrap" },
  label:         { fontSize:"12px", fontWeight:"600", color:"#333" },
  tipoRow:       { display:"flex", gap:"8px", flexWrap:"wrap" },
  btnFiltro:     { border:"1px solid #ddd", borderRadius:"20px", padding:"5px 14px", fontSize:"12px", cursor:"pointer", background:"#fff", color:"#555" },
  btnFiltroActivo: { fontWeight:"bold", boxShadow:"0 0 0 2px #1F5C99" },
  vacio:         { textAlign:"center", padding:"40px", color:"#888", background:"#fff", borderRadius:"8px" },
  lista:         { display:"flex", flexDirection:"column", gap:"16px" },
  card:          { background:"#fff", borderRadius:"12px", padding:"20px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  cardTop:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px", flexWrap:"wrap", gap:"8px" },
  cardMeta:      { display:"flex", gap:"8px", flexWrap:"wrap" },
  badge:         { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold", whiteSpace:"nowrap" },
  fecha:         { fontSize:"12px", color:"#999" },
  cardTitulo:    { fontSize:"16px", fontWeight:"bold", color:"#2C1810", margin:"0 0 8px" },
  cardContenido: { fontSize:"13px", color:"#555", margin:"0 0 14px", lineHeight:1.6 },
  cardBotones:   { display:"flex", gap:"8px", flexWrap:"wrap" },
  btnVer:        { background:"#f0f4f8", color:"#2C1810", border:"none", borderRadius:"6px", padding:"6px 12px", fontSize:"12px", cursor:"pointer" },
  btnEditar:     { background:"#EBF3FB", color:"#2C1810", border:"none", borderRadius:"6px", padding:"6px 12px", fontSize:"12px", cursor:"pointer" },
  btnPub:        { background:"#f0fff4", color:"#276749", border:"none", borderRadius:"6px", padding:"6px 12px", fontSize:"12px", cursor:"pointer" },
  btnDespub:     { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"6px 12px", fontSize:"12px", cursor:"pointer" },
  btnEliminar:   { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"12px", cursor:"pointer" },
  overlay:       { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalCard:     { background:"#fff", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflowY:"auto" },
  modalTitulo:   { fontSize:"18px", fontWeight:"bold", color:"#2C1810", margin:"0 0 16px" },
  input:         { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  modalBotones:  { display:"flex", gap:"10px", justifyContent:"flex-end" },
  btnCancelar:   { background:"#f0f0f0", color:"#333", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  btnGuardar:    { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  btnCerrar:     { background:"none", border:"none", fontSize:"18px", cursor:"pointer", color:"#999", padding:"0" },
};
