"use client";
// src/app/dashboard/page.tsx
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR:           "Administrador",
  DIRECTOR_ADMINISTRATIVO: "Director Administrativo",
  CONTADOR:                "Contador",
  CAJERO:                  "Cajero",
  DIRECCION_ACADEMICA:     "Dirección Académica",
  COORDINACION_ACADEMICA:  "Coordinación Académica",
  SECRETARIA_DOCENTE:      "Secretaría Docente",
  ORIENTADOR_ESCOLAR:      "Orientador Escolar",
  MAESTRO:                 "Maestro",
  TUTOR:                   "Tutor",
  ESTUDIANTE:              "Estudiante",
  VISITANTE:               "Visitante",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <main style={styles.loading}>
        <p>Cargando...</p>
      </main>
    );
  }

  const rol = (session?.user as any)?.role ?? "VISITANTE";
  const rolLabel = ROLE_LABELS[rol] ?? rol;

  return (
    <main style={styles.main}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <span style={styles.navTitle}>🏫 Sistema de Gestión de Colegio</span>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={styles.btnLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <div style={styles.contenido}>
        {/* Bienvenida */}
        <div style={styles.bienvenida}>
          <h1 style={styles.saludo}>¡Bienvenido/a, {session?.user?.name}!</h1>
          <div style={styles.badge}>{rolLabel}</div>
          <p style={styles.info}>
            Has iniciado sesión correctamente. Este es tu panel de control.
          </p>
        </div>

        {/* Tarjetas de módulos según rol */}
        <h2 style={styles.seccion}>Módulos disponibles</h2>
        <div style={styles.grid}>
          {getModulosPorRol(rol).map((modulo) => (
            <div key={modulo.nombre} style={styles.tarjeta}>
              <div style={styles.tarjetaIcon}>{modulo.icono}</div>
              <h3 style={styles.tarjetaNombre}>{modulo.nombre}</h3>
              <p style={styles.tarjetaDesc}>{modulo.desc}</p>
            </div>
          ))}
        </div>

        {/* Info de sesión */}
        <div style={styles.sesionInfo}>
          <p><strong>Email:</strong> {session?.user?.email}</p>
          <p><strong>Rol:</strong> {rolLabel}</p>
          <p><strong>Estado:</strong> Sesión activa ✅</p>
        </div>
      </div>
    </main>
  );
}

function getModulosPorRol(rol: string) {
  const todos = [
    { nombre: "Gestión de Usuarios",  icono: "👥", desc: "Administrar empleados, tutores y estudiantes.", roles: ["ADMINISTRADOR", "CAJERO"] },
    { nombre: "Módulo Académico",     icono: "📚", desc: "Horarios, calificaciones y asistencia.", roles: ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA","SECRETARIA_DOCENTE","MAESTRO"] },
    { nombre: "Módulo Financiero",    icono: "💰", desc: "Pagos, cuentas por cobrar y nómina.", roles: ["ADMINISTRADOR","DIRECTOR_ADMINISTRATIVO","CONTADOR","CAJERO"] },
    { nombre: "Transporte",           icono: "🚌", desc: "Rutas y asignación de estudiantes.", roles: ["ADMINISTRADOR","CAJERO","TUTOR"] },
    { nombre: "Comunicaciones",       icono: "📢", desc: "Blog, notificaciones y comunicados.", roles: ["ADMINISTRADOR","SECRETARIA_DOCENTE","ORIENTADOR_ESCOLAR","MAESTRO","TUTOR","ESTUDIANTE"] },
    { nombre: "Mi Perfil",            icono: "👤", desc: "Ver y editar tu información personal.", roles: ["ADMINISTRADOR","DIRECTOR_ADMINISTRATIVO","CONTADOR","CAJERO","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA","SECRETARIA_DOCENTE","ORIENTADOR_ESCOLAR","MAESTRO","TUTOR","ESTUDIANTE"] },
    { nombre: "Mis Calificaciones",   icono: "📝", desc: "Consultar tus notas y condición final.", roles: ["ESTUDIANTE"] },
    { nombre: "Mis Representados",    icono: "👨‍👧", desc: "Ver calificaciones y asistencia de tus hijos.", roles: ["TUTOR"] },
    { nombre: "Administración",       icono: "⚙️", desc: "Configuración del sistema y reinicio de año.", roles: ["ADMINISTRADOR"] },
  ];
  return todos.filter(m => m.roles.includes(rol));
}

const styles: Record<string, React.CSSProperties> = {
  loading: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  main:    { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  nav: {
    background:"linear-gradient(135deg, #1F5C99, #5D2F7D)",
    color:"#fff", padding:"14px 28px",
    display:"flex", justifyContent:"space-between", alignItems:"center",
    boxShadow:"0 2px 8px rgba(0,0,0,0.2)",
  },
  navTitle:  { fontWeight:"bold", fontSize:"16px" },
  navRight:  { display:"flex", alignItems:"center", gap:"16px" },
  navUser:   { fontSize:"14px" },
  btnLogout: {
    background:"rgba(255,255,255,0.15)", color:"#fff",
    border:"1px solid rgba(255,255,255,0.4)", borderRadius:"6px",
    padding:"6px 14px", fontSize:"13px", cursor:"pointer",
  },
  contenido:  { maxWidth:"960px", margin:"0 auto", padding:"32px 20px" },
  bienvenida: {
    background:"#fff", borderRadius:"12px", padding:"28px",
    marginBottom:"28px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)",
  },
  saludo:  { fontSize:"22px", color:"#1F5C99", margin:"0 0 10px" },
  badge:   {
    display:"inline-block", background:"linear-gradient(135deg,#1F5C99,#5D2F7D)",
    color:"#fff", borderRadius:"20px", padding:"4px 16px",
    fontSize:"13px", fontWeight:"bold", marginBottom:"12px",
  },
  info:    { color:"#555", fontSize:"14px", margin:0 },
  seccion: { fontSize:"16px", color:"#333", marginBottom:"14px" },
  grid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",
    gap:"16px", marginBottom:"28px",
  },
  tarjeta: {
    background:"#fff", borderRadius:"10px", padding:"20px",
    boxShadow:"0 2px 8px rgba(0,0,0,0.07)", cursor:"pointer",
    transition:"transform 0.2s", borderTop:"3px solid #1F5C99",
  },
  tarjetaIcon:   { fontSize:"28px", marginBottom:"8px" },
  tarjetaNombre: { fontSize:"14px", fontWeight:"bold", color:"#1F5C99", margin:"0 0 6px" },
  tarjetaDesc:   { fontSize:"12px", color:"#666", margin:0 },
  sesionInfo: {
    background:"#fff", borderRadius:"10px", padding:"20px",
    boxShadow:"0 2px 8px rgba(0,0,0,0.07)", fontSize:"13px",
    color:"#444", display:"flex", gap:"24px", flexWrap:"wrap",
  },
};
