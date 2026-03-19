"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Publicacion = {
  id: number; titulo: string; contenido: string;
  tipo: string; activo: boolean; creadoEn: string;
};

const TIPOS = ["COMUNICADO", "MATERIAL", "BLOG", "NOTIFICACION", "ORIENTACION"];
const TIPOS_LABELS: Record<string, string> = {
  COMUNICADO:   "Comunicado oficial",
  MATERIAL:     "Material educativo",
  BLOG:         "Blog institucional",
  NOTIFICACION: "Notificación",
  ORIENTACION:  "Orientación Escolar",
};
const ROLES_PERMITIDOS = ["ADMINISTRADOR", "SECRETARIA_DOCENTE", "ORIENTADOR_ESCOLAR", "MAESTRO"];

export default function ComunicacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<any>({});
  const [error, setError]       = useState("");
  const [exito, setExito]       = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const res  = await fetch("/api/comunicaciones");
    const data = await res.json();
    setPublicaciones(data.publicaciones || []);
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

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/comunicaciones", {
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

  const cambiarEstado = async (p: Publicacion) => {
    await fetch(`/api/comunicaciones/${p.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ activo: !p.activo }),
    });
    cargarDatos();
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    await fetch(`/api/comunicaciones/${id}`, { method: "DELETE" });
    cargarDatos();
  };

  const filtradas = publicaciones.filter(p =>
    filtroTipo === "TODOS" || p.tipo === filtroTipo
  );

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📢 Comunicaciones</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Comunicaciones</h1>
            <p style={s.subtitulo}>Blog, materiales educativos y comunicados oficiales</p>
          </div>
          <button onClick={() => { setModal(true); setForm({ tipo: "COMUNICADO" }); setError(""); }}
            style={s.btnNuevo}>
            + Nueva publicación
          </button>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}

        {/* Filtro por tipo */}
        <div style={s.tabs}>
          {["TODOS", ...TIPOS].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{ ...s.tab, ...(filtroTipo === t ? s.tabActivo : {}) }}>
              {t === "TODOS" ? "Todos" : TIPOS_LABELS[t]}
              <span style={s.badge}>
                {t === "TODOS" ? publicaciones.length : publicaciones.filter(p => p.tipo === t).length}
              </span>
            </button>
          ))}
        </div>

        {cargando ? <div style={s.vacio}>Cargando...</div> :
          filtradas.length === 0 ? <div style={s.vacio}>No hay publicaciones registradas.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filtradas.map(p => (
              <div key={p.id} style={{ ...s.pubCard, opacity: p.activo ? 1 : 0.6 }}>
                <div style={s.pubHeader}>
                  <div>
                    <span style={s.tipoBadge}>{TIPOS_LABELS[p.tipo] ?? p.tipo}</span>
                    <h3 style={s.pubTitulo}>{p.titulo}</h3>
                    <p style={s.pubFecha}>{new Date(p.creadoEn).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={p.activo ? s.activo : s.inactivo}>{p.activo ? "Activo" : "Inactivo"}</span>
                    <button onClick={() => cambiarEstado(p)}
                      style={p.activo ? s.btnInhabilitar : s.btnHabilitar}>
                      {p.activo ? "🚫 Desactivar" : "✅ Activar"}
                    </button>
                    <button onClick={() => eliminar(p.id)} style={s.btnEliminar}>🗑️</button>
                  </div>
                </div>
                <p style={s.pubContenido}>{p.contenido}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Nueva Publicación</h2>
            <form onSubmit={guardar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={s.label}>Tipo *</label>
                  <select name="tipo" value={form.tipo || "COMUNICADO"} onChange={c} style={s.input}>
                    {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Título *</label>
                  <input name="titulo" value={form.titulo || ""} onChange={c} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Contenido *</label>
                  <textarea name="contenido" value={form.contenido || ""} onChange={c}
                    style={{ ...s.input, minHeight: "120px", resize: "vertical" as any }} required />
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Publicar</button>
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
  contenido:    { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  btnNuevo:     { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs:         { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as any },
  tab:          { padding: "8px 16px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#666", display: "flex", alignItems: "center", gap: "6px" },
  tabActivo:    { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  badge:        { background: "#1F5C99", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  pubCard:      { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  pubHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  tipoBadge:    { background: "#F3E8FF", color: "#5D2F7D", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold", display: "inline-block", marginBottom: "6px" },
  pubTitulo:    { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  pubFecha:     { fontSize: "12px", color: "#999", margin: 0 },
  pubContenido: { fontSize: "13px", color: "#555", lineHeight: "1.6", margin: 0 },
  activo:       { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:     { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  btnInhabilitar:{ background: "#fff5f5", color: "#c53030", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnHabilitar: { background: "#f0fff4", color: "#276749", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnEliminar:  { background: "#fff5f5", color: "#c53030", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  overlay:      { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" as any },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  label:        { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:     { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
