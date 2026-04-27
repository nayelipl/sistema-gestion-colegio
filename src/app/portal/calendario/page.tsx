"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const MESES = ["AGO","SEP","OCT","NOV","DIC","ENE","FEB","MAR","ABR","MAY","JUN"];
const MESES_FULL = ["Agosto","Septiembre","Octubre","Noviembre","Diciembre","Enero","Febrero","Marzo","Abril","Mayo","Junio"];
const MESES_NUM  = [8,9,10,11,12,1,2,3,4,5,6];

type Evento = { id: number; titulo: string; descripcion: string; fechaInicio: string; fechaFin: string; tipo: string; publicado: boolean };

export default function CalendarioPortalPage() {
  const [eventos, setEventos]   = useState<Evento[]>([]);
  const [mesIdx, setMesIdx]     = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Detectar mes actual para seleccionar por defecto
    const mesActual = new Date().getMonth() + 1;
    const idx = MESES_NUM.findIndex(m => m === mesActual);
    if (idx >= 0) setMesIdx(idx);

    fetch("/api/calendario?anio=2026").then(r => r.json()).then(d => {
      setEventos((d.eventos || []).filter((e: Evento) => e.publicado));
      setCargando(false);
    });
  }, []);

  const mesNum = MESES_NUM[mesIdx];
  const eventosMes = eventos.filter(ev => {
    const m = new Date(ev.fechaInicio).getMonth() + 1;
    return m === mesNum;
  }).sort((a, b) => new Date(a.fechaInicio).getDate() - new Date(b.fechaInicio).getDate());

  const formatFecha = (ev: Evento) => {
    const inicio = new Date(ev.fechaInicio).getDate();
    const fin    = new Date(ev.fechaFin).getDate();
    if (inicio === fin) return String(inicio).padStart(2, "0");
    return `${String(inicio).padStart(2,"0")}-${String(fin).padStart(2,"0")}`;
  };

  const esImportante = (ev: Evento) => ["INICIO_CLASES","FIN_CLASES","EXAMEN","RECESO"].includes(ev.tipo);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/portal" style={s.navLogo}>🏫 <strong>Colegio</strong></Link>
        <div style={s.navLinks}>
          <Link href="/portal/calendario" style={{...s.navLink, color:"#2C1810", fontWeight:"700"}}>📅 Calendario</Link>
          <Link href="/portal/circulares" style={s.navLink}>📋 Circulares</Link>
          <Link href="/login" style={s.navLink}>👤</Link>
          <Link href="/registro" style={s.btnAdmision}>Admisión</Link>
        </div>
      </nav>

      <div style={s.contenido}>
        <div style={s.tituloWrap}>
          <span style={s.tituloBg}>Calendario</span>
          <h1 style={s.titulo}>Calendario Escolar 2025-2026</h1>
        </div>

        <div style={s.mesesRow}>
          {MESES.map((m, i) => (
            <button key={m} onClick={() => setMesIdx(i)}
              style={{ ...s.mesBtn, ...(i === mesIdx ? s.mesBtnActivo : {}) }}>
              {m}
            </button>
          ))}
        </div>

        <div style={s.mesContenido}>
          <p style={s.mesLabel}>{MESES_FULL[mesIdx].toUpperCase()}</p>

          {cargando ? (
            <div style={s.vacio}>Cargando eventos...</div>
          ) : eventosMes.length === 0 ? (
            <div style={s.vacio}>No hay eventos publicados para este mes.</div>
          ) : (
            <table style={s.tabla}>
              <tbody>
                {eventosMes.map(ev => (
                  <tr key={ev.id} style={s.fila}>
                    <td style={{ ...s.tdFecha, fontWeight: esImportante(ev) ? "bold" : "normal" }}>
                      {formatFecha(ev)}
                    </td>
                    <td style={{ ...s.tdEvento, fontWeight: esImportante(ev) ? "bold" : "normal" }}>
                      {ev.titulo}
                      {ev.descripcion && <span style={s.desc}> — {ev.descripcion}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer style={s.footer}>
        <p>© {new Date().getFullYear()} Sistema de Gestión de Colegio · Santiago de los Caballeros, RD</p>
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
  tituloWrap:  { position:"relative" as any, textAlign:"center" as any, marginBottom:"32px" },
  tituloBg:    { position:"absolute" as any, top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:"80px", fontWeight:"900", color:"rgba(0,0,0,0.04)", whiteSpace:"nowrap" as any, pointerEvents:"none" as any, userSelect:"none" as any },
  titulo:      { fontSize:"28px", fontWeight:"800", color:"#2C1810", position:"relative" as any, zIndex:1 },
  mesesRow:    { display:"flex", gap:"6px", justifyContent:"center", flexWrap:"wrap" as any, marginBottom:"40px" },
  mesBtn:      { background:"#f5f0eb", border:"none", borderRadius:"4px", padding:"8px 14px", fontSize:"12px", fontWeight:"600", cursor:"pointer", color:"#555", letterSpacing:"1px" },
  mesBtnActivo:{ background:"#2C1810", color:"#fff" },
  mesContenido:{ maxWidth:"600px", margin:"0 auto" },
  mesLabel:    { fontSize:"11px", color:"#C0392B", fontWeight:"700", letterSpacing:"2px", marginBottom:"12px" },
  vacio:       { textAlign:"center" as any, color:"#999", padding:"40px" },
  tabla:       { width:"100%", borderCollapse:"collapse" as any },
  fila:        { borderBottom:"1px solid #f0ebe5" },
  tdFecha:     { padding:"12px 16px", fontSize:"14px", color:"#2C1810", width:"80px", verticalAlign:"top" as any },
  tdEvento:    { padding:"12px 16px", fontSize:"14px", color:"#333" },
  desc:        { color:"#888", fontWeight:"normal" },
  footer:      { background:"#1a1a1a", color:"#666", textAlign:"center" as any, padding:"20px", fontSize:"12px", marginTop:"60px" },
};
