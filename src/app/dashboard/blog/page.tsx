"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Publicacion = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string };

const ROLES_PERMITIDOS = ["TUTOR", "ESTUDIANTE", "ADMINISTRADOR", "ORIENTADOR_ESCOLAR"];

export default function BlogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/comunicaciones")
      .then(r => r.json())
      .then(d => {
        setPublicaciones((d.publicaciones || []).filter((p: Publicacion) => p.tipo === "BLOG"));
        setCargando(false);
      });
  }, []);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📰 Blog Institucional</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>
      <div style={s.contenido}>
        <h1 style={s.titulo}>Blog Institucional</h1>
        <p style={s.subtitulo}>Publicaciones y noticias del colegio</p>
        {cargando ? <div style={s.vacio}>Cargando...</div> :
          publicaciones.length === 0 ? <div style={s.vacio}>No hay publicaciones disponibles.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {publicaciones.map(p => (
              <div key={p.id} style={s.pubCard}>
                <h3 style={s.pubTitulo}>{p.titulo}</h3>
                <p style={s.pubFecha}>{new Date(p.creadoEn).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</p>
                <p style={s.pubContenido}>{p.contenido}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:      { color: "#1F5C99", fontWeight: "bold" },
  main:        { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:         { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:     { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:    { fontWeight: "bold", fontSize: "16px" },
  navUser:     { fontSize: "14px" },
  contenido:   { maxWidth: "800px", margin: "0 auto", padding: "28px 20px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", marginBottom: "24px" },
  vacio:       { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  pubCard:     { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  pubTitulo:   { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 6px" },
  pubFecha:    { fontSize: "12px", color: "#999", margin: "0 0 12px" },
  pubContenido:{ fontSize: "14px", color: "#555", lineHeight: "1.7", margin: 0 },
};
