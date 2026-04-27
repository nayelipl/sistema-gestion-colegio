"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Empleado = {
  id: number; nombre: string; apellido: string; cedula: string;
  email: string; telefono?: string; salario?: number; activo: boolean;
};
type Tutor = {
  id: number; codigo: string; nombre: string; apellido: string; cedula: string;
  email: string; telefono?: string; direccion?: string; activo: boolean;
  estudiantes?: { id: number; nombre: string; apellido: string }[];
};
type Estudiante = {
  id: number; codigo: string; nombre: string; apellido: string; RNE?: string;
   fechaNac?: string; activo: boolean;
  tutor?: { id: number; nombre: string; apellido: string; codigo: string } | null;
};
type Tab = "empleados" | "tutores" | "estudiantes";

const ROLES_EMPLEADO: Record<string, string> = {
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

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]                   = useState<Tab>("empleados");
  const [empleados, setEmpleados]       = useState<Empleado[]>([]);
  const [tutores, setTutores]           = useState<Tutor[]>([]);
  const [estudiantes, setEstudiantes]   = useState<Estudiante[]>([]);
  const [cargando, setCargando]         = useState(true);
  const [busqueda, setBusqueda]         = useState("");
  const [modal, setModal]               = useState<"nuevo" | "editar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [form, setForm]                 = useState<any>({});
  const [mensaje, setMensaje]           = useState("");
  const [contrasenaTemp, setContrasenaTemp] = useState("");
  const [error, setError]               = useState("");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargarDatos = async () => {
    setCargando(true);
    const res  = await fetch("/api/usuarios");
    const data = await res.json();
    setEmpleados(data.empleados     || []);
    setTutores(data.tutores         || []);
    setEstudiantes(data.estudiantes || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const filtrar = (lista: any[]) =>
    lista.filter(u =>
      `${u.nombre} ${u.apellido} ${u.cedula || ""} ${u.codigo || ""} ${u.email || ""} ${u.RNE || ""}`
        .toLowerCase().includes(busqueda.toLowerCase())
    );

  const abrirNuevo = () => {
  setForm({
    nombre: "",
    apellido: "",
    cedula: "",
    email: "",
    telefono: "",
    ocupacion: "",
    nombreContactoAlterno: "",
    telefonoContactoAlterno: "",
    contrasena: ""
  });
  setSeleccionado(null);
  setModal("nuevo");
  setError("");
  setContrasenaTemp("");
};

  const abrirEditar = (u: any) => {
    setSeleccionado(u);
    setForm({ ...u });
    setModal("editar");
    setError("");
    setContrasenaTemp("");
  };

  const guardar = async (esNuevo: boolean) => {
    setError("");
    const url = esNuevo
      ? `/api/usuarios/${tab}`
      : `/api/usuarios/${tab}/${seleccionado.id}`;
    const res  = await fetch(url, {
      method:  esNuevo ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }

    if (data.contrasenaTemp) {
      setContrasenaTemp(data.contrasenaTemp);
      setMensaje(data.mensaje);
    } else {
      setMensaje(data.mensaje);
      setModal(null);
      setTimeout(() => setMensaje(""), 3000);
    }
    cargarDatos();
  };

  const cambiarEstado = async (u: any) => {
    await fetch(`/api/usuarios/${tab}/${u.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ activo: !u.activo }),
    });
    cargarDatos();
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "ADMINISTRADOR" && rol !== "CAJERO") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const lista         = tab === "empleados" ? empleados : tab === "tutores" ? tutores : estudiantes;
  const listaFiltrada = filtrar(lista);
  const tabsDisponibles: Tab[] = rol === "CAJERO"
    ? ["tutores", "estudiantes"]
    : ["empleados", "tutores", "estudiantes"];

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>👥 Gestión de Usuarios</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Gestión de Usuarios</h1>
            <p style={s.subtitulo}>
              {rol === "CAJERO"
                ? "Registro de tutores y estudiantes durante la inscripción"
                : "Administración de empleados, tutores y estudiantes"}
            </p>
          </div>
          <button onClick={abrirNuevo} style={s.btnNuevo}>
            + Nuevo {tab === "empleados" ? "empleado" : tab === "tutores" ? "tutor" : "estudiante"}
          </button>
        </div>

        {mensaje && !contrasenaTemp && <div style={s.exito}>{mensaje}</div>}

        <div style={s.tabs}>
          {tabsDisponibles.map(t => (
            <button key={t} onClick={() => { setTab(t); setBusqueda(""); }}
              style={{ ...s.tab, ...(tab === t ? s.tabActivo : {}) }}>
              {t === "empleados" ? "👨‍💼 Empleados" : t === "tutores" ? "👨‍👧 Tutores" : "🎒 Estudiantes"}
              <span style={s.badge}>
                {t === "empleados" ? empleados.length : t === "tutores" ? tutores.length : estudiantes.length}
              </span>
            </button>
          ))}
        </div>

        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={`Buscar por nombre, cédula, código${tab === "estudiantes" ? ", RNE" : ""}...`}
          style={s.inputBusqueda}
        />

        {cargando ? (
          <div style={s.vacio}>Cargando...</div>
        ) : listaFiltrada.length === 0 ? (
          <div style={s.vacio}>No hay {tab} registrados aún.</div>
        ) : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.thead}>
                  {tab === "empleados" && <>
                    <th style={s.th}>Nombre completo</th>
                    <th style={s.th}>Cédula</th>
                    <th style={s.th}>Rol</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Teléfono</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </>}
                  {tab === "tutores" && <>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Nombre completo</th>
                    <th style={s.th}>Cédula</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Teléfono</th>
                    <th style={s.th}>Estudiantes</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </>}
                  {tab === "estudiantes" && <>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Nombre completo</th>
                    <th style={s.th}>RNE</th>
                    <th style={s.th}>Tutor</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((u: any, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    {tab === "empleados" && <>
                      <td style={s.td}>{u.nombre} {u.apellido}</td>
                      <td style={s.td}>{u.cedula}</td>
                      <td style={s.td}><span style={s.rolBadge}>{ROLES_EMPLEADO[u.rol] ?? u.rol ?? "—"}</span></td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.telefono || "—"}</td>
                      <td style={s.td}><span style={u.activo ? s.activo : s.inactivo}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                      <td style={s.td}><Acciones u={u} onEditar={abrirEditar} onEstado={cambiarEstado} /></td>
                    </>}
                    {tab === "tutores" && <>
                      <td style={s.td}><code style={s.codigo}>{u.codigo}</code></td>
                      <td style={s.td}>{u.nombre} {u.apellido}</td>
                      <td style={s.td}>{u.cedula}</td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.telefono || "—"}</td>
                      <td style={s.td}>{u.estudiantes?.length ?? 0} representado(s)</td>
                      <td style={s.td}><span style={u.activo ? s.activo : s.inactivo}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                      <td style={s.td}><Acciones u={u} onEditar={abrirEditar} onEstado={cambiarEstado} /></td>
                    </>}
                    {tab === "estudiantes" && <>
                      <td style={s.td}><code style={s.codigo}>{u.codigo}</code></td>
                      <td style={s.td}>{u.nombre} {u.apellido}</td>
                      <td style={s.td}>{u.cedula || "—"}</td>
                      <td style={s.td}>{u.RNE || "—"}</td>
                      <td style={s.td}>{u.tutor ? `${u.tutor.nombre} ${u.tutor.apellido} (${u.tutor.codigo})` : "—"}</td>
                      <td style={s.td}><span style={u.activo ? s.activo : s.inactivo}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                      <td style={s.td}><Acciones u={u} onEditar={abrirEditar} onEstado={cambiarEstado} /></td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            {contrasenaTemp ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
                <h2 style={{ color: "#276749", marginBottom: "8px" }}>Empleado registrado</h2>
                <p style={{ color: "#555", fontSize: "14px", marginBottom: "16px" }}>{mensaje}</p>
                <div style={s.contrasenaBox}>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 6px" }}>Contraseña temporal:</p>
                  <code style={{ fontSize: "22px", fontWeight: "bold", color: "#2C1810", letterSpacing: "2px" }}>
                    {contrasenaTemp}
                  </code>
                  <p style={{ fontSize: "11px", color: "#999", marginTop: "8px" }}>
                    Entrégala al empleado. Podrá cambiarla desde su perfil.
                  </p>
                </div>
                <button onClick={() => { setModal(null); setContrasenaTemp(""); setMensaje(""); }}
                  style={{ ...s.btnGuardar, marginTop: "16px" }}>
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <h2 style={s.modalTitulo}>
                  {modal === "nuevo"
                    ? `Registrar ${tab === "empleados" ? "empleado" : tab === "tutores" ? "tutor" : "estudiante"}`
                    : `Editar ${tab === "empleados" ? "empleado" : tab === "tutores" ? "tutor" : "estudiante"}`}
                </h2>
                {tab === "empleados"   && <FormEmpleado   form={form} setForm={setForm} esNuevo={modal === "nuevo"} />}
                {tab === "tutores"     && <FormTutor      form={form} setForm={setForm} esNuevo={modal === "nuevo"} />}
                {tab === "estudiantes" && <FormEstudiante form={form} setForm={setForm} tutores={tutores} esNuevo={modal === "nuevo"} />}
                {error && <p style={s.errorMsg}>{error}</p>}
                <div style={s.modalBotones}>
                  <button onClick={() => setModal(null)} style={s.btnCancelar}>Cancelar</button>
                  <button onClick={() => guardar(modal === "nuevo")} style={s.btnGuardar}>
                    {modal === "nuevo" ? "Registrar" : "Guardar cambios"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Acciones({ u, onEditar, onEstado }: any) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={() => onEditar(u)} style={s.btnEditar}>✏️ Editar</button>
      <button onClick={() => onEstado(u)} style={u.activo ? s.btnInhabilitar : s.btnHabilitar}>
        {u.activo ? "🚫 Inhabilitar" : "✅ Habilitar"}
      </button>
    </div>
  );
}

function FormEmpleado({ form, setForm, esNuevo }: any) {
  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div style={s.formGrid}>
      <Campo label="Nombre *"      name="nombre"   value={form.nombre}   onChange={c} required />
      <Campo label="Apellido *"    name="apellido" value={form.apellido} onChange={c} required />
      <Campo label="Cédula *"      name="cedula"   value={form.cedula}   onChange={c} required />
      <Campo label="Email *"       name="email"    value={form.email}    onChange={c} type="email" required />
      <Campo label="Teléfono"      name="telefono" value={form.telefono} onChange={c} />
      <Campo label="Salario (RD$)" name="salario"  value={form.salario}  onChange={c} type="number" />
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={s.label}>Rol *</label>
        <select name="rol" value={form.rol || ""} onChange={c} style={s.input}>
          <option value="">Selecciona un rol</option>
          {Object.entries(ROLES_EMPLEADO).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      </div>
      {esNuevo && (
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={s.infoBox}>
            ℹ️ La contraseña temporal se generará automáticamente y se mostrará al registrar.
          </div>
        </div>
      )}
    </div>
  );
}

function FormTutor({ form, setForm, esNuevo }: any) {
  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div style={s.formGrid}>
      <Campo label="Nombre *"       name="nombre"    value={form.nombre}    onChange={c} required />
      <Campo label="Apellido *"     name="apellido"  value={form.apellido}  onChange={c}  required />
      <Campo label="Cédula *"       name="cedula"    value={form.cedula}    onChange={c}  required />
      <Campo label="Teléfono"       name="telefono"  value={form.telefono}  onChange={c} required />
      <Campo label="Dirección"      name="direccion" value={form.direccion} onChange={c} required />
      <Campo label="Email *"        name="email"     value={form.email}     onChange={c} type="email" required />
      <Campo label="Ocupación"      name="ocupacion" value={form.ocupacion} onChange={c} />
      <Campo label="Nombre de contacto alterno *" value={form.nombreContactoAlterno} onChange={c} required />
      <Campo label="Teléfono de contacto alterno" name="telefonoContactoAlterno" value={form.telefonoContactoAlterno} onChange={c} required />
      {esNuevo && (
        <Campo label="Contraseña *" name="contrasena" value={form.contrasena} onChange={c} type="password" required />
      )}
    </div>
  );
}

function FormEstudiante({ form, setForm, tutores, esNuevo }: any) {
  const c = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div style={s.formGrid}>
      <Campo label="Nombre *"            name="nombre"   value={form.nombre}   onChange={c} required />
      <Campo label="Apellido *"          name="apellido" value={form.apellido} onChange={c} required />
      <Campo label="RNE"                 name="RNE"      value={form.RNE}      onChange={c} />
      <Campo label="Fecha de nacimiento" name="fechaNac" value={form.fechaNac} onChange={c} type="date" required />
      <div>
        <label style={s.label}>Tutor / Representante</label>
        <select name="tutorId" value={form.tutorId || ""} onChange={c} style={s.input}>
          <option value="">Sin tutor asignado</option>
          {tutores.map((t: Tutor) => (
            <option key={t.id} value={t.id}>
              {t.nombre} {t.apellido} — Cód. {t.codigo}
            </option>
          ))}
        </select>
      </div>
      {esNuevo && (
        <>
          <Campo label="Email *"      name="email"      value={form.email}      onChange={c} type="email" required />
          <Campo label="Contraseña *" name="contrasena" value={form.contrasena} onChange={c} type="password" required />
        </>
      )}
    </div>
  );
}

function Campo({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type={type} name={name} value={value || ""} onChange={onChange} style={s.input} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:      { color: "#2C1810", fontWeight: "bold" },
  main:        { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:         { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:     { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:    { fontWeight: "bold", fontSize: "16px" },
  navUser:     { fontSize: "14px" },
  contenido:   { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", margin: 0 },
  btnNuevo:    { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exito:       { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs:        { display: "flex", gap: "8px", marginBottom: "16px" },
  tab:         { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666", display: "flex", alignItems: "center", gap: "8px" },
  tabActivo:   { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  badge:       { background: "#2C1810", color: "#fff", borderRadius: "10px", padding: "2px 8px", fontSize: "11px" },
  inputBusqueda: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  vacio:       { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:   { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:       { width: "100%", borderCollapse: "collapse" as any },
  thead:       { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th:          { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:          { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  activo:      { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:    { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  rolBadge:    { background: "#F3E8FF", color: "#C0392B", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  codigo:      { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  btnEditar:   { background: "#EBF3FB", color: "#2C1810", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnInhabilitar: { background: "#fff5f5", color: "#c53030", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  btnHabilitar:   { background: "#f0fff4", color: "#276749", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" },
  overlay:     { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:   { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" as any },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 20px" },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
  label:       { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:       { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  errorMsg:    { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  modalBotones:{ display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar: { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:  { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  contrasenaBox: { background: "#EBF3FB", border: "2px dashed #1F5C99", borderRadius: "10px", padding: "16px", margin: "12px 0" },
  infoBox:     { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#744210" },
};
