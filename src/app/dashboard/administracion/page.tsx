"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdministracionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats]       = useState<any>({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje]   = useState("");
  const [error, setError]       = useState("");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/administracion/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setCargando(false); });
  }, [status]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const reiniciarAnio = async () => {
    if (!confirm("⚠️ ¿Estás seguro? Esto reiniciará el año escolar. Se respaldarán los datos actuales.")) return;
    setError(""); setMensaje("");
    const res  = await fetch("/api/administracion/reiniciar", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setMensaje(data.mensaje);
  };

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>⚙️ Administración del Sistema</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <h1 style={s.titulo}>Administración del Sistema</h1>
        <p style={s.subtitulo}>Configuración general, estadísticas y gestión del año escolar</p>

        {mensaje && <div style={s.exitoMsg}>✅ {mensaje}</div>}
        {error   && <div style={s.errorMsg}>❌ {error}</div>}

        {/* Estadísticas generales */}
        {!cargando && (
          <div style={s.statsGrid}>
            {[
              { icono: "👥", label: "Empleados",   valor: stats.empleados   ?? 0 },
              { icono: "👨‍👧", label: "Tutores",     valor: stats.tutores     ?? 0 },
              { icono: "🎒", label: "Estudiantes", valor: stats.estudiantes ?? 0 },
              { icono: "🏫", label: "Secciones",   valor: stats.secciones   ?? 0 },
              { icono: "📖", label: "Asignaturas", valor: stats.asignaturas ?? 0 },
              { icono: "💰", label: "Pagos totales", valor: stats.pagos     ?? 0 },
            ].map(item => (
              <div key={item.label} style={s.statCard}>
                <div style={s.statIcono}>{item.icono}</div>
                <p style={s.statValor}>{item.valor}</p>
                <p style={s.statLabel}>{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Acciones del sistema */}
        <div style={s.seccionTitulo}>⚙️ Acciones del Sistema</div>
        <div style={s.accionesGrid}>

          <div style={s.accionCard}>
            <div style={s.accionIcono}>🔄</div>
            <div>
              <h3 style={s.accionTitulo}>Reinicio de Año Escolar</h3>
              <p style={s.accionDesc}>
                Cierra el año escolar actual. Incluye respaldo de base de datos,
                corte de cuentas por cobrar y preparación para el nuevo ciclo lectivo.
              </p>
              <button onClick={reiniciarAnio} style={s.btnPeligro}>
                🔄 Iniciar reinicio de año
              </button>
            </div>
          </div>

          <div style={s.accionCard}>
            <div style={s.accionIcono}>🛡️</div>
            <div>
              <h3 style={s.accionTitulo}>Gestión de Roles y Permisos</h3>
              <p style={s.accionDesc}>
                Administra los usuarios del sistema, cambia roles y activa o desactiva cuentas.
              </p>
              <Link href="/dashboard/usuarios" style={s.btnAccion}>
                👥 Ir a Gestión de Usuarios
              </Link>
            </div>
          </div>

          <div style={s.accionCard}>
            <div style={s.accionIcono}>🚌</div>
            <div>
              <h3 style={s.accionTitulo}>Gestión de Transporte</h3>
              <p style={s.accionDesc}>
                Administra las rutas de transporte escolar y la asignación de estudiantes.
              </p>
              <Link href="/dashboard/transporte" style={s.btnAccion}>
                🚌 Ir a Transporte
              </Link>
            </div>
          </div>

          <div style={s.accionCard}>
            <div style={s.accionIcono}>👕</div>
            <div>
              <h3 style={s.accionTitulo}>Inventario de Uniformes</h3>
              <p style={s.accionDesc}>
                Gestiona el stock de uniformes escolares disponibles para la venta.
              </p>
              <Link href="/dashboard/inventario" style={s.btnAccion}>
                👕 Ir a Inventario
              </Link>
            </div>
          </div>

        </div>

        {/* Info del sistema */}
        <div style={s.infoSistema}>
          <h3 style={s.seccionTitulo}>ℹ️ Información del Sistema</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", color: "#555" }}>
            <p><strong>Sistema:</strong> Sistema de Gestión de Colegio</p>
            <p><strong>Versión:</strong> 1.0.0</p>
            <p><strong>Base de datos:</strong> MySQL</p>
            <p><strong>Framework:</strong> Next.js</p>
            <p><strong>Administrador:</strong> {session?.user?.email}</p>
            <p><strong>Estado:</strong> <span style={{ color: "#276749", fontWeight: "bold" }}>✅ Operativo</span></p>
          </div>
        </div>
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
  contenido:    { maxWidth: "1000px", margin: "0 auto", padding: "28px 20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", marginBottom: "24px" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg:     { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  statsGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px", marginBottom: "28px" },
  statCard:     { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", textAlign: "center" as any, borderTop: "3px solid #1F5C99" },
  statIcono:    { fontSize: "28px", marginBottom: "8px" },
  statValor:    { fontSize: "28px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  statLabel:    { fontSize: "12px", color: "#666", margin: 0 },
  seccionTitulo:{ fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 16px" },
  accionesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" },
  accionCard:   { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", gap: "16px" },
  accionIcono:  { fontSize: "32px", flexShrink: 0 },
  accionTitulo: { fontSize: "14px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 6px" },
  accionDesc:   { fontSize: "12px", color: "#666", margin: "0 0 12px", lineHeight: "1.5" },
  btnPeligro:   { background: "#fff5f5", color: "#c53030", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontWeight: "600" },
  btnAccion:    { background: "#EBF3FB", color: "#1F5C99", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontWeight: "600", textDecoration: "none", display: "inline-block" },
  infoSistema:  { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
};
