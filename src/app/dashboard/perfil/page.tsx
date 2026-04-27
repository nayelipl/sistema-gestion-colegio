"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import NavBar from "@/components/NavBar";

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [perfil, setPerfil]     = useState<any>(null);
  const [form, setForm]         = useState<any>({});
  const [passForm, setPassForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [error, setError]       = useState("");
  const [exito, setExito]       = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [exitoPass, setExitoPass] = useState("");
  const [cargando, setCargando] = useState(true);
  const [tab, setTab]           = useState<"info"|"seguridad">("info");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/perfil").then(r => r.json()).then(d => {
      setPerfil(d.perfil);
      setForm({
        nombre:    d.perfil?.nombre    || "",
        apellido:  d.perfil?.apellido  || "",
        telefono:  d.perfil?.telefono  || "",
        direccion: d.perfil?.direccion || "",
      });
      setCargando(false);
    });
  }, [status]);

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;

  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardarInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/perfil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito("Información actualizada correctamente.");
    setPerfil({ ...perfil, ...form });
    setTimeout(() => setExito(""), 3000);
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPass(""); setExitoPass("");
    if (passForm.nueva !== passForm.confirmar) {
      setErrorPass("Las contraseñas nuevas no coinciden."); return;
    }
    if (passForm.nueva.length < 6) {
      setErrorPass("La contraseña debe tener al menos 6 caracteres."); return;
    }
    const res  = await fetch("/api/perfil/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actual: passForm.actual, nueva: passForm.nueva }) });
    const data = await res.json();
    if (!res.ok) { setErrorPass(data.error); return; }
    setExitoPass("Contraseña actualizada correctamente.");
    setPassForm({ actual: "", nueva: "", confirmar: "" });
    setTimeout(() => setExitoPass(""), 3000);
  };

  const rolLabel: Record<string, string> = {
    ADMINISTRADOR:        "Administrador",
    DIRECCION_ACADEMICA:  "Dirección Académica",
    COORDINACION_ACADEMICA: "Coordinación Académica",
    SECRETARIA_DOCENTE:   "Secretaría Docente",
    MAESTRO:              "Maestro/a",
    CAJERO:               "Cajero/a",
    TUTOR:                "Tutor/a",
    ESTUDIANTE:           "Estudiante",
  };

  return (
    <main style={s.main}>
      <NavBar titulo="Mi Perfil" icono="👤" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.perfilHeader}>
          <div style={s.avatar}>{(session?.user?.name || "U").charAt(0).toUpperCase()}</div>
          <div>
            <h1 style={s.nombre}>{perfil?.nombre} {perfil?.apellido}</h1>
            <p style={s.email}>{session?.user?.email}</p>
            <span style={s.rolBadge}>{rolLabel[rol] || rol}</span>
          </div>
        </div>

        <div style={s.tabs}>
          <button onClick={() => setTab("info")} style={tab === "info" ? s.tabActivo : s.tab}>📋 Información personal</button>
          <button onClick={() => setTab("seguridad")} style={tab === "seguridad" ? s.tabActivo : s.tab}>🔒 Seguridad</button>
        </div>

        {tab === "info" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Información personal</h2>
            {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
            {error && <div style={s.errorMsg}>⚠️ {error}</div>}
            <form onSubmit={guardarInfo}>
              <div style={s.gridDos}>
                <div>
                  <label style={s.label}>Nombre</label>
                  <input name="nombre" value={form.nombre} onChange={c} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Apellido</label>
                  <input name="apellido" value={form.apellido} onChange={c} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={c} style={s.input} placeholder="809-000-0000" />
                </div>
                <div>
                  <label style={s.label}>Correo electrónico</label>
                  <input value={session?.user?.email || ""} style={{...s.input, background:"#f0f0f0"}} disabled />
                </div>
              </div>
              <div style={{ marginTop:"14px" }}>
                <label style={s.label}>Dirección</label>
                <input name="direccion" value={form.direccion} onChange={c} style={s.input} placeholder="Dirección completa" />
              </div>

              {perfil && (
                <div style={s.infoExtra}>
                  <h3 style={s.infoExtraTitulo}>Información del sistema</h3>
                  <div style={s.gridDos}>
                    {perfil.codigo && <div><span style={s.infoLabel}>Código:</span> <span>{perfil.codigo}</span></div>}
                    {perfil.cedula && <div><span style={s.infoLabel}>Cédula:</span> <span>{perfil.cedula}</span></div>}
                    {perfil.cargo && <div><span style={s.infoLabel}>Cargo:</span> <span>{perfil.cargo}</span></div>}
                    {perfil.departamento && <div><span style={s.infoLabel}>Departamento:</span> <span>{perfil.departamento}</span></div>}
                    {perfil.seccion && <div><span style={s.infoLabel}>Sección:</span> <span>{perfil.seccion?.curso?.grado} — {perfil.seccion?.aula}</span></div>}
                    {perfil.fechaIngreso && <div><span style={s.infoLabel}>Fecha ingreso:</span> <span>{new Date(perfil.fechaIngreso).toLocaleDateString("es-DO")}</span></div>}
                  </div>
                </div>
              )}

              <div style={{ marginTop:"20px", display:"flex", justifyContent:"flex-end" }}>
                <button type="submit" style={s.btnGuardar}>Guardar cambios</button>
              </div>
            </form>
          </div>
        )}

        {tab === "seguridad" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Cambiar contraseña</h2>
            {exitoPass && <div style={s.exitoMsg}>✅ {exitoPass}</div>}
            {errorPass && <div style={s.errorMsg}>⚠️ {errorPass}</div>}
            <form onSubmit={cambiarPassword}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <div>
                  <label style={s.label}>Contraseña actual</label>
                  <input type="password" value={passForm.actual} onChange={e => setPassForm({...passForm, actual: e.target.value})} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Nueva contraseña</label>
                  <input type="password" value={passForm.nueva} onChange={e => setPassForm({...passForm, nueva: e.target.value})} style={s.input} required />
                </div>
                <div>
                  <label style={s.label}>Confirmar nueva contraseña</label>
                  <input type="password" value={passForm.confirmar} onChange={e => setPassForm({...passForm, confirmar: e.target.value})} style={s.input} required />
                </div>
              </div>
              <div style={{ marginTop:"20px", display:"flex", justifyContent:"flex-end" }}>
                <button type="submit" style={s.btnGuardar}>Cambiar contraseña</button>
              </div>
            </form>

            <div style={s.sesionCard}>
              <h3 style={s.cardTitulo}>Sesión activa</h3>
              <p style={{ fontSize:"13px", color:"#666", margin:"0 0 16px" }}>
                Sesión iniciada como <strong>{session?.user?.email}</strong>
              </p>
              <button onClick={() => signOut({ callbackUrl: "/login" })} style={s.btnLogout}>
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:       { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  main:          { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:     { maxWidth:"800px", margin:"0 auto", padding:"28px 20px" },
  perfilHeader:  { display:"flex", alignItems:"center", gap:"20px", background:"#fff", borderRadius:"14px", padding:"24px", marginBottom:"20px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  avatar:        { width:"72px", height:"72px", borderRadius:"50%", background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", fontWeight:"bold", flexShrink:0 },
  nombre:        { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  email:         { fontSize:"14px", color:"#666", margin:"0 0 8px" },
  rolBadge:      { background:"linear-gradient(135deg,#EBF3FB,#F3EBF9)", color:"#C0392B", borderRadius:"12px", padding:"4px 12px", fontSize:"12px", fontWeight:"bold" },
  tabs:          { display:"flex", gap:"8px", marginBottom:"20px" },
  tab:           { background:"#fff", color:"#666", border:"1px solid #ddd", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  tabActivo:     { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer", fontWeight:"bold" },
  card:          { background:"#fff", borderRadius:"14px", padding:"28px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  cardTitulo:    { fontSize:"17px", fontWeight:"bold", color:"#2C1810", margin:"0 0 20px" },
  exitoMsg:      { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:      { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  gridDos:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" },
  label:         { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  input:         { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  infoExtra:     { marginTop:"24px", background:"#f8f9fa", borderRadius:"10px", padding:"16px" },
  infoExtraTitulo:{ fontSize:"14px", fontWeight:"bold", color:"#555", margin:"0 0 12px" },
  infoLabel:     { fontWeight:"bold", color:"#555", fontSize:"13px", marginRight:"6px" },
  btnGuardar:    { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 24px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  sesionCard:    { marginTop:"28px", paddingTop:"24px", borderTop:"1px solid #f0f0f0" },
  btnLogout:     { background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
};
