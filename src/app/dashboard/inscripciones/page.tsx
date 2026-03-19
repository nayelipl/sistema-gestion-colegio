"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tutor = {
  id: number; codigo: string; nombre: string; apellido: string;
  cedula: string; email: string; telefono?: string;
};
type Tab = "tutor" | "estudiante";

export default function InscripcionesPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const [tab, setTab]         = useState<Tab>("tutor");
  const [form, setForm]       = useState<any>({});
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [error, setError]     = useState("");
  const [exito, setExito]     = useState("");
  const [cargando, setCargando] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => setTutores(d.tutores || []));
  }, [exito]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "CAJERO" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    setExito("");

    const url = tab === "tutor"
      ? "/api/usuarios/tutores"
      : "/api/usuarios/estudiantes";

    const res  = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    setCargando(false);

    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setForm({});
  };

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>📋 Inscripciones</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Inscripciones</h1>
          <p style={s.subtitulo}>Registro de tutores y estudiantes durante el proceso de inscripción</p>
        </div>

        <div style={s.tabs}>
          <button onClick={() => { setTab("tutor"); setForm({}); setError(""); setExito(""); }}
            style={{ ...s.tab, ...(tab === "tutor" ? s.tabActivo : {}) }}>
            👨‍👧 Registrar Tutor
          </button>
          <button onClick={() => { setTab("estudiante"); setForm({}); setError(""); setExito(""); }}
            style={{ ...s.tab, ...(tab === "estudiante" ? s.tabActivo : {}) }}>
            🎒 Registrar Estudiante
          </button>
        </div>

        <div style={s.card}>
          <h2 style={s.cardTitulo}>
            {tab === "tutor" ? "Datos del Tutor" : "Datos del Estudiante"}
          </h2>

          {exito && (
            <div style={s.exito}>
              ✅ {exito}
              <button onClick={() => setExito("")} style={s.btnNuevo}>+ Registrar otro</button>
            </div>
          )}

          {!exito && (
            <form onSubmit={handleSubmit}>
              {tab === "tutor" && (
                <div style={s.grid}>
                  <Campo label="Nombre *"    name="nombre"    value={form.nombre}    onChange={c} />
                  <Campo label="Apellido *"  name="apellido"  value={form.apellido}  onChange={c} />
                  <Campo label="Cédula *"    name="cedula"    value={form.cedula}    onChange={c} />
                  <Campo label="Teléfono"    name="telefono"  value={form.telefono}  onChange={c} />
                  <Campo label="Email *"     name="email"     value={form.email}     onChange={c} type="email" />
                  <Campo label="Dirección"   name="direccion" value={form.direccion} onChange={c} />
                  <Campo label="Contraseña *" name="contrasena" value={form.contrasena} onChange={c} type="password" />
                </div>
              )}

              {tab === "estudiante" && (
                <div style={s.grid}>
                  <Campo label="Nombre *"            name="nombre"   value={form.nombre}   onChange={c} />
                  <Campo label="Apellido *"           name="apellido" value={form.apellido} onChange={c} />
                  <Campo label="Cédula"               name="cedula"   value={form.cedula}   onChange={c} />
                  <Campo label="RNE"                  name="RNE"      value={form.RNE}      onChange={c} />
                  <Campo label="Fecha de nacimiento"  name="fechaNac" value={form.fechaNac} onChange={c} type="date" />
                  <Campo label="Email *"              name="email"    value={form.email}    onChange={c} type="email" />
                  <Campo label="Contraseña *"         name="contrasena" value={form.contrasena} onChange={c} type="password" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Tutor / Representante</label>
                    <select name="tutorId" value={form.tutorId || ""} onChange={c} style={s.input}>
                      <option value="">Sin tutor asignado</option>
                      {tutores.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.apellido} — Cód. {t.codigo} — {t.cedula}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error && <p style={s.errorMsg}>{error}</p>}

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={cargando}
                  style={{ ...s.btnGuardar, opacity: cargando ? 0.7 : 1 }}>
                  {cargando ? "Registrando..." : `Registrar ${tab === "tutor" ? "tutor" : "estudiante"}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Campo({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type={type} name={name} value={value || ""} onChange={onChange} style={s.input} required={label.includes("*")} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:    { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:  { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:     { color: "#1F5C99", fontWeight: "bold" },
  main:       { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:        { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:    { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:   { fontWeight: "bold", fontSize: "16px" },
  navUser:    { fontSize: "14px" },
  contenido:  { maxWidth: "700px", margin: "0 auto", padding: "28px 20px" },
  header:     { marginBottom: "24px" },
  titulo:     { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:  { fontSize: "13px", color: "#666", margin: 0 },
  tabs:       { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:        { flex: 1, padding: "12px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#666" },
  tabActivo:  { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  card:       { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  cardTitulo: { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  label:      { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:      { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  exito:      { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnNuevo:   { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  errorMsg:   { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginTop: "12px" },
  btnGuardar: { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
