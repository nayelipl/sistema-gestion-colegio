"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Calificacion = {
  id: number; periodo: string; nota: number; estado: string;
  estudiante: { nombre: string; apellido: string; codigo: string };
  asignatura: { nombre: string; codigo: string };
};
type Publicacion = { id: number; titulo: string; contenido: string; tipo: string; creadoEn: string };
type Tab = "calificaciones" | "blog";

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "ORIENTADOR_ESCOLAR"];

export default function OrientacionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [publicaciones, setPublicaciones]   = useState<Publicacion[]>([]);
  const [tab, setTab]       = useState<Tab>("calificaciones");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/calificaciones").then(r => r.json()),
      fetch("/api/comunicaciones").then(r => r.json()),
    ]).then(([c, p]) => {
      setCalificaciones(c.calificaciones || []);
      // Solo publicaciones de tipo BLOG u ORIENTACION
      setPublicaciones(
        (p.publicaciones || []).filter((pub: Publicacion) =>
          pub.tipo === "BLOG" || pub.tipo === "ORIENTACION"
        )
      );
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

  // Filtrar calificaciones por búsqueda y solo PUBLICADAS
  const calFiltradas = calificaciones
    .filter(c => c.estado === "PUBLICADA")
    .filter(c =>
      `${c.estudiante.nombre} ${c.estudiante.apellido} ${c.estudiante.codigo} ${c.asignatura.nombre}`
        .toLowerCase().includes(busqueda.toLowerCase())
    );

  // Estudiantes con calificaciones bajas (menos de 70)
  const estudiantesEnRiesgo = [
    ...new Map(
      calFiltradas
        .filter(c => c.nota < 70)
        .map(c => [c.estudiante.codigo, c.estudiante])
    ).values()
  ];

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🧭 Orientación Escolar</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Orientación Escolar</h1>
          <p style={s.subtitulo}>Seguimiento académico y publicaciones de orientación</p>
        </div>

        {/* Resumen de estudiantes en riesgo */}
        {estudiantesEnRiesgo.length > 0 && (
          <div style={s.alertaCard}>
            <strong>⚠️ Estudiantes con materias reprobadas: {estudiantesEnRiesgo.length}</strong>
            <p style={{ fontSize: "13px", margin: "6px 0 0", color: "#744210" }}>
              {estudiantesEnRiesgo.map(e => `${e.nombre} ${e.apellido}`).join(", ")}
            </p>
          </div>
        )}

        <div style={s.tabs}>
          <button onClick={() => setTab("calificaciones")}
            style={{ ...s.tab, ...(tab === "calificaciones" ? s.tabActivo : {}) }}>
            📝 Calificaciones ({calFiltradas.length})
          </button>
          <button onClick={() => setTab("blog")}
            style={{ ...s.tab, ...(tab === "blog" ? s.tabActivo : {}) }}>
            📰 Blog de Orientación ({publicaciones.length})
          </button>
        </div>

        {cargando ? <div style={s.vacio}>Cargando...</div> : (
          <>
            {tab === "calificaciones" && (
              <>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por estudiante o asignatura..."
                  style={s.inputBusqueda} />

                {calFiltradas.length === 0 ? (
                  <div style={s.vacio}>No hay calificaciones publicadas.</div>
                ) : (
                  <div style={s.tablaWrap}>
                    <table style={s.tabla}>
                      <thead><tr style={s.thead}>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Código</th>
                        <th style={s.th}>Asignatura</th>
                        <th style={s.th}>Período</th>
                        <th style={s.th}>Nota</th>
                        <th style={s.th}>Condición</th>
                      </tr></thead>
                      <tbody>
                        {calFiltradas.map((c, i) => (
                          <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                            <td style={s.td}>{c.estudiante.nombre} {c.estudiante.apellido}</td>
                            <td style={s.td}><code style={s.codigo}>{c.estudiante.codigo}</code></td>
                            <td style={s.td}>{c.asignatura.nombre}</td>
                            <td style={s.td}><span style={s.periodoBadge}>{c.periodo}</span></td>
                            <td style={s.td}><span style={c.nota >= 70 ? s.aprobado : s.reprobado}>{c.nota}</span></td>
                            <td style={s.td}><span style={c.nota >= 70 ? s.aprobado : s.reprobado}>{c.nota >= 70 ? "Aprobado" : "Reprobado"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "blog" && (
              publicaciones.length === 0 ? (
                <div style={s.vacio}>No hay publicaciones de orientación.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {publicaciones.map(p => (
                    <div key={p.id} style={s.pubCard}>
                      <span style={s.tipoBadge}>{p.tipo === "BLOG" ? "Blog" : "Orientación"}</span>
                      <h3 style={s.pubTitulo}>{p.titulo}</h3>
                      <p style={s.pubFecha}>
                        {new Date(p.creadoEn).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <p style={s.pubContenido}>{p.contenido}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
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
  contenido:    { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:       { marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  alertaCard:   { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", color: "#744210" },
  tabs:         { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:          { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:    { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  inputBusqueda:{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:    { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  codigo:       { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  periodoBadge: { background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  aprobado:     { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  reprobado:    { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  pubCard:      { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tipoBadge:    { background: "#F3E8FF", color: "#5D2F7D", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold", display: "inline-block", marginBottom: "8px" },
  pubTitulo:    { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  pubFecha:     { fontSize: "12px", color: "#999", margin: "0 0 8px" },
  pubContenido: { fontSize: "13px", color: "#555", lineHeight: "1.6", margin: 0 },
};
