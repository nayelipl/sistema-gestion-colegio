"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Estudiante = {
  id: number; codigo: string; nombre: string; apellido: string;
  cedula?: string; RNE?: string;
  seccion?: { nombre: string; curso: { nombre: string } } | null;
};
type Calificacion = {
  id: number; periodo: string; notaFinal: number; condicion: string; publicado: boolean;
  asignatura: { nombre: string };
};

export default function RepresentadosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [representados, setRepresentados] = useState<Estudiante[]>([]);
  const [seleccionado, setSeleccionado]   = useState<Estudiante | null>(null);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tutor/representados")
      .then(r => r.json())
      .then(d => { setRepresentados(d.estudiantes || []); setCargando(false); });
  }, [status]);

  useEffect(() => {
    if (!seleccionado) return;
    fetch(`/api/calificaciones?estudianteId=${seleccionado.id}`)
      .then(r => r.json())
      .then(d => setCalificaciones(d.calificaciones || []));
  }, [seleccionado]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "TUTOR" && rol !== "ADMINISTRADOR") {
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
        <span style={s.navTitle}>👨‍👧 Mis Representados</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <h1 style={s.titulo}>Mis Representados</h1>
        <p style={s.subtitulo}>Calificaciones, asistencia y horario de tus hijos</p>

        {cargando ? <div style={s.vacio}>Cargando...</div> :
          representados.length === 0 ? (
            <div style={s.vacio}>No tienes estudiantes vinculados a tu cuenta.</div>
          ) : (
          <>
            <div style={s.grid}>
              {representados.map(e => (
                <div key={e.id}
                  style={{ ...s.tarjeta, ...(seleccionado?.id === e.id ? s.tarjetaActiva : {}) }}
                  onClick={() => setSeleccionado(e)}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎒</div>
                  <h3 style={s.tarjetaNombre}>{e.nombre} {e.apellido}</h3>
                  <p style={s.tarjetaDesc}>Código: {e.codigo}</p>
                  {e.seccion && <p style={s.tarjetaDesc}>{e.seccion.curso.nombre} — {e.seccion.nombre}</p>}
                </div>
              ))}
            </div>

            {seleccionado && (
              <div style={s.detalleCard}>
                <h2 style={s.detalleTitulo}>📊 Calificaciones de {seleccionado.nombre}</h2>
                {calificaciones.length === 0 ? (
                  <div style={s.vacio}>No hay calificaciones publicadas aún.</div>
                ) : (
                  <div style={s.tablaWrap}>
                    <table style={s.tabla}>
                      <thead><tr style={s.thead}>
                        <th style={s.th}>Asignatura</th>
                        <th style={s.th}>Período</th>
                        <th style={s.th}>Nota</th>
                        <th style={s.th}>Condición</th>
                      </tr></thead>
                      <tbody>
                        {calificaciones
                          .filter(c => c.publicado === true)
                          .map((c, i) => (
                          <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                            <td style={s.td}>{c.asignatura.nombre}</td>
                            <td style={s.td}><span style={s.periodoBadge}>{c.periodo}</span></td>
                            <td style={s.td}><span style={c.notaFinal >= 70 ? s.aprobado : s.reprobado}>{c.notaFinal}</span></td>
                            <td style={s.td}><span style={c.notaFinal >= 70 ? s.aprobado : s.reprobado}>{c.notaFinal >= 70 ? "Aprobado" : "Reprobado"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
  enlace:       { color: "#2C1810", fontWeight: "bold" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:      { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navUser:      { fontSize: "14px" },
  contenido:    { maxWidth: "1000px", margin: "0 auto", padding: "28px 20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", marginBottom: "24px" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" },
  tarjeta:      { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer", borderTop: "3px solid #ddd", textAlign: "center" as any },
  tarjetaActiva:{ borderTop: "3px solid #1F5C99", background: "#EBF3FB" },
  tarjetaNombre:{ fontSize: "14px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  tarjetaDesc:  { fontSize: "12px", color: "#666", margin: "2px 0" },
  detalleCard:  { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  detalleTitulo:{ fontSize: "16px", fontWeight: "bold", color: "#2C1810", margin: "0 0 16px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888" },
  tablaWrap:    { overflowX: "auto" as any },
  tabla:        { width: "100%", borderCollapse: "collapse" as any },
  thead:        { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:           { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:           { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  periodoBadge: { background: "#EBF3FB", color: "#2C1810", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  aprobado:     { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  reprobado:    { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
};
