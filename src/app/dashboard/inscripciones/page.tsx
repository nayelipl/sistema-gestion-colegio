"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { calcularEdadDisplay } from "@/lib/calcular-edad";

type Tutor = {
  id: number; 
  cuentaNo: string;
  nombre: string; 
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string; 
  celular?: string;
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
  const [esNuevo, setEsNuevo] = useState(true);
  const [tutorSeleccionado, setTutorSeleccionado] = useState<any>(null);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios/tutores").then(r => r.json()).then(d => setTutores(d));
  }, [exito]);

  useEffect(() => {
  if (!tutorSeleccionado?.tutor) return;
  
  const parentescoValue = form.parentesco;
  const tutor = tutorSeleccionado.tutor;

  if (parentescoValue === "PADRE") {
    setForm((prev: any) => ({
      ...prev,
      padreNombre: tutor.nombre || "",
      padreApellido: tutor.apellido || "",
      padreTipoDoc: tutor.tipoDocIdentidad || "CEDULA",
      padreNumeroDoc: tutor.numeroDocIdentidad || "",
      padreCelular: tutor.celular || "",
      padreTelefonoResidencial: tutor.telefonoResidencial || "",
      padreTelefonoTrabajo: tutor.telefonoTrabajo || "",
      padreOcupacion: tutor.ocupacion || "",
      padreDireccion: tutor.direccion || "",
      padreEmail: tutor.email || "",
    }));
  } 

  else if (parentescoValue === "MADRE") {
    setForm((prev: any) => ({
      ...prev,
      madreNombre: tutor.nombre || "",
      madreApellido: tutor.apellido || "",
      madreTipoDoc: tutor.tipoDocIdentidad || "CEDULA",
      madreNumeroDoc: tutor.numeroDocIdentidad || "",
      madreCelular: tutor.celular || "",
      madreTelefonoResidencial: tutor.telefonoResidencial || "",
      madreTelefonoTrabajo: tutor.telefonoTrabajo || "",
      madreOcupacion: tutor.ocupacion || "",
      madreDireccion: tutor.direccion || "",
      madreEmail: tutor.email || "",
    }));
  }
}, [form.parentesco, tutorSeleccionado]);

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const cargarTutores = async (inputValue: string) => {
  if (!inputValue || inputValue.length < 2) {
    return [];
  }

  try {
      const response = await fetch(`/api/usuarios/tutores/buscar?q=${encodeURIComponent(inputValue)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      return data.map((tutor: any) => ({
        value: tutor.id,
        label: `${tutor.cuentaNo} - ${tutor.nombre} ${tutor.apellido}`,
        tutor: tutor,
        sublabel: `${tutor.tipoDocIdentidad === "CEDULA" ? "Cédula:" : "Pasaporte:"} ${tutor.numeroDocIdentidad} | ${tutor.email}`
      }));
    } catch (error) {
      console.error("Error cargando tutores:", error);
      return [];
    }
  };

  const formatoOption = (data: any) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{data.label}</span>
      <span style={{ fontSize: "11px", color: "#666" }}>{data.sublabel}</span>
    </div>
  );

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

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "CAJERO" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

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
                <div style={s.formContainer}>
                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>👤 Datos Personales</h3>
                    <div style={s.grid}>
                      <Campo label="Nombre *" name="nombre" value={form.nombre} onChange={c} required />
                      <Campo label="Apellido *" name="apellido" value={form.apellido} onChange={c} required />
                      
                      <div>
                        <label style={s.label}>Tipo de documento *</label>
                        <select name="tipoDocIdentidad" value={form.tipoDocIdentidad || "CEDULA"} onChange={c} style={s.input} required>
                          <option value="CEDULA">Cédula</option>
                          <option value="PASAPORTE">Pasaporte</option>
                        </select>
                      </div>
                      
                      <Campo label="Número de documento *" name="numeroDocIdentidad" value={form.numeroDocIdentidad} onChange={c} required />
                      <Campo label="Ocupación" name="ocupacion" value={form.ocupacion} onChange={c} />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>📞 Información de Contacto</h3>
                    <div style={s.grid}>
                      <Campo label="Celular *" name="celular" value={form.celular} onChange={c} placeholder="809-000-0000" required />
                      <Campo label="Teléfono residencial" name="telefonoResidencial" value={form.telefonoResidencial} onChange={c} placeholder="809-000-0000" />
                      <Campo label="Teléfono trabajo" name="telefonoTrabajo" value={form.telefonoTrabajo} onChange={c} placeholder="809-000-0000" />
                      <Campo label="Dirección" name="direccion" value={form.direccion} onChange={c} required />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>🆘 Contacto de Emergencia</h3>
                    <div style={s.grid}>
                      <Campo label="Nombre de contacto alterno" name="nombreContactoAlterno" value={form.nombreContactoAlterno} onChange={c} />
                      <Campo label="Teléfono de contacto alterno" name="telefonoContactoAlterno" value={form.telefonoContactoAlterno} onChange={c} placeholder="809-000-0000" />
                    </div>
                  </div>

                  {esNuevo && (
                    <div style={s.seccionFormulario}>
                      <h3 style={s.seccionTitulo}>🔐 Datos de Acceso</h3>
                      <div style={s.grid}>
                        <Campo label="Email *" name="email" value={form.email} onChange={c} type="email" required />
                        <Campo label="Contraseña *" name="contrasena" value={form.contrasena} onChange={c} type="password" required />
                      </div>
                      <div style={s.infoBox}>
                        ℹ️ El tutor usará estas credenciales para acceder al sistema.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "estudiante" && (
                <div style={s.formContainer}>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>📋 Datos del Estudiante</h3>
                    <div style={s.grid}>
                      <Campo label="Nombre *" name="nombre" value={form.nombre} onChange={c} required />
                      <Campo label="Apellido *" name="apellido" value={form.apellido} onChange={c} required />
                      
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={s.label}>Tutor / Representante *</label>
                        <AsyncSelect
                          cacheOptions
                          loadOptions={cargarTutores}
                          defaultOptions={false}
                          onChange={(option: any) => {
                            setTutorSeleccionado(option);
                            setForm({ 
                              ...form, 
                              tutorId: option?.value || "",
                              tutorData: option?.tutor || null
                            });
                          }}
                          value={tutorSeleccionado}
                          placeholder="Buscar por número de cuenta, nombre, apellido o cédula..."
                          isClearable
                          formatOptionLabel={formatoOption}
                          noOptionsMessage={({ inputValue }) => 
                            !inputValue || inputValue.length < 2 
                              ? "Escribe al menos 2 caracteres para buscar..." 
                              : "No se encontraron tutores"
                          }
                          loadingMessage={() => "Buscando tutores..."}
                          styles={{
                            control: (base) => ({ 
                              ...base, 
                              padding: "4px", 
                              borderRadius: "7px", 
                              borderColor: "#ddd",
                              minHeight: "42px"
                            }),
                            menu: (base) => ({ ...base, zIndex: 9999 }),
                            option: (base, state) => ({
                              ...base,
                              padding: "10px 12px",
                              backgroundColor: state.isFocused ? "#EBF3FB" : "white",
                              cursor: "pointer"
                            })
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={s.label}>Parentesco *</label>
                        <select name="parentesco" value={form.parentesco || ""} onChange={c} style={s.input} required>
                          <option value="">Seleccionar</option>
                          <option value="PADRE">Padre</option>
                          <option value="MADRE">Madre</option>
                          <option value="ABUELO">Abuelo</option>
                          <option value="ABUELA">Abuela</option>
                          <option value="TÍO">Tío</option>
                          <option value="TÍA">Tía</option>
                          <option value="AMIGO">Amigo</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      
                      {form.parentesco === "OTRO" && (
                        <Campo label="Especificar parentesco" name="parentescoEspecificar" value={form.parentescoEspecificar} onChange={c} />
                      )}
                      
                      <Campo label="Guardián Legal" name="guardianLegal" value={form.guardianLegal} onChange={c} />
                      
                      <div>
                        <label style={s.label}>Vive con</label>
                        <select name="viveCon" value={form.viveCon || ""} onChange={c} style={s.input} >
                          <option value="">Seleccionar</option>
                          <option value="AMBOS_PADRES">Ambos padres</option>
                          <option value="PADRE">Padre</option>
                          <option value="MADRE">Madre</option>
                          <option value="TUTOR">Tutor</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      
                      {form.viveCon === "OTRO" && (
                        <Campo label="Especificar vive con" name="viveConEspecificar" value={form.viveConEspecificar} onChange={c} />
                      )}
                      
                      <Campo label="Dirección" name="direccion" value={form.direccion} onChange={c} />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>🎂 Datos de Nacimiento</h3>
                    <div style={s.grid}>
                      <Campo label="Fecha de nacimiento *" name="fechaNac" value={form.fechaNac} onChange={c} type="date" />
                      <Campo label="Lugar de nacimiento *" name="lugarNac" value={form.lugarNac} onChange={c} />
                      
                      {form.fechaNac && (
                        <div>
                          <label style={s.label}>Edad</label>
                          <input type="text" value={calcularEdadDisplay(form.fechaNac)} style={s.input} disabled />
                        </div>
                      )}
                      
                      <div>
                        <label style={s.label}>Sexo *</label>
                        <select name="sexo" value={form.sexo || ""} onChange={c} style={s.input} required>
                          <option value="">Seleccionar</option>
                          <option value="MASCULINO">Masculino</option>
                          <option value="FEMENINO">Femenino</option>
                        </select>
                      </div>
                      
                      <Campo label="Folio" name="folio" value={form.folio} onChange={c} />
                      <Campo label="Libro" name="libro" value={form.libro} onChange={c} />
                      <Campo label="Número de acta" name="numeroActa" value={form.numeroActa} onChange={c} />
                      <Campo label="Año del acta" name="anioActa" value={form.anioActa} onChange={c} />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>👨 Datos del Padre</h3>
                    <div style={s.grid}>
                      <Campo label="Nombre" name="padreNombre" value={form.padreNombre} onChange={c} />
                      <Campo label="Apellido" name="padreApellido" value={form.padreApellido} onChange={c} />
                      
                      <div>
                        <label style={s.label}>Tipo de documento</label>
                        <select name="padreTipoDoc" value={form.padreTipoDoc || "CEDULA"} onChange={c} style={s.input}>
                          <option value="CEDULA">Cédula</option>
                          <option value="PASAPORTE">Pasaporte</option>
                        </select>
                      </div>
                      
                      <Campo label="Número de documento" name="padreNumeroDoc" value={form.padreNumeroDoc} onChange={c} />
                      <Campo label="Ocupación" name="padreOcupacion" value={form.padreOcupacion} onChange={c} />
                      <Campo label="Celular" name="padreCelular" value={form.padreCelular} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Teléfono residencial" name="padreTelefonoResidencial" value={form.padreTelefonoResidencial} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Teléfono trabajo" name="padreTelefonoTrabajo" value={form.padreTelefonoTrabajo} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Dirección" name="padreDireccion" value={form.padreDireccion} onChange={c} />
                      <Campo label="Email" name="padreEmail" value={form.padreEmail} onChange={c} type="email" />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>👩 Datos de la Madre</h3>
                    <div style={s.grid}>
                      <Campo label="Nombre" name="madreNombre" value={form.madreNombre} onChange={c} />
                      <Campo label="Apellido" name="madreApellido" value={form.madreApellido} onChange={c} />
                      
                      <div>
                        <label style={s.label}>Tipo de documento</label>
                        <select name="madreTipoDoc" value={form.madreTipoDoc || "CEDULA"} onChange={c} style={s.input}>
                          <option value="CEDULA">Cédula</option>
                          <option value="PASAPORTE">Pasaporte</option>
                        </select>
                      </div>
                      
                      <Campo label="Número de documento" name="madreNumeroDoc" value={form.madreNumeroDoc} onChange={c} />
                      <Campo label="Ocupación" name="madreOcupacion" value={form.madreOcupacion} onChange={c} />
                      <Campo label="Celular" name="madreCelular" value={form.madreCelular} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Teléfono residencial" name="madreTelefonoResidencial" value={form.madreTelefonoResidencial} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Teléfono trabajo" name="madreTelefonoTrabajo" value={form.madreTelefonoTrabajo} onChange={c} placeholder="000-000-0000" />
                      <Campo label="Dirección" name="madreDireccion" value={form.madreDireccion} onChange={c} />
                      <Campo label="Email" name="madreEmail" value={form.madreEmail} onChange={c} type="email" />
                    </div>
                  </div>

                  <div style={s.seccionFormulario}>
                    <h3 style={s.seccionTitulo}>🔐 Datos de Acceso</h3>
                    <div style={s.grid}>

                    {esNuevo && (
                        <>
                          <Campo label="Email *" name="email" value={form.email} onChange={c} type="email" required />
                          <Campo label="Contraseña *" name="contrasena" value={form.contrasena} onChange={c} type="password" required />
                        </>
                      )}
                    </div>
                    <div style={s.infoBox}>
                        ℹ️ El estudiante usará estas credenciales para acceder al sistema.
                      </div>
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
  formContainer: { display: "flex", flexDirection: "column" as any, gap: "24px", },
  seccionFormulario: { border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", backgroundColor: "#fafafa", },
  seccionTitulo: {  fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 16px 0", paddingBottom: "8px", borderBottom: "2px solid #1F5C99", display: "inline-block", },
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
  infoBox:    { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#744210", marginTop: "12px" },
};
