"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { calcularEdadDisplay } from "@/lib/calcular-edad";

type Estudiante = {
  id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  fechaNac?: string;
  edad?: number;
  tutor?: { id: number; nombre: string; apellido: string; cuentaNo: string };
  seccion?: { id: number; aula: string; codigo: string; curso: { grado: string } };
};

type Seccion = {
  id: number;
  codigo: string;
  nombre: string;
  aula: string;
  cupos: number;
  inscritos: number;
  curso: { id: number; nombre: string; grado: string };
};

type MatriculaRecord = {
  id: number;
  inscripcionNo: string;
  fecha: string;
  estudianteId: number;
  estudiante: Estudiante;
  seccionId: number;
  seccion: Seccion;
  anioEscolar: string;
  valorCobrado: number;
  observaciones?: string;
};

export default function MatriculaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";

  // Estados del formulario
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [seccionSel, setSeccionSel] = useState("");
  const [cursoAnterior, setCursoAnterior] = useState("");
  const [anioEscolar] = useState("2025-2026");
  const [valorCobrado, setValorCobrado] = useState(2000);
  const [observaciones, setObservaciones] = useState("");
  
  // Estados de navegación
  const [matriculaciones, setMatriculaciones] = useState<MatriculaRecord[]>([]);
  const [indiceActual, setIndiceActual] = useState(-1);
  const [modoEdicion, setModoEdicion] = useState<"nuevo" | "editando">("nuevo");
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [mostrarListado, setMostrarListado] = useState(false);

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "SECRETARIA_DOCENTE", "CAJERO"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  useEffect(() => {
    cargarSecciones();
    cargarMatriculaciones();
  }, []);

  const cargarSecciones = async () => {
    try {
      const res = await fetch("/api/academico/secciones");
      const data = await res.json();
      setSecciones(data.secciones || []);
    } catch (error) {
      console.error("Error cargando secciones:", error);
    }
  };

  const cargarMatriculaciones = async () => {
    try {
      const res = await fetch("/api/matricula/listado");
      const data = await res.json();
      setMatriculaciones(data.matriculaciones || []);
    } catch (error) {
      console.error("Error cargando matriculaciones:", error);
      setMatriculaciones([]);
    }
  };

  const cargarEstudiantes = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) return [];
    try {
      const res = await fetch(`/api/usuarios/estudiantes/buscar?q=${encodeURIComponent(inputValue)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      return [];
    }
  };

  const handleEstudianteChange = (option: any) => {
    if (option) {
      setEstudianteSeleccionado(option.estudiante);
      setCursoAnterior(option.estudiante.seccion?.aula || "");
      setModoEdicion("nuevo");
    } else {
      setEstudianteSeleccionado(null);
      setCursoAnterior("");
      limpiarFormulario();
    }
  };

    const limpiarFormulario = () => {
      setEstudianteSeleccionado(null);
      setSeccionSel("");
      setCursoAnterior("");
      setValorCobrado(2000);
      setObservaciones("");
      setIndiceActual(-1);
      setModoEdicion("nuevo");
      setError("");
      setExito("");
    };

  const cargarMatriculaEnFormulario = (matricula: MatriculaRecord) => {
    setEstudianteSeleccionado(matricula.estudiante);
    setSeccionSel(matricula.seccionId.toString());
    setCursoAnterior(matricula.estudiante.seccion?.aula || "");
    setValorCobrado(matricula.valorCobrado);
    setObservaciones(matricula.observaciones || "");
    setIndiceActual(matriculaciones.findIndex(m => m.id === matricula.id));
    setModoEdicion("editando");
    setMostrarListado(false);
  };

  const guardarMatricula = async () => {
    if (!estudianteSeleccionado) {
      setError("Debe seleccionar un estudiante");
      return;
    }
    if (!seccionSel) {
      setError("Debe seleccionar una sección");
      return;
    }

    setCargando(true);
    setError("");

    const payload = {
      estudianteId: estudianteSeleccionado.id,
      seccionId: parseInt(seccionSel),
      anioEscolar,
      valorCobrado,
      observaciones,
    };

    try {
      const res = await fetch("/api/matricula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setExito("Matriculación guardada exitosamente");
        limpiarFormulario();
        cargarMatriculaciones();
        setTimeout(() => setExito(""), 3000);
      }
    } catch (error) {
      setError("Error de conexión al servidor");
    } finally {
      setCargando(false);
    }
  };

  const navegar = (direccion: "primero" | "anterior" | "siguiente" | "ultimo") => {
    if (matriculaciones.length === 0) return;
    
    let nuevoIndice = indiceActual;
    switch (direccion) {
      case "primero": nuevoIndice = 0; break;
      case "anterior": nuevoIndice = Math.max(0, indiceActual - 1); break;
      case "siguiente": nuevoIndice = Math.min(matriculaciones.length - 1, indiceActual + 1); break;
      case "ultimo": nuevoIndice = matriculaciones.length - 1; break;
    }
    
    if (nuevoIndice !== indiceActual) {
      cargarMatriculaEnFormulario(matriculaciones[nuevoIndice]);
    }
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🎓 Matriculación</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Gestión de Matrículas</h1>
          <p style={s.subtitulo}>Registro de estudiantes en cursos y secciones</p>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.formHeaderLeft}>
              <span style={s.inscripcionNo}>Inscripción no.: {modoEdicion === "editando" && indiceActual >= 0 ? matriculaciones[indiceActual]?.inscripcionNo || "NUEVO" : "NUEVO"}</span>
              <span style={s.fecha}>Fecha: {new Date().toLocaleDateString("es-DO")}</span>
            </div>
            <div style={s.navegacion}>
              <button onClick={() => navegar("primero")} style={s.btnNav} disabled={matriculaciones.length === 0}>⏮</button>
              <button onClick={() => navegar("anterior")} style={s.btnNav} disabled={matriculaciones.length === 0}>◀</button>
              <span style={s.navInfo}>{indiceActual >= 0 ? `${indiceActual + 1}/${matriculaciones.length}` : "0/0"}</span>
              <button onClick={() => navegar("siguiente")} style={s.btnNav} disabled={matriculaciones.length === 0}>▶</button>
              <button onClick={() => navegar("ultimo")} style={s.btnNav} disabled={matriculaciones.length === 0}>⏭</button>
              <button onClick={limpiarFormulario} style={s.btnNuevo}>+ Nuevo </button>
            </div>
          </div>

          <div style={s.seccion}>
            <h3 style={s.seccionTitulo}>📋 Datos del Estudiante</h3>
            <div style={s.grid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Estudiante *</label>
                <AsyncSelect
                  cacheOptions
                  loadOptions={cargarEstudiantes}
                  onChange={handleEstudianteChange}
                  value={estudianteSeleccionado ? {
                    value: estudianteSeleccionado.id,
                    label: `${estudianteSeleccionado.codigo} - ${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellido}`,
                  } : null}
                  placeholder="Buscar estudiante por código, nombre o apellido..."
                  isClearable
                  styles={{
                    control: (base) => ({ ...base, padding: "4px", borderRadius: "7px", borderColor: "#ddd", minHeight: "42px" }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div>
                <label style={s.label}>Edad</label>
                <input type="text" value={calcularEdadDisplay(estudianteSeleccionado?.fechaNac || "")} style={s.input} disabled />
              </div>
              <div>
                <label style={s.label}>Tutor</label>
                <input type="text" value={estudianteSeleccionado?.tutor ? `${estudianteSeleccionado.tutor.cuentaNo} - ${estudianteSeleccionado.tutor.nombre} ${estudianteSeleccionado.tutor.apellido}` : ""} style={s.input} disabled />
              </div>
              <div>
                <label style={s.label}>Descuento (%)</label>
                <input type="number" value="0" style={s.input} disabled />
              </div>
            </div>
          </div>

          <div style={s.seccion}>
            <h3 style={s.seccionTitulo}>📚 Datos de Matriculación</h3>
            <div style={s.grid}>
              <div>
                <label style={s.label}>Curso anterior</label>
                <input type="text" value={cursoAnterior} style={s.input} disabled />
              </div>
              <div>
                <label style={s.label}>Nuevo curso *</label>
                <select 
                  value={seccionSel} 
                  onChange={(e) => setSeccionSel(e.target.value)} 
                  style={s.input} 
                  required
                >
                  <option value="">SELECCIONA UNA SECCIÓN</option>
                  {secciones.map(sec => {
                    const cuposRestantes = (sec.cupos || 0) - (sec.inscritos || 0);
                    return (
                      <option key={sec.id} value={sec.id} disabled={cuposRestantes <= 0}>
                        {sec.curso?.grado} - {sec.nombre} ({cuposRestantes} cupos)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label style={s.label}>Año escolar</label>
                <input type="text" value={anioEscolar} style={s.input} disabled />
              </div>
              <div>
                <label style={s.label}>Valor cobrado (RD$)</label>
                <input type="number" value={valorCobrado} onChange={(e) => setValorCobrado(parseFloat(e.target.value))} style={s.input} />
              </div>
            </div>
          </div>

          <div style={s.seccion}>
            <h3 style={s.seccionTitulo}>📝 Observaciones</h3>
            <textarea 
              value={observaciones} 
              onChange={(e) => setObservaciones(e.target.value)} 
              style={s.textarea} 
              rows={3}
              placeholder="Comentarios adicionales..."
            />
          </div>

          <div style={s.buttonGroup}>
            <button onClick={limpiarFormulario} style={s.btnSecundario}>Cancelar</button>
            <button onClick={() => setMostrarListado(true)} style={s.btnSecundario}>Ver Listado</button>
            <button style={s.btnSecundario} disabled>Imprimir</button>
            <button onClick={guardarMatricula} disabled={cargando} style={s.btnGuardar}>
              {cargando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {mostrarListado && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>📋 Listado de Matriculaciones</h2>
              <button onClick={() => setMostrarListado(false)} style={s.btnCerrarModal}>✕</button>
            </div>
            <div style={s.modalBody}>
              {matriculaciones.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888" }}>No hay matriculaciones registradas</p>
              ) : (
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Inscripción No.</th>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Estudiante</th>
                      <th style={s.th}>Sección</th>
                      <th style={s.th}>Valor</th>
                      <th style={s.th}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriculaciones.map((mat) => (
                      <tr key={mat.id}>
                        <td style={s.td}>{mat.inscripcionNo}</td>
                        <td style={s.td}>{new Date(mat.fecha).toLocaleDateString("es-DO")}</td>
                        <td style={s.td}>{mat.estudiante?.nombre} {mat.estudiante?.apellido}</td>
                        <td style={s.td}>{mat.seccion?.aula || mat.seccion?.nombre || "—"}</td>
                        <td style={s.td}>
                          RD${typeof mat.valorCobrado === 'number' 
                            ? mat.valorCobrado.toFixed(2) 
                            : parseFloat(String(mat.valorCobrado || 0)).toFixed(2)}
                        </td>
                        <td style={s.td}>
                          <button onClick={() => cargarMatriculaEnFormulario(mat)} style={s.btnVer}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "800px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px" },
  formCard: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "12px", borderBottom: "2px solid #eee" },
  formHeaderLeft: { display: "flex", gap: "24px" },
  inscripcionNo: { fontWeight: "bold", color: "#2C1810", fontSize: "14px" },
  fecha: { color: "#666", fontSize: "13px" },
  navegacion: { display: "flex", gap: "8px", alignItems: "center" },
  btnNav: { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "14px" },
  btnNuevo: { background: "#2F855A", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px",fontWeight: "bold", marginLeft: "16px",},
  navInfo: { fontSize: "12px", color: "#666", minWidth: "50px", textAlign: "center" },
  seccion: { marginBottom: "24px", padding: "16px", background: "#fafafa", borderRadius: "8px" },
  seccionTitulo: { fontSize: "15px", fontWeight: "bold", color: "#2C1810", margin: "0 0 16px 0", borderBottom: "2px solid #1F5C99", paddingBottom: "6px", display: "inline-block" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  textarea: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" as any },
  buttonGroup: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  btnSecundario: { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  overlay: { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: "12px", width: "90%", maxWidth: "900px", maxHeight: "80vh", display: "flex", flexDirection: "column" as any },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #ddd" },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  btnCerrarModal: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" },
  modalBody: { padding: "20px", overflow: "auto" as any, flex: 1 },
  tabla: { width: "100%", borderCollapse: "collapse" as any, fontSize: "13px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "10px 12px", color: "#fff", textAlign: "left" as any, fontSize: "12px" },
  td: { padding: "8px 12px", borderBottom: "1px solid #eee" },
  btnVer: { background: "#EBF3FB", color: "#2C1810", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "12px" },
};