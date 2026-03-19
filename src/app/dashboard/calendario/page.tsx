"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Publicacion = { id: number; titulo: string; contenido: string; creadoEn: string };

const ROLES_PERMITIDOS = ["TUTOR", "ESTUDIANTE", "ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE"];

export default function CalendarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [eventos, setEventos] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/comunicaciones")
      .then(r => r.json())
      .then(d => {
        setEventos((d.publicaciones || []).filter((p: Publicacion) => (p as any).tipo === "NOTIFICACION"));
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

  const hoy    = new Date();
  const mes    = hoy.toLocaleDateString("es-DO", { month: "long", year: "numeric" });

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📅 Calendario Escolar</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>
      <div style={s.contenido}>
        <h1 style={s.titulo}>Calendario Escolar</h1>
        <p style={s.subtitulo}>Eventos y fechas importantes — {mes}</p>

        {cargando ? <div style={s.vacio}>Cargando...</div> :
          eventos.length === 0 ? (
            <div style={s.vacio}>No hay eventos programados.</div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {eventos.map(e => (
              <div key={e.id} style={s.eventoCard}>
                <div style={s.eventoFecha}>
                  <span style={s.eventoMes}>{new Date(e.creadoEn).toLocaleDateString("es-DO", { month: "short" }).toUpperCase()}</span>
                  <span style={s.eventoDia}>{new Date(e.creadoEn).getDate()}</span>
                </div>
                <div>
                  <h3 style={s.eventoTitulo}>{e.titulo}</h3>
                  <p style={s.eventoDesc}>{e.contenido}</p>
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
  eventoCard:  { background: "#fff", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", gap: "16px", alignItems: "flex-start" },
  eventoFecha: { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", borderRadius: "8px", padding: "8px 12px", textAlign: "center" as any, minWidth: "50px" },
  eventoMes:   { display: "block", fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: "bold" },
  eventoDia:   { display: "block", fontSize: "20px", color: "#fff", fontWeight: "bold" },
  eventoTitulo:{ fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  eventoDesc:  { fontSize: "13px", color: "#555", margin: 0 },
};
