"use client";
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

const MODULOS = [
  // ── ADMINISTRADOR ──────────────────────────────────────
  {
    nombre: "Gestión de Usuarios",
    icono:  "👥",
    desc:   "Registro y administración de empleados.",
    href:   "/dashboard/usuarios",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Módulo Académico",
    icono:  "📚",
    desc:   "Cursos, secciones y asignaturas.",
    href:   "/dashboard/academico",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Asignaciones de Maestros",
    icono:  "🗂️",
    desc:   "Asignar maestros a secciones y asignaturas.",
    href:   "/dashboard/asignaciones",
    roles:  ["ADMINISTRADOR", "DIRECCION_ACADEMICA"],
  },
  {
    nombre: "Matrícula",
    icono:  "🎓",
    desc:   "Asignación de estudiantes a secciones.",
    href:   "/dashboard/matricula",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Calificaciones",
    icono:  "📝",
    desc:   "Gestión y publicación de calificaciones.",
    href:   "/dashboard/calificaciones",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Asistencia",
    icono:  "📋",
    desc:   "Control de asistencia diaria.",
    href:   "/dashboard/asistencia",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Módulo Financiero",
    icono:  "💰",
    desc:   "Pagos, cuentas por cobrar e inventario.",
    href:   "/dashboard/financiero",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Inscripciones",
    icono:  "📋",
    desc:   "Registro de tutores y estudiantes.",
    href:   "/dashboard/inscripciones",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Comunicaciones",
    icono:  "📢",
    desc:   "Blog, materiales y comunicados.",
    href:   "/dashboard/comunicaciones",
    roles:  ["ADMINISTRADOR"],
  },
  {
    nombre: "Administración del Sistema",
    icono:  "⚙️",
    desc:   "Configuración, reinicio de año escolar y respaldos.",
    href:   "/dashboard/administracion",
    roles:  ["ADMINISTRADOR"],
  },

  // ── DIRECTOR ADMINISTRATIVO ────────────────────────────
  {
    nombre: "Gestión de Empleados",
    icono:  "👨‍💼",
    desc:   "Plantilla de empleados académicos y administrativos.",
    href:   "/dashboard/empleados",
    roles:  ["DIRECTOR_ADMINISTRATIVO"],
  },
  {
    nombre: "Nómina",
    icono:  "💵",
    desc:   "Control de pagos por nómina del personal.",
    href:   "/dashboard/nomina",
    roles:  ["DIRECTOR_ADMINISTRATIVO"],
  },

  // ── CONTADOR ───────────────────────────────────────────
  {
    nombre: "Módulo Financiero",
    icono:  "💰",
    desc:   "Cuentas por cobrar, corte de pagos e inventario de uniformes.",
    href:   "/dashboard/financiero",
    roles:  ["CONTADOR"],
  },

  // ── CAJERO ─────────────────────────────────────────────
  {
    nombre: "Inscripciones",
    icono:  "📋",
    desc:   "Registro de nuevos tutores y estudiantes durante la inscripción.",
    href:   "/dashboard/inscripciones",
    roles:  ["CAJERO"],
  },
  {
    nombre: "Pagos Presenciales",
    icono:  "🏧",
    desc:   "Recibir pagos, estado de cuenta del tutor y cuadre de caja.",
    href:   "/dashboard/pagos-presenciales",
    roles:  ["CAJERO"],
  },

  // ── DIRECCIÓN ACADÉMICA ────────────────────────────────
  {
    nombre: "Módulo Académico",
    icono:  "📚",
    desc:   "Horarios, cursos, secciones, asignaturas y calendario.",
    href:   "/dashboard/academico",
    roles:  ["DIRECCION_ACADEMICA"],
  },
  {
    nombre: "Calificaciones",
    icono:  "📝",
    desc:   "Aprobación y publicación de calificaciones.",
    href:   "/dashboard/calificaciones",
    roles:  ["DIRECCION_ACADEMICA"],
  },
  {
    nombre: "Matrícula",
    icono:  "🎓",
    desc:   "Cambio de curso/sección y gestión de cupos.",
    href:   "/dashboard/matricula",
    roles:  ["DIRECCION_ACADEMICA"],
  },

  // ── COORDINACIÓN ACADÉMICA ─────────────────────────────
  {
    nombre: "Módulo Académico",
    icono:  "📚",
    desc:   "Horarios, cursos, secciones y asignaturas.",
    href:   "/dashboard/academico",
    roles:  ["COORDINACION_ACADEMICA"],
  },

  // ── SECRETARÍA DOCENTE ─────────────────────────────────
  {
    nombre: "Matrícula",
    icono:  "🎓",
    desc:   "Administración de matrícula estudiantil.",
    href:   "/dashboard/matricula",
    roles:  ["SECRETARIA_DOCENTE"],
  },
  {
    nombre: "Asistencia",
    icono:  "📋",
    desc:   "Supervisión del pase de lista diario.",
    href:   "/dashboard/asistencia",
    roles:  ["SECRETARIA_DOCENTE"],
  },
  {
    nombre: "Calificaciones",
    icono:  "📝",
    desc:   "Reportes de calificaciones.",
    href:   "/dashboard/calificaciones",
    roles:  ["SECRETARIA_DOCENTE"],
  },
  {
    nombre: "Comunicaciones",
    icono:  "📢",
    desc:   "Publicación de materiales y comunicaciones oficiales.",
    href:   "/dashboard/comunicaciones",
    roles:  ["SECRETARIA_DOCENTE"],
  },

  // ── ORIENTADOR ESCOLAR ─────────────────────────────────
  {
    nombre: "Orientación Escolar",
    icono:  "🧭",
    desc:   "Consulta de calificaciones y publicaciones de orientación.",
    href:   "/dashboard/orientacion",
    roles:  ["ORIENTADOR_ESCOLAR"],
  },

  // ── MAESTRO ────────────────────────────────────────────
  {
    nombre: "Mis Cursos",
    icono:  "🏫",
    desc:   "Estudiantes asignados, asistencia y calificaciones.",
    href:   "/dashboard/mis-cursos",
    roles:  ["MAESTRO"],
  },

  // ── TUTOR ──────────────────────────────────────────────
  {
    nombre: "Mis Representados",
    icono:  "👨‍👧",
    desc:   "Calificaciones, asistencia, horario y materiales de mis hijos.",
    href:   "/dashboard/representados",
    roles:  ["TUTOR"],
  },
  {
    nombre: "Estado de Cuenta",
    icono:  "💳",
    desc:   "Ver estado de cuenta y realizar pagos en línea.",
    href:   "/dashboard/pagos",
    roles:  ["TUTOR"],
  },
  {
    nombre: "Calendario",
    icono:  "📅",
    desc:   "Calendario escolar y eventos institucionales.",
    href:   "/dashboard/calendario",
    roles:  ["TUTOR"],
  },
  {
    nombre: "Blog",
    icono:  "📰",
    desc:   "Publicaciones y noticias del colegio.",
    href:   "/dashboard/blog",
    roles:  ["TUTOR"],
  },

  // ── ESTUDIANTE ─────────────────────────────────────────
  {
    nombre: "Mi Rendimiento",
    icono:  "📊",
    desc:   "Mis calificaciones y horario.",
    href:   "/dashboard/rendimiento",
    roles:  ["ESTUDIANTE"],
  },
  {
    nombre: "Calendario",
    icono:  "📅",
    desc:   "Calendario académico.",
    href:   "/dashboard/calendario",
    roles:  ["ESTUDIANTE"],
  },
  {
    nombre: "Blog",
    icono:  "📰",
    desc:   "Publicaciones del colegio.",
    href:   "/dashboard/blog",
    roles:  ["ESTUDIANTE"],
  },
  {
    nombre: "Notificaciones",
    icono:  "🔔",
    desc:   "Comunicados y recordatorios.",
    href:   "/dashboard/notificaciones",
    roles:  ["ESTUDIANTE"],
  },

  // ── TODOS LOS ROLES INTERNOS ───────────────────────────
  {
    nombre: "Mi Perfil",
    icono:  "👤",
    desc:   "Ver y editar tu información personal.",
    href:   "/dashboard/perfil",
    roles:  [
      "ADMINISTRADOR", "DIRECTOR_ADMINISTRATIVO", "CONTADOR", "CAJERO",
      "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE",
      "ORIENTADOR_ESCOLAR", "MAESTRO", "TUTOR", "ESTUDIANTE",
    ],
  },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return <main style={styles.loading}><p>Cargando...</p></main>;
  }

  const rol                = (session?.user as any)?.role ?? "VISITANTE";
  const rolLabel           = ROLE_LABELS[rol] ?? rol;
  const modulosDisponibles = MODULOS.filter(m => m.roles.includes(rol));

  return (
    <main style={styles.main}>
      <nav style={styles.nav}>
        <span style={styles.navTitle}>🏫 Sistema de Gestión de Colegio</span>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={styles.btnLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div style={styles.contenido}>
        <div style={styles.bienvenida}>
          <h1 style={styles.saludo}>¡Bienvenido/a, {session?.user?.name}!</h1>
          <div style={styles.badge}>{rolLabel}</div>
          <p style={styles.info}>Selecciona un módulo para comenzar.</p>
        </div>

        <h2 style={styles.seccion}>Módulos disponibles</h2>
        {modulosDisponibles.length === 0 ? (
          <p style={{ color: "#888" }}>No tienes módulos asignados para tu rol.</p>
        ) : (
          <div style={styles.grid}>
            {modulosDisponibles.map((modulo) => (
              <div key={modulo.href + modulo.nombre} style={styles.tarjeta}
                onClick={() => router.push(modulo.href)}>
                <div style={styles.tarjetaIcon}>{modulo.icono}</div>
                <h3 style={styles.tarjetaNombre}>{modulo.nombre}</h3>
                <p style={styles.tarjetaDesc}>{modulo.desc}</p>
              </div>
            ))}
          </div>
        )}

        <div style={styles.sesionInfo}>
          <p><strong>Email:</strong> {session?.user?.email}</p>
          <p><strong>Rol:</strong> {rolLabel}</p>
          <p><strong>Estado:</strong> Sesión activa ✅</p>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:          { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" },
  navTitle:     { fontWeight: "bold", fontSize: "16px" },
  navRight:     { display: "flex", alignItems: "center", gap: "16px" },
  navUser:      { fontSize: "14px" },
  btnLogout:    { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", padding: "6px 14px", fontSize: "13px", cursor: "pointer" },
  contenido:    { maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" },
  bienvenida:   { background: "#fff", borderRadius: "12px", padding: "28px", marginBottom: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  saludo:       { fontSize: "22px", color: "#1F5C99", margin: "0 0 10px" },
  badge:        { display: "inline-block", background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", borderRadius: "20px", padding: "4px 16px", fontSize: "13px", fontWeight: "bold", marginBottom: "12px" },
  info:         { color: "#555", fontSize: "14px", margin: 0 },
  seccion:      { fontSize: "16px", color: "#333", marginBottom: "14px", fontWeight: "bold" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "16px", marginBottom: "28px" },
  tarjeta:      { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer", borderTop: "3px solid #1F5C99", transition: "transform 0.15s" },
  tarjetaIcon:  { fontSize: "28px", marginBottom: "8px" },
  tarjetaNombre:{ fontSize: "14px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 6px" },
  tarjetaDesc:  { fontSize: "12px", color: "#666", margin: 0 },
  sesionInfo:   { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", fontSize: "13px", color: "#444", display: "flex", gap: "24px", flexWrap: "wrap" },
};
