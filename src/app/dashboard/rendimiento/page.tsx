"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Calificacion = {
  id: number; periodo: string; notaFinal: number; condicion: string; publicado: boolean;
  asignatura: { nombre: string; codigo: string };
};

export default function RendimientoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/estudiante/rendimiento")
      .then(r => r.json())
      .then(d => { setCalificaciones(d.calificaciones || []); setCargando(false); });
  }, [status]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "ESTUDIANTE" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const periodos   = [...new Set(calificaciones.map(c => c.periodo))].sort();
  const promedio   = calificaciones.length > 0
    ? (calificaciones.reduce((sum, c) => sum + c.notaFinal, 0) / calificaciones.length).toFixed(1)
    : "—";
  const aprobadas  = calificaciones.filter(c => c.notaFinal >= 70).length;
  const reprobadas = calificaciones.filter(c => c.notaFinal < 70).length;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📊 Mi Rendimiento</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <h1 style={s.titulo}>Mi Rendimiento Académico</h1>
        <p style={s.subtitulo}>Tus calificaciones publicadas por período</p>

        {cargando ? <div style={s.vacio}>Cargando...</div> : (
          <>
            <div style={s.resumenGrid}>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Promedio general</p>
                <p style={s.resumenValor}>{promedio}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Asignaturas aprobadas</p>
                <p style={{ ...s.resumenValor, color: "#276749" }}>{aprobadas}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Asignaturas reprobadas</p>
                <p style={{ ...s.resumenValor, color: "#c53030" }}>{reprobadas}</p>
              </div>
            </div>

            {calificaciones.length === 0 ? (
              <div style={s.vacio}>No tienes calificaciones publicadas aún.</div>
            ) : (
              periodos.map(periodo => (
                <div key={periodo} style={s.periodoCard}>
                  <h2 style={s.periodoTitulo}>Período {periodo}</h2>
                  <div style={s.tablaWrap}>
                    <table style={s.tabla}>
                      <thead><tr style={s.thead}>
                        <th style={s.th}>Asignatura</th>
                        <th style={s.th}>Nota</th>
                        <th style={s.th}>Condición</th>
                      </tr></thead>
                      <tbody>
                        {calificaciones
                          .filter(c => c.periodo === periodo && c.publicado === true)
                          .map((c, i) => (
                          <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                            <td style={s.td}>{c.asignatura.nombre}</td>
                            <td style={s.td}><span style={c.notaFinal >= 70 ? s.aprobado : s.reprobado}>{c.notaFinal}</span></td>
                            <td style={s.td}><span style={c.notaFinal >= 70 ? s.aprobado : s.reprobado}>{c.notaFinal >= 70 ? "Aprobado" : "Reprobado"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:      { color: "#2C1810", fontWeight: "bold" },
  main:        { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:         { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:     { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:    { fontWeight: "bold", fontSize: "16px" },
  navUser:     { fontSize: "14px" },
  contenido:   { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", marginBottom: "24px" },
  resumenGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  resumenCard: { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderTop: "3px solid #1F5C99", textAlign: "center" as any },
  resumenLabel:{ fontSize: "12px", color: "#666", margin: "0 0 8px" },
  resumenValor:{ fontSize: "28px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  periodoCard: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: "16px" },
  periodoTitulo:{ fontSize: "15px", fontWeight: "bold", color: "#2C1810", margin: "0 0 12px" },
  vacio:       { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:   { overflowX: "auto" as any },
  tabla:       { width: "100%", borderCollapse: "collapse" as any },
  thead:       { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:          { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:          { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  aprobado:    { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  reprobado:   { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
};
