"use client";
// src/app/registro/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLES = [
  { value: "ADMINISTRADOR",          label: "Administrador" },
  { value: "DIRECTOR_ADMINISTRATIVO",label: "Director Administrativo" },
  { value: "CONTADOR",               label: "Contador" },
  { value: "CAJERO",                 label: "Cajero" },
  { value: "DIRECCION_ACADEMICA",    label: "Dirección Académica" },
  { value: "COORDINACION_ACADEMICA", label: "Coordinación Académica" },
  { value: "SECRETARIA_DOCENTE",     label: "Secretaría Docente" },
  { value: "ORIENTADOR_ESCOLAR",     label: "Orientador Escolar" },
  { value: "MAESTRO",                label: "Maestro" },
  { value: "TUTOR",                  label: "Tutor" },
  { value: "ESTUDIANTE",             label: "Estudiante" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "", email: "", contrasena: "", confirmar: "", rol: "MAESTRO",
  });
  const [error, setError]     = useState("");
  const [exito, setExito]     = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (form.contrasena !== form.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setCargando(true);
    const res = await fetch("/api/registro", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nombre: form.nombre, email: form.email, contrasena: form.contrasena, rol: form.rol }),
    });

    const data = await res.json();
    setCargando(false);

    if (!res.ok) {
      setError(data.error ?? "Error al registrar usuario.");
    } else {
      setExito("¡Usuario registrado exitosamente! Redirigiendo al login...");
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>👤</div>
          <h1 style={styles.titulo}>Crear cuenta</h1>
          <p style={styles.subtitulo}>Sistema de Gestión de Colegio</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grupo}>
            <label style={styles.label}>Nombre completo</label>
            <input type="text" name="nombre" value={form.nombre}
              onChange={handleChange} placeholder="Ej. Juan Pérez" required style={styles.input} />
          </div>

          <div style={styles.grupo}>
            <label style={styles.label}>Correo electrónico</label>
            <input type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="correo@colegio.edu" required style={styles.input} />
          </div>

          <div style={styles.grupo}>
            <label style={styles.label}>Rol en el sistema</label>
            <select name="rol" value={form.rol} onChange={handleChange} style={styles.select}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.grupo}>
            <label style={styles.label}>Contraseña</label>
            <input type="password" name="contrasena" value={form.contrasena}
              onChange={handleChange} placeholder="Mínimo 8 caracteres" required style={styles.input} />
          </div>

          <div style={styles.grupo}>
            <label style={styles.label}>Confirmar contraseña</label>
            <input type="password" name="confirmar" value={form.confirmar}
              onChange={handleChange} placeholder="Repite tu contraseña" required style={styles.input} />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {exito && <p style={styles.exito}>{exito}</p>}

          <button type="submit" disabled={cargando}
            style={{ ...styles.boton, opacity: cargando ? 0.7 : 1 }}>
            {cargando ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>

        <p style={styles.pie}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={styles.enlace}>Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1F5C99 0%, #5D2F7D 100%)",
    fontFamily: "Arial, sans-serif", padding: "20px",
  },
  card: {
    background: "#fff", borderRadius: "16px", padding: "36px",
    width: "100%", maxWidth: "440px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  header: { textAlign: "center", marginBottom: "24px" },
  iconCircle: { fontSize: "36px", marginBottom: "8px" },
  titulo:    { fontSize: "20px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo: { fontSize: "12px", color: "#888", margin: 0 },
  form:      { display: "flex", flexDirection: "column", gap: "14px" },
  grupo:     { display: "flex", flexDirection: "column", gap: "5px" },
  label:     { fontSize: "13px", fontWeight: "600", color: "#333" },
  input: {
    padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #ddd", fontSize: "14px", outline: "none",
  },
  select: {
    padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #ddd", fontSize: "14px",
    background: "#fff", outline: "none",
  },
  boton: {
    marginTop: "6px", padding: "12px",
    background: "linear-gradient(135deg, #1F5C99, #5D2F7D)",
    color: "#fff", border: "none", borderRadius: "8px",
    fontSize: "15px", fontWeight: "bold", cursor: "pointer",
  },
  error: {
    color: "#e53e3e", fontSize: "13px", background: "#fff5f5",
    border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", margin: 0,
  },
  exito: {
    color: "#276749", fontSize: "13px", background: "#f0fff4",
    border: "1px solid #9ae6b4", borderRadius: "6px", padding: "8px 12px", margin: 0,
  },
  pie:    { textAlign: "center", marginTop: "18px", fontSize: "13px", color: "#666" },
  enlace: { color: "#1F5C99", fontWeight: "600", textDecoration: "none" },
};
