"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Empleado = {
  id: number; nombre: string; apellido: string; cedula: string;
  email: string; telefono?: string; salario?: number; activo: boolean;
};

const ROLES_LABELS: Record<string, string> = {
  ADMINISTRADOR:           "Administrador",
  DIRECTOR_ADMINISTRATIVO: "Director Administrativo",
  CONTADOR:                "Contador",
  CAJERO:                  "Cajero",
  DIRECCION_ACADEMICA:     "Dirección Académica",
  COORDINACION_ACADEMICA:  "Coordinación Académica",
  SECRETARIA_DOCENTE:      "Secretaría Docente",
  ORIENTADOR_ESCOLAR:      "Orientador Escolar",
  MAESTRO:                 "Maestro",
};

export default function EmpleadosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState("");

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

  const listaFiltrada = empleados.filter(e =>
    `${e.nombre} ${e.apellido} ${e.cedula} ${e.email}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>👨‍💼 Gestión de Empleados</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Plantilla de Empleados</h1>
            <p style={s.subtitulo}>Personal académico y administrativo del colegio</p>
          </div>
        </div>

        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, cédula o correo..."
          style={s.inputBusqueda}
        />

        {cargando ? (
          <div style={s.vacio}>Cargando...</div>
        ) : listaFiltrada.length === 0 ? (
          <div style={s.vacio}>No hay empleados registrados.</div>
        ) : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Nombre completo</th>
                  <th style={s.th}>Cédula</th>
                  <th style={s.th}>Rol</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Teléfono</th>
                  <th style={s.th}>Salario (RD$)</th>
                  <th style={s.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}>{e.nombre} {e.apellido}</td>
                    <td style={s.td}>{e.cedula}</td>
                    <td style={s.td}><span style={s.rolBadge}>{ROLES_LABELS[(e as any).rol] ?? "—"}</span></td>
                    <td style={s.td}>{e.email}</td>
                    <td style={s.td}>{e.telefono || "—"}</td>
                    <td style={s.td}>{e.salario ? `RD$ ${Number(e.salario).toLocaleString()}` : "—"}</td>
                    <td style={s.td}><span style={e.activo ? s.activo : s.inactivo}>{e.activo ? "Activo" : "Inactivo"}</span></td>
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
  loading:    { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:  { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:     { color: "#2C1810", fontWeight: "bold" },
  main:       { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:        { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:    { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:   { fontWeight: "bold", fontSize: "16px" },
  navUser:    { fontSize: "14px" },
  contenido:  { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:     { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:  { fontSize: "13px", color: "#666", margin: 0 },
  inputBusqueda: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  vacio:      { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:  { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:      { width: "100%", borderCollapse: "collapse" as any },
  thead:      { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:         { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:         { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  activo:     { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:   { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  rolBadge:   { background: "#F3E8FF", color: "#C0392B", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
};
