"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Circular = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string; publicado: boolean };

export default function CircularesPortalPage() {
  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [detalle, setDetalle]       = useState<Circular | null>(null);
  const [cargando, setCargando]     = useState(true);

  useEffect(() => {
    fetch("/api/comunicaciones?tipo=CIRCULAR").then(r => r.json()).then(d => {
      setCirculares((d.publicaciones || []).filter((c: Circular) => c.publicado));
      setCargando(false);
    });
  }, []);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/portal" style={s.navLogo}>🏫 <strong>Colegio</strong></Link>
        <div style={s.navLinks}>
          <Link href="/portal/calendario" style={s.navLink}>📅 Calendario</Link>
          <Link href="/portal/circulares" style={{ ...s.navLink, color:"#2C1810", fontWeight:"700" }}>📋 Circulares</Link>
          <a href="/portal#contacto" style={s.navLink}>📍 Contacto</a>
          <Link href="/login" style={s.navLink}>👤</Link>
          <Link href="/registro" style={s.btnAdmision}>Admisión</Link>
        </div>
      </nav>

      <div style={s.contenido}>
        <div style={s.tituloWrap}>
          <span style={s.tituloBg}>Circulares</span>
          <h1 style={s.titulo}>Circulares 2025-2026</h1>
        </div>

        {cargando ? (
          <div style={s.vacio}>Cargando circulares...</div>
        ) : circulares.length === 0 ? (
          <div style={s.vacio}>No hay circulares publicadas.</div>
        ) : (
          <div style={s.lista}>
            {circulares.map((c, i) => (
              <div key={c.id} style={s.card} onClick={() => setDetalle(c)}>
                <div style={s.cardNum}>{String(i + 1).padStart(2, "0")}</div>
                <div style={s.cardInfo}>
                  <span style={s.cardFecha}>
                    {new Date(c.creadoEn).toLocaleDateString("es-DO", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" })}
                  </span>
                  <h3 style={s.cardTitulo}>{c.titulo}</h3>
                  <p style={s.cardDesc}>{c.contenido.slice(0, 120)}...</p>
                </div>
                <span style={s.cardArrow}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {detalle && (
        <div style={s.overlay} onClick={() => setDetalle(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetalle(null)} style={s.btnCerrar}>✕</button>
            <p style={s.modalFecha}>
              {new Date(detalle.creadoEn).toLocaleDateString("es-DO", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" })}
            </p>
            <h2 style={s.modalTitulo}>{detalle.titulo}</h2>
            <div style={s.modalContenido}>{detalle.contenido}</div>
          </div>
        </div>
      )}

      <footer style={s.footer}>
        <p>© {new Date().getFullYear()} Sistema de Gestión de Colegio · (809) 368-0055 · info@colegio.edu.do</p>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main:        { fontFamily:"'Segoe UI', Arial, sans-serif", background:"#fff", minHeight:"100vh" },
  nav:         { background:"#fff", padding:"12px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #eee", position:"sticky" as any, top:0, zIndex:100 },
  navLogo:     { textDecoration:"none", color:"#2C1810", fontSize:"15px", display:"flex", alignItems:"center", gap:"8px" },
  navLinks:    { display:"flex", alignItems:"center", gap:"24px" },
  navLink:     { color:"#555", textDecoration:"none", fontSize:"14px" },
  btnAdmision: { background:"#C0392B", color:"#fff", borderRadius:"20px", padding:"8px 20px", fontSize:"13px", fontWeight:"bold", textDecoration:"none" },
  contenido:   { maxWidth:"780px", margin:"0 auto", padding:"48px 20px" },
  tituloWrap:  { position:"relative" as any, textAlign:"center" as any, marginBottom:"40px" },
  tituloBg:    { position:"absolute" as any, top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:"80px", fontWeight:"900", color:"rgba(0,0,0,0.04)", whiteSpace:"nowrap" as any, pointerEvents:"none" as any },
  titulo:      { fontSize:"28px", fontWeight:"800", color:"#2C1810", position:"relative" as any, zIndex:1 },
  vacio:       { textAlign:"center" as any, color:"#999", padding:"60px" },
  lista:       { display:"flex", flexDirection:"column" as any, gap:"2px" },
  card:        { display:"flex", alignItems:"center", gap:"20px", padding:"20px 16px", borderBottom:"1px solid #f0ebe5", cursor:"pointer", transition:"background 0.2s" },
  cardNum:     { fontSize:"24px", fontWeight:"800", color:"rgba(44,24,16,0.15)", minWidth:"40px" },
  cardInfo:    { flex:1 },
  cardFecha:   { fontSize:"11px", color:"#C0392B", fontWeight:"600", textTransform:"uppercase" as any, letterSpacing:"1px" },
  cardTitulo:  { fontSize:"15px", fontWeight:"700", color:"#2C1810", margin:"4px 0 6px" },
  cardDesc:    { fontSize:"13px", color:"#888", margin:0, lineHeight:1.5 },
  cardArrow:   { color:"#2C1810", fontSize:"18px", fontWeight:"bold" },
  overlay:     { position:"fixed" as any, inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:       { background:"#fff", borderRadius:"12px", padding:"40px", width:"100%", maxWidth:"600px", maxHeight:"85vh", overflowY:"auto" as any, position:"relative" as any },
  btnCerrar:   { position:"absolute" as any, top:"16px", right:"16px", background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#999" },
  modalFecha:  { fontSize:"11px", color:"#C0392B", fontWeight:"700", letterSpacing:"2px", textTransform:"uppercase" as any, margin:"0 0 8px" },
  modalTitulo: { fontSize:"22px", fontWeight:"800", color:"#2C1810", margin:"0 0 20px" },
  modalContenido: { fontSize:"14px", color:"#444", lineHeight:1.8, whiteSpace:"pre-wrap" as any },
  footer:      { background:"#1a1a1a", color:"#666", textAlign:"center" as any, padding:"20px", fontSize:"12px", marginTop:"60px" },
};
