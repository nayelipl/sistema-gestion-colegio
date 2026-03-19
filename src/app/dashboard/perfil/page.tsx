"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
};

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm]                 = useState({ nombre: "", contrasenaActual: "", contrasenaNueva: "", confirmar: "" });
  const [error, setError]               = useState("");
  const [exito, setExito]               = useState("");
  const [cargando, setCargando]         = useState(false);
  const [salario, setSalario]           = useState<number | null>(null);
  const [mostrarSalario, setMostrarSalario] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.name) {
      setForm(f => ({ ...f, nombre: session.user?.name ?? "" }));
    }
    if (rol === "MAESTRO") {
      fetch("/api/perfil/nomina")
        .then(r => r.json())
        .then(d => setSalario(d.salario ? Number(d.salario) : null));
    }
  }, [session, rol]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;

  const c = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");

    if (form.contrasenaNueva && form.contrasenaNueva !== form.confirmar) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (form.contrasenaNueva && form.contrasenaNueva.length < 6) {
      setError("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    const res  = await fetch("/api/perfil", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        nombre:           form.nombre,
        contrasenaActual: form.contrasenaActual,
        contrasenaNueva:  form.contrasenaNueva || null,
      }),
    });
    const data = await res.json();
    setCargando(false);

    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setForm(f => ({ ...f, contrasenaActual: "", contrasenaNueva: "", confirmar: "" }));
    setTimeout(() => setExito(""), 3000);
  };

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>👤 Mi Perfil</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <h1 style={s.titulo}>Mi Perfil</h1>
        <p style={s.subtitulo}>Información personal y configuración de cuenta</p>

        {/* Info sesión */}
        <div style={s.infoCard}>
          <div style={s.avatar}>
            {session?.user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={s.infoNombre}>{session?.user?.name}</h2>
            <p style={s.infoEmail}>{session?.user?.email}</p>
            <span style={s.rolBadge}>{ROLE_LABELS[rol] ?? rol}</span>
          </div>
        </div>

        {/* Nómina oculta — solo maestro */}
        {rol === "MAESTRO" && (
          <div style={s.nominaCard}>
            <div style={s.nominaHeader}>
              <div>
                <h3 style={s.nominaTitulo}>💵 Mi Información de Nómina</h3>
                <p style={s.nominaDesc}>Esta información es privada y solo visible para ti</p>
              </div>
              <button onClick={() => setMostrarSalario(!mostrarSalario)} style={s.btnMostrar}>
                {mostrarSalario ? "🙈 Ocultar" : "👁️ Ver salario"}
              </button>
            </div>
            {mostrarSalario && (
              <div style={s.salarioBox}>
                <p style={s.salarioLabel}>Salario mensual</p>
                <p style={s.salarioValor}>
                  {salario !== null
                    ? `RD$ ${salario.toLocaleString()}`
                    : "No asignado aún"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Formulario edición */}
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>Editar información</h2>
          <form onSubmit={guardarPerfil}>
            <div style={s.formGrid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Nombre completo</label>
                <input name="nombre" value={form.nombre} onChange={c} style={s.input} required />
              </div>
              <div style={s.separador}>
                <span style={s.separadorTexto}>Cambiar contraseña (opcional)</span>
              </div>
              <div>
                <label style={s.label}>Contraseña actual</label>
                <input type="password" name="contrasenaActual" value={form.contrasenaActual}
                  onChange={c} style={s.input} placeholder="••••••••" />
              </div>
              <div />
              <div>
                <label style={s.label}>Nueva contraseña</label>
                <input type="password" name="contrasenaNueva" value={form.contrasenaNueva}
                  onChange={c} style={s.input} placeholder="••••••••" />
              </div>
              <div>
                <label style={s.label}>Confirmar nueva contraseña</label>
                <input type="password" name="confirmar" value={form.confirmar}
                  onChange={c} style={s.input} placeholder="••••••••" />
              </div>
            </div>

            {error && <p style={s.errorMsg}>{error}</p>}
            {exito && <p style={s.exitoMsg}>✅ {exito}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button type="submit" disabled={cargando}
                style={{ ...s.btnGuardar, opacity: cargando ? 0.7 : 1 }}>
                {cargando ? "Guardando..." : "💾 Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:        { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main:           { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:            { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:        { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:       { fontWeight: "bold", fontSize: "16px" },
  navUser:        { fontSize: "14px" },
  contenido:      { maxWidth: "700px", margin: "0 auto", padding: "28px 20px" },
  titulo:         { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:      { fontSize: "13px", color: "#666", marginBottom: "24px" },
  infoCard:       { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" },
  avatar:         { width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", fontSize: "28px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoNombre:     { fontSize: "18px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  infoEmail:      { fontSize: "13px", color: "#666", margin: "0 0 8px" },
  rolBadge:       { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", borderRadius: "20px", padding: "4px 14px", fontSize: "12px", fontWeight: "bold" },
  nominaCard:     { background: "#fff", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: "20px", border: "1px solid #EBF3FB" },
  nominaHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center" },
  nominaTitulo:   { fontSize: "15px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  nominaDesc:     { fontSize: "12px", color: "#888", margin: 0 },
  btnMostrar:     { background: "#EBF3FB", color: "#1F5C99", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontWeight: "600" },
  salarioBox:     { marginTop: "16px", background: "#f0f4f8", borderRadius: "8px", padding: "16px", textAlign: "center" as any },
  salarioLabel:   { fontSize: "12px", color: "#666", margin: "0 0 6px" },
  salarioValor:   { fontSize: "26px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  formCard:       { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  formTitulo:     { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  formGrid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "4px" },
  separador:      { gridColumn: "1 / -1", borderTop: "1px solid #eee", paddingTop: "16px", marginTop: "4px" },
  separadorTexto: { fontSize: "12px", fontWeight: "600", color: "#888" },
  label:          { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:          { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:       { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "8px" },
  exitoMsg:       { color: "#276749", fontSize: "13px", background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: "6px", padding: "8px 12px", marginBottom: "8px" },
  btnGuardar:     { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
