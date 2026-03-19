"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notificacion = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string };

export default function NotificacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/comunicaciones")
      .then(r => r.json())
      .then(d => {
        setNotificaciones(d.publicaciones || []);
        setCargando(false);
      });
  }, []);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🔔 Notificaciones</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>
      <div style={s.contenido}>
        <h1 style={s.titulo}>Centro de Notificaciones</h1>
        <p style={s.subtitulo}>Comunicados y recordatorios del colegio</p>
        {cargando ? <div style={s.vacio}>Cargando...</div> :
          notificaciones.length === 0 ? <div style={s.vacio}>No hay notificaciones.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notificaciones.map(n => (
              <div key={n.id} style={s.notiCard}>
                <div style={s.notiIcono}>🔔</div>
                <div>
                  <h3 style={s.notiTitulo}>{n.titulo}</h3>
                  <p style={s.notiContenido}>{n.contenido}</p>
                  <p style={s.notiFecha}>{new Date(n.creadoEn).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:      { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navUser:      { fontSize: "14px" },
  contenido:    { maxWidth: "800px", margin: "0 auto", padding: "28px 20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", marginBottom: "24px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  notiCard:     { background: "#fff", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", gap: "16px", alignItems: "flex-start" },
  notiIcono:    { fontSize: "24px" },
  notiTitulo:   { fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  notiContenido:{ fontSize: "13px", color: "#555", margin: "0 0 4px" },
  notiFecha:    { fontSize: "11px", color: "#999", margin: 0 },
  sinAcceso:    { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:       { color: "#1F5C99", fontWeight: "bold" },
};
