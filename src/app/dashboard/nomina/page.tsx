"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Empleado = {
  id: number; nombre: string; apellido: string;
  email: string; salario?: number; activo: boolean;
};

export default function NominaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando]   = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => { setEmpleados(d.empleados || []); setCargando(false); });
  }, []);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "DIRECTOR_ADMINISTRATIVO" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const activos       = empleados.filter(e => e.activo);
  const totalNomina   = activos.reduce((sum, e) => sum + (Number(e.salario) || 0), 0);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>💵 Nómina</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Control de Nómina</h1>
            <p style={s.subtitulo}>Resumen de pagos del personal activo</p>
          </div>
        </div>

        <div style={s.resumenGrid}>
          <div style={s.resumenCard}>
            <p style={s.resumenLabel}>Total empleados activos</p>
            <p style={s.resumenValor}>{activos.length}</p>
          </div>
          <div style={s.resumenCard}>
            <p style={s.resumenLabel}>Total nómina mensual</p>
            <p style={s.resumenValor}>RD$ {totalNomina.toLocaleString()}</p>
          </div>
        </div>

        {cargando ? (
          <div style={s.vacio}>Cargando...</div>
        ) : activos.length === 0 ? (
          <div style={s.vacio}>No hay empleados activos.</div>
        ) : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Empleado</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Salario mensual</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}>{e.nombre} {e.apellido}</td>
                    <td style={s.td}>{e.email}</td>
                    <td style={s.td}>
                      {e.salario ? `RD$ ${Number(e.salario).toLocaleString()}` : <span style={{ color: "#999" }}>No asignado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  contenido:   { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  header:      { marginBottom: "24px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", margin: 0 },
  resumenGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" },
  resumenCard: { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderTop: "3px solid #1F5C99" },
  resumenLabel:{ fontSize: "12px", color: "#666", margin: "0 0 8px" },
  resumenValor:{ fontSize: "24px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  vacio:       { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:   { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:       { width: "100%", borderCollapse: "collapse" as any },
  thead:       { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:          { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:          { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
};
