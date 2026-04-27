"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Publicacion = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string };

const SLIDES = [
  { img: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80", titulo: "Bienvenidos a nuestro Colegio", sub: "Formando el futuro de Santiago" },
  { img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80", titulo: "Excelencia Académica", sub: "Comprometidos con la educación de calidad" },
  { img: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1600&q=80", titulo: "Valores y Comunidad", sub: "Una familia unida por el conocimiento" },
];

const STATS = [
  { valor: 800, sufijo: "+", label: "Estudiantes" },
  { valor: 60,  sufijo: "+", label: "Docentes" },
  { valor: 40,  sufijo: "+", label: "Años de historia" },
  { valor: 500, sufijo: "+", label: "Familias" },
];

function useContador(objetivo: number, activo: boolean, duracion = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!activo) return;
    let start = 0;
    const paso = objetivo / (duracion / 16);
    const timer = setInterval(() => {
      start += paso;
      if (start >= objetivo) { setCount(objetivo); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [activo, objetivo, duracion]);
  return count;
}

function StatCard({ valor, sufijo, label }: { valor: number; sufijo: string; label: string }) {
  const ref  = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState(false);
  const count = useContador(valor, activo);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActivo(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={s.statCard}>
      <span style={s.statValor}>{count}{sufijo}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

export default function PortalPage() {
  const [slide, setSlide]             = useState(0);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);

  useEffect(() => {
    fetch("/api/comunicaciones").then(r => r.json()).then(d => {
      const pubs = d.publicaciones || [];
      setPublicaciones(pubs.filter((p: Publicacion) => p.tipo === "BLOG"));
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.logoIcon}>🏫</div>
          <div>
            <div style={s.logoNombre}>Colegio</div>
            <div style={s.logoSub}>Sistema de Gestión</div>
          </div>
        </div>
        <div style={s.navLinks}>
          <Link href="/portal/calendario" style={s.navLink}>📅 Calendario</Link>
          <Link href="/portal/circulares" style={s.navLink}>📋 Circulares</Link>
          <a href="#contacto" style={s.navLink}>📍 Contacto</a>
          <Link href="/login" style={s.navLink}>👤</Link>
          <Link href="/registro" style={s.btnAdmision}>Admisión</Link>
        </div>
      </nav>

      <section style={{ ...s.hero, backgroundImage: `url(${SLIDES[slide].img})` }}>
        <div style={s.heroOverlay} />
        <div style={s.heroContenido}>
          <h1 style={s.heroTitulo}>{SLIDES[slide].titulo}</h1>
          <p style={s.heroSub}>{SLIDES[slide].sub}</p>
        </div>
        <button onClick={() => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length)} style={{ ...s.slideBtn, left:"20px" }}>←</button>
        <button onClick={() => setSlide(s => (s + 1) % SLIDES.length)} style={{ ...s.slideBtn, right:"20px" }}>→</button>
        <div style={s.slideDots}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ ...s.dot, ...(i === slide ? s.dotActivo : {}) }} />
          ))}
        </div>
        <div style={s.accesosRapidos}>
          <Link href="/portal/circulares" style={s.accesoCard}>
            <strong>CIRCULARES</strong>
            <span>2025-2026</span>
          </Link>
          <Link href="/portal/calendario" style={s.accesoCard}>
            <strong>CALENDARIO</strong>
            <span>2025-2026</span>
          </Link>
          <Link href="/registro" style={s.accesoCard}>
            <strong>ADMISIÓN</strong>
            <span>Inicia tu solicitud de ingreso.</span>
          </Link>
        </div>
      </section>

      <section style={s.statsSection}>
        {STATS.map(st => (
          <StatCard key={st.label} valor={st.valor} sufijo={st.sufijo} label={st.label} />
        ))}
      </section>

      {publicaciones.length > 0 && (
        <section style={{ ...s.seccion, background:"#fafaf8" }}>
          <div style={s.seccionContenido}>
            <p style={s.seccionEtiqueta}>VIDA COLEGIAL</p>
            <h2 style={s.seccionTitulo}>Últimas publicaciones</h2>
            <div style={s.galeriaGrid}>
              {publicaciones.slice(0, 3).map(p => (
                <div key={p.id} style={s.galeriaCard}>
                  <div style={s.galeriaImg}><span style={{ fontSize:"40px" }}>🏫</span></div>
                  <div style={s.galeriaInfo}>
                    <h3 style={s.galeriaTitulo}>{p.titulo}</h3>
                    <p style={s.galeriaDesc}>{p.contenido.slice(0, 80)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ ...s.seccion, background:"#2C1810" }}>
        <div style={s.seccionContenido}>
          <p style={{ ...s.seccionEtiqueta, color:"rgba(255,255,255,0.6)" }}>ÚNETE A NUESTRA FAMILIA</p>
          <h2 style={{ ...s.seccionTitulo, color:"#fff" }}>Proceso de Admisión</h2>
          <div style={s.pasosGrid}>
            {[
              { n:"01", t:"Registro", d:"Crea tu cuenta en el portal." },
              { n:"02", t:"Documentos", d:"Presenta los documentos requeridos." },
              { n:"03", t:"Entrevista", d:"Agenda una cita con orientación." },
              { n:"04", t:"Matrícula", d:"Completa el proceso de matrícula." },
            ].map(p => (
              <div key={p.n} style={s.pasoCard}>
                <span style={s.pasoNum}>{p.n}</span>
                <h3 style={s.pasoTitulo}>{p.t}</h3>
                <p style={s.pasoDesc}>{p.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:"32px" }}>
            <Link href="/registro" style={s.btnAdmisionHero}>Iniciar solicitud</Link>
          </div>
        </div>
      </section>

      <section id="contacto" style={{ ...s.seccion, background:"#f5f0eb" }}>
        <div style={s.seccionContenido}>
          <p style={s.seccionEtiqueta}>ENCUÉNTRANOS</p>
          <h2 style={s.seccionTitulo}>Contacto</h2>
          <div style={s.contactoGrid}>
            <div style={s.contactoCard}>
              <span style={s.contactoIcono}>📍</span>
              <div>
                <strong style={s.contactoLabel}>Dirección</strong>
                <p style={s.contactoValor}>Santiago de los Caballeros, República Dominicana</p>
              </div>
            </div>
            <div style={s.contactoCard}>
              <span style={s.contactoIcono}>📞</span>
              <div>
                <strong style={s.contactoLabel}>Teléfono</strong>
                <p style={s.contactoValor}>(809) 368-0055</p>
              </div>
            </div>
            <div style={s.contactoCard}>
              <span style={s.contactoIcono}>✉️</span>
              <div>
                <strong style={s.contactoLabel}>Correo electrónico</strong>
                <p style={s.contactoValor}>info@colegio.edu.do</p>
              </div>
            </div>
            <div style={s.contactoCard}>
              <span style={s.contactoIcono}>🕐</span>
              <div>
                <strong style={s.contactoLabel}>Horario de atención</strong>
                <p style={s.contactoValor}>Lunes a Viernes · 7:30 AM – 4:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={s.footer}>
        <div style={s.footerContenido}>
          <div>
            <strong style={{ fontSize:"16px", color:"#fff" }}>🏫 Colegio</strong>
            <p style={s.footerDesc}>Santiago de los Caballeros, República Dominicana</p>
            <p style={s.footerDesc}>(809) 368-0055 · info@colegio.edu.do</p>
          </div>
          <div style={s.footerLinks}>
            <Link href="/portal/calendario" style={s.footerLink}>Calendario</Link>
            <Link href="/portal/circulares" style={s.footerLink}>Circulares</Link>
            <Link href="/registro" style={s.footerLink}>Admisión</Link>
            <Link href="/login" style={s.footerLink}>Acceso</Link>
          </div>
        </div>
        <p style={s.footerCopy}>© {new Date().getFullYear()} Sistema de Gestión de Colegio. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main:             { fontFamily:"'Segoe UI', Arial, sans-serif", color:"#222", background:"#fff" },
  nav:              { background:"#fff", padding:"12px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #eee", position:"sticky" as any, top:0, zIndex:100, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  navLogo:          { display:"flex", alignItems:"center", gap:"12px" },
  logoIcon:         { fontSize:"28px" },
  logoNombre:       { fontWeight:"800", fontSize:"15px", color:"#2C1810", letterSpacing:"1px", textTransform:"uppercase" as any },
  logoSub:          { fontSize:"10px", color:"#888", letterSpacing:"1px" },
  navLinks:         { display:"flex", alignItems:"center", gap:"24px" },
  navLink:          { color:"#333", textDecoration:"none", fontSize:"14px", fontWeight:"500" },
  btnAdmision:      { background:"#C0392B", color:"#fff", borderRadius:"20px", padding:"8px 20px", fontSize:"13px", fontWeight:"bold", textDecoration:"none" },
  hero:             { position:"relative" as any, minHeight:"85vh", display:"flex", flexDirection:"column" as any, justifyContent:"center", alignItems:"center", backgroundSize:"cover", backgroundPosition:"center" },
  heroOverlay:      { position:"absolute" as any, inset:0, background:"rgba(0,0,0,0.5)" },
  heroContenido:    { position:"relative" as any, zIndex:2, textAlign:"center" as any, padding:"0 20px", marginBottom:"140px" },
  heroTitulo:       { fontSize:"48px", fontWeight:"800", color:"#fff", margin:"0 0 16px", textShadow:"0 2px 8px rgba(0,0,0,0.4)" },
  heroSub:          { fontSize:"18px", color:"rgba(255,255,255,0.9)", margin:0 },
  slideBtn:         { position:"absolute" as any, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:"20px", width:"44px", height:"44px", borderRadius:"50%", cursor:"pointer", zIndex:3 },
  slideDots:        { position:"absolute" as any, bottom:"145px", display:"flex", gap:"8px", zIndex:3 },
  dot:              { width:"8px", height:"8px", borderRadius:"50%", background:"rgba(255,255,255,0.4)", border:"none", cursor:"pointer", padding:0 },
  dotActivo:        { background:"#fff", width:"24px", borderRadius:"4px" },
  accesosRapidos:   { position:"absolute" as any, bottom:0, display:"flex", gap:"2px", zIndex:3, width:"100%", maxWidth:"780px" },
  accesoCard:       { flex:1, background:"rgba(44,24,16,0.92)", color:"#fff", padding:"20px 24px", display:"flex", flexDirection:"column" as any, gap:"6px", textDecoration:"none", backdropFilter:"blur(4px)" },
  statsSection:     { display:"flex", justifyContent:"center", background:"#f5f0eb", borderBottom:"1px solid #e8e0d8" },
  statCard:         { flex:1, display:"flex", flexDirection:"column" as any, alignItems:"center", padding:"32px 20px", borderRight:"1px solid #e8e0d8", gap:"4px" },
  statValor:        { fontSize:"36px", fontWeight:"800", color:"#2C1810" },
  statLabel:        { fontSize:"13px", color:"#888", textTransform:"uppercase" as any, letterSpacing:"1px" },
  seccion:          { padding:"64px 32px", background:"#fff" },
  seccionContenido: { maxWidth:"1100px", margin:"0 auto" },
  seccionEtiqueta:  { fontSize:"11px", fontWeight:"700", color:"#C0392B", letterSpacing:"2px", textTransform:"uppercase" as any, margin:"0 0 8px" },
  seccionTitulo:    { fontSize:"32px", fontWeight:"800", color:"#2C1810", margin:"0 0 32px" },
  galeriaGrid:      { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"16px" },
  galeriaCard:      { borderRadius:"8px", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" },
  galeriaImg:       { background:"#e8e0d8", height:"200px", display:"flex", alignItems:"center", justifyContent:"center" },
  galeriaInfo:      { padding:"16px" },
  galeriaTitulo:    { fontSize:"14px", fontWeight:"700", color:"#2C1810", margin:"0 0 6px" },
  galeriaDesc:      { fontSize:"13px", color:"#666", margin:0 },
  pasosGrid:        { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"20px" },
  pasoCard:         { display:"flex", flexDirection:"column" as any, gap:"8px" },
  pasoNum:          { fontSize:"32px", fontWeight:"800", color:"rgba(255,255,255,0.2)" },
  pasoTitulo:       { fontSize:"16px", fontWeight:"700", color:"#fff", margin:0 },
  pasoDesc:         { fontSize:"13px", color:"rgba(255,255,255,0.7)", margin:0 },
  btnAdmisionHero:  { background:"#C0392B", color:"#fff", borderRadius:"20px", padding:"12px 32px", fontSize:"15px", fontWeight:"bold", textDecoration:"none" },
  contactoGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"20px" },
  contactoCard:     { background:"#fff", borderRadius:"10px", padding:"20px", display:"flex", gap:"14px", alignItems:"flex-start", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  contactoIcono:    { fontSize:"24px", flexShrink:0 },
  contactoLabel:    { fontSize:"12px", color:"#888", textTransform:"uppercase" as any, letterSpacing:"1px", display:"block", marginBottom:"4px" },
  contactoValor:    { fontSize:"14px", color:"#2C1810", fontWeight:"600", margin:0 },
  footer:           { background:"#1a1a1a", color:"#999", padding:"40px 40px 20px" },
  footerContenido:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"32px", flexWrap:"wrap" as any, gap:"20px" },
  footerDesc:       { fontSize:"13px", color:"#666", margin:"4px 0 0" },
  footerLinks:      { display:"flex", gap:"24px", flexWrap:"wrap" as any },
  footerLink:       { color:"#999", textDecoration:"none", fontSize:"13px" },
  footerCopy:       { borderTop:"1px solid #333", paddingTop:"20px", fontSize:"12px", textAlign:"center" as any },
};
