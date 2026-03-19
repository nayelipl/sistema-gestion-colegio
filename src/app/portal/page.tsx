"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Publicacion = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string };

export default function PortalPage() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);

  useEffect(() => {
    fetch("/api/comunicaciones")
      .then(r => r.json())
      .then(d => setPublicaciones((d.publicaciones || []).filter((p: Publicacion) => p.tipo === "BLOG")));
  }, []);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <span style={s.navLogo}>🏫 Sistema de Gestión de Colegio</span>
        <div style={s.navLinks}>
          <a href="#inicio"    style={s.navLink}>Inicio</a>
          <a href="#admisiones" style={s.navLink}>Admisiones</a>
          <a href="#blog"      style={s.navLink}>Blog</a>
          <a href="#contacto"  style={s.navLink}>Contacto</a>
          <Link href="/login"  style={s.btnLogin}>Iniciar sesión</Link>
          <Link href="/registro" style={s.btnRegistro}>Registrarse</Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="inicio" style={s.hero}>
        <div style={s.heroContenido}>
          <h1 style={s.heroTitulo}>Bienvenido a nuestro Colegio</h1>
          <p style={s.heroSubtitulo}>
            Formando estudiantes con valores, conocimiento y visión de futuro.
            Una institución comprometida con la excelencia educativa.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/registro" style={s.btnHero}>📝 Regístrate ahora</Link>
            <a href="#admisiones" style={s.btnHeroSecundario}>Proceso de admisión</a>
          </div>
        </div>
      </section>

      {/* Admisiones */}
      <section id="admisiones" style={s.seccion}>
        <div style={s.seccionContenido}>
          <h2 style={s.seccionTitulo}>Proceso de Admisiones</h2>
          <p style={s.seccionDesc}>Conoce los pasos para inscribir a tu hijo en nuestra institución.</p>
          <div style={s.pasoGrid}>
            {[
              { num: "1", titulo: "Solicitud", desc: "Completa el formulario de solicitud de admisión en nuestras oficinas." },
              { num: "2", titulo: "Documentos", desc: "Entrega los documentos requeridos: acta de nacimiento, fotos, certificados." },
              { num: "3", titulo: "Entrevista", desc: "El estudiante y sus tutores asisten a una entrevista con la dirección." },
              { num: "4", titulo: "Matrícula", desc: "Una vez aprobado, procede con el pago de matrícula y uniformes." },
            ].map(paso => (
              <div key={paso.num} style={s.pasoCard}>
                <div style={s.pasoNum}>{paso.num}</div>
                <h3 style={s.pasoTitulo}>{paso.titulo}</h3>
                <p style={s.pasoDesc}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section id="blog" style={{ ...s.seccion, background: "#f0f4f8" }}>
        <div style={s.seccionContenido}>
          <h2 style={s.seccionTitulo}>Blog Institucional</h2>
          <p style={s.seccionDesc}>Últimas noticias y actividades del colegio.</p>
          {publicaciones.length === 0 ? (
            <p style={{ textAlign: "center", color: "#888" }}>No hay publicaciones disponibles.</p>
          ) : (
            <div style={s.blogGrid}>
              {publicaciones.slice(0, 3).map(p => (
                <div key={p.id} style={s.blogCard}>
                  <p style={s.blogFecha}>{new Date(p.creadoEn).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</p>
                  <h3 style={s.blogTitulo}>{p.titulo}</h3>
                  <p style={s.blogContenido}>{p.contenido.slice(0, 120)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" style={s.seccion}>
        <div style={s.seccionContenido}>
          <h2 style={s.seccionTitulo}>Contacto</h2>
          <div style={s.contactoGrid}>
            {[
              { icono: "📍", titulo: "Dirección", desc: "Santo Domingo, República Dominicana" },
              { icono: "📞", titulo: "Teléfono", desc: "(809) 955-0000" },
              { icono: "✉️", titulo: "Correo", desc: "info@colegio.edu.do" },
              { icono: "🕐", titulo: "Horario", desc: "Lunes a Viernes, 7:30 AM – 4:00 PM" },
            ].map(item => (
              <div key={item.titulo} style={s.contactoCard}>
                <div style={s.contactoIcono}>{item.icono}</div>
                <h3 style={s.contactoTitulo}>{item.titulo}</h3>
                <p style={s.contactoDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={s.footer}>
        <p>© 2026 Sistema de Gestión de Colegio — Todos los derechos reservados</p>
        <p style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
          <Link href="/login" style={{ color: "#fff" }}>Iniciar sesión</Link>
          {" · "}
          <Link href="/registro" style={{ color: "#fff" }}>Registrarse</Link>
        </p>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main:            { fontFamily: "Arial, sans-serif", minHeight: "100vh" },
  nav:             { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", padding: "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as any, top: 0, zIndex: 100 },
  navLogo:         { color: "#fff", fontWeight: "bold", fontSize: "16px" },
  navLinks:        { display: "flex", alignItems: "center", gap: "20px" },
  navLink:         { color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "14px" },
  btnLogin:        { background: "rgba(255,255,255,0.15)", color: "#fff", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "600" },
  btnRegistro:     { background: "#fff", color: "#1F5C99", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "bold" },
  hero:            { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", padding: "80px 40px", textAlign: "center" as any },
  heroContenido:   { maxWidth: "700px", margin: "0 auto" },
  heroTitulo:      { fontSize: "36px", fontWeight: "bold", color: "#fff", margin: "0 0 16px" },
  heroSubtitulo:   { fontSize: "16px", color: "rgba(255,255,255,0.85)", margin: "0 0 32px", lineHeight: "1.6" },
  btnHero:         { background: "#fff", color: "#1F5C99", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontSize: "15px", fontWeight: "bold" },
  btnHeroSecundario:{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontSize: "15px" },
  seccion:         { padding: "60px 40px", background: "#fff" },
  seccionContenido:{ maxWidth: "1000px", margin: "0 auto" },
  seccionTitulo:   { fontSize: "28px", fontWeight: "bold", color: "#1F5C99", textAlign: "center" as any, margin: "0 0 8px" },
  seccionDesc:     { fontSize: "14px", color: "#888", textAlign: "center" as any, margin: "0 0 40px" },
  pasoGrid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" },
  pasoCard:        { background: "#f0f4f8", borderRadius: "12px", padding: "24px", textAlign: "center" as any },
  pasoNum:         { width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", fontSize: "18px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  pasoTitulo:      { fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 8px" },
  pasoDesc:        { fontSize: "13px", color: "#555", margin: 0, lineHeight: "1.5" },
  blogGrid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  blogCard:        { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  blogFecha:       { fontSize: "11px", color: "#999", margin: "0 0 6px" },
  blogTitulo:      { fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 8px" },
  blogContenido:   { fontSize: "13px", color: "#555", lineHeight: "1.6", margin: 0 },
  contactoGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" },
  contactoCard:    { textAlign: "center" as any, padding: "20px" },
  contactoIcono:   { fontSize: "32px", marginBottom: "8px" },
  contactoTitulo:  { fontSize: "14px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  contactoDesc:    { fontSize: "13px", color: "#666", margin: 0 },
  footer:          { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", textAlign: "center" as any, padding: "24px", fontSize: "13px" },
};
