"use client";
// src/app/login/page.tsx
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: "", contrasena: "" });
  const [error, setError]   = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    const result = await signIn("credentials", {
      email:      form.email,
      contrasena: form.contrasena,
      redirect:   false,
    });

    setCargando(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        {/* Logo / Cabecera */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>🏫</div>
          <h1 style={styles.titulo}>Sistema de Gestión de Colegio</h1>
          <p style={styles.subtitulo}>Inicia sesión para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grupo}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@colegio.edu"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.grupo}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              name="contrasena"
              value={form.contrasena}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            style={{ ...styles.boton, opacity: cargando ? 0.7 : 1 }}
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p style={styles.pie}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" style={styles.enlace}>
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1F5C99 0%, #5D2F7D 100%)",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "40px 36px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  iconCircle: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  titulo: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1F5C99",
    margin: "0 0 6px",
  },
  subtitulo: {
    fontSize: "13px",
    color: "#888",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  grupo: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#333",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
    transition: "border 0.2s",
  },
  boton: {
    marginTop: "8px",
    padding: "12px",
    background: "linear-gradient(135deg, #1F5C99, #5D2F7D)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  error: {
    color: "#e53e3e",
    fontSize: "13px",
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: "6px",
    padding: "8px 12px",
    margin: 0,
  },
  pie: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "13px",
    color: "#666",
  },
  enlace: {
    color: "#1F5C99",
    fontWeight: "600",
    textDecoration: "none",
  },
};
