"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AsyncSelect from "react-select/async";
import { calcularEdadDisplay } from "@/lib/calcular-edad";
import { formatFechaLarga } from "@/lib/formatear-fecha";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "@/components/ImprimirContenido";
import NavBar from "@/components/NavBar";

type Estudiante = {
  id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  fechaNac?: string;
  edad?: number;
  activo?: boolean;
  tutor?: { id: number; nombre: string; apellido: string; cuentaNo: string };
  seccion?: { id: number; aula: string; codigo: string; curso: { grado: string } };
};

type Seccion = {
  id: number;
  codigo: string;
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
  const [modoEdicion, setModoEdicion] = useState<"nuevo" | "ver" | "editando">("nuevo");
  const [matriculaActual, setMatriculaActual] = useState<MatriculaRecord | null>(null);
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [mostrarListado, setMostrarListado] = useState(false);
  const [mostrarModalTransporte, setMostrarModalTransporte] = useState(false);
  const [estudianteMatriculado, setEstudianteMatriculado] = useState<any>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const { componentRef, handleImprimir } = useImprimir();

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "SECRETARIA_DOCENTE", "CAJERO"];

  const formatMonto = (monto: number | string | null | undefined): string => {
    if (monto === null || monto === undefined) return "RD$0.00";
    const num = typeof monto === 'number' ? monto : parseFloat(String(monto));
    if (isNaN(num)) return "RD$0.00";
    return `RD$${num.toFixed(2)}`;
  };

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

  useEffect(() => {
    if (mostrarListado) {
      cargarMatriculaciones();
    }
  }, [mostrarInactivos]);

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
      const res = await fetch(`/api/matricula/listado?incluirInactivos=${mostrarInactivos}`);
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
      const res = await fetch(`/api/usuarios/estudiantes/buscar?q=${encodeURIComponent(inputValue)}&incluirInactivos=true`);
      const data = await res.json();
      return data.map((estudiante: any) => ({
        value: estudiante.id,
        label: estudiante.label || `${estudiante.codigo} - ${estudiante.nombre} ${estudiante.apellido}`,
        estudiante: estudiante.estudiante || estudiante,
        sublabel: `${estudiante.estudiante?.activo !== false ? "✅ Activo" : "❌ Inactivo"}`
      }));
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
      setMatriculaActual(null);
    } else {
      limpiarFormulario();
    }
  };

  const limpiarFormulario = () => {
    setMatriculaActual(null);
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

  const verMatricula = (matricula: MatriculaRecord) => {
    setMatriculaActual(matricula);
    setEstudianteSeleccionado(matricula.estudiante);
    setSeccionSel(matricula.seccionId.toString());
    setCursoAnterior(matricula.estudiante.seccion?.aula || "");
    setValorCobrado(matricula.valorCobrado);
    setObservaciones(matricula.observaciones || "");
    setIndiceActual(matriculaciones.findIndex(m => m.id === matricula.id));
    setModoEdicion("ver");
    setMostrarListado(false);
  };

  const editarMatricula = () => {
    if (matriculaActual) {
      setModoEdicion("editando");
    }
  };

  const cancelarEdicion = () => {
    if (matriculaActual) {
      setEstudianteSeleccionado(matriculaActual.estudiante);
      setSeccionSel(matriculaActual.seccionId.toString());
      setCursoAnterior(matriculaActual.estudiante.seccion?.aula || "");
      setValorCobrado(matriculaActual.valorCobrado);
      setObservaciones(matriculaActual.observaciones || "");
      setModoEdicion("ver");
    } else {
      limpiarFormulario();
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
    if (nuevoIndice !== indiceActual && nuevoIndice >= 0) {
      verMatricula(matriculaciones[nuevoIndice]);
    }
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
        setCargando(false);
        return;
      }
      
      setExito("Matriculación guardada exitosamente");
      limpiarFormulario();
      await cargarMatriculaciones();
      setEstudianteMatriculado(estudianteSeleccionado);
      
      // Esperar para que se procesen los movimientos contables
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMostrarModalTransporte(true);
      setTimeout(() => setExito(""), 3000);
    } catch (error) {
      setError("Error de conexión al servidor");
    } finally {
      setCargando(false);
    }
  };

  const darDeBaja = async (id: number, nombre: string, apellido: string) => {
    if (!confirm(`¿Dar de baja a ${nombre} ${apellido}?\n\nEsta acción:\n• Cancelará todos los cargos futuros\n• El balance del tutor se ajustará a cero\n• El estudiante no podrá matricularse hasta ser reactivado\n\n¿Estás seguro?`)) return;

    setCargando(true);
    setError("");

    try {
      const res = await fetch(`/api/usuarios/estudiantes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al dar de baja");
      
      setExito(data.mensaje || `✅ ${nombre} ${apellido} ha sido dado de baja correctamente`);
      await cargarMatriculaciones();
      if (estudianteSeleccionado?.id === id) limpiarFormulario();
      setTimeout(() => setExito(""), 4000);
    } catch (error: any) {
      console.error("Error al dar de baja:", error);
      setError(error.message || "Error al dar de baja al estudiante");
      setTimeout(() => setError(""), 4000);
    } finally {
      setCargando(false);
    }
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={s.main}>
      <NavBar titulo="Matriculación" icono="🎓" userName={session?.user?.name} />
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
              <span style={s.inscripcionNo}>
                Inscripción no.: {modoEdicion === "nuevo" ? "NUEVO" : matriculaActual?.inscripcionNo || "NUEVO"}
              </span>
              <span style={s.fecha}>Fecha: {formatFechaLarga(new Date())}</span>
              {modoEdicion !== "nuevo" && (
                <span style={modoEdicion === "editando" ? s.badgeEditando : s.badgeViendo}>
                  {modoEdicion === "editando" ? "✏️ Editando" : "👁️ Viendo"}
                </span>
              )}
            </div>
            <div style={s.navegacion}>
              <button onClick={() => navegar("primero")} style={s.btnNav} disabled={matriculaciones.length === 0}>⏮</button>
              <button onClick={() => navegar("anterior")} style={s.btnNav} disabled={matriculaciones.length === 0 || indiceActual <= 0}>◀</button>
              <span style={s.navInfo}>Registro {indiceActual + 1}/{matriculaciones.length}</span>
              <button onClick={() => navegar("siguiente")} style={s.btnNav} disabled={matriculaciones.length === 0 || indiceActual >= matriculaciones.length - 1}>▶</button>
              <button onClick={() => navegar("ultimo")} style={s.btnNav} disabled={matriculaciones.length === 0}>⏭</button>
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
                  isDisabled={modoEdicion === "ver"}
                  styles={{
                    control: (base) => ({ ...base, padding: "4px", borderRadius: "7px", border: "1px solid #ddd", minHeight: "42px" }),
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
                  disabled={modoEdicion === "ver"}
                >
                  <option value="">SELECCIONA UNA SECCIÓN</option>
                  {secciones.map(sec => {
                    const cuposRestantes = (sec.cupos || 0) - (sec.inscritos || 0);
                    return (
                      <option key={sec.id} value={sec.id} disabled={cuposRestantes <= 0}>
                        {sec.aula} - {sec.curso?.grado} ({cuposRestantes} cupos)
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
                <input 
                  type="number" 
                  value={valorCobrado} 
                  onChange={(e) => setValorCobrado(parseFloat(e.target.value))} 
                  style={s.input}
                  disabled={modoEdicion === "ver"}
                />
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
              disabled={modoEdicion === "ver"}
            />
          </div>

          <div style={s.buttonGroup}>
            {modoEdicion === "editando" && (
              <button onClick={cancelarEdicion} style={s.btnSecundario}>Cancelar</button>
            )}
            {modoEdicion === "ver" && (
              <button onClick={editarMatricula} style={s.btnEditar}>✏️ Editar</button>
            )}
            <button onClick={() => { setMostrarListado(true) }} style={s.btnSecundario}>Ver Listado</button>
            {!modoEdicion && (
              <button onClick={handleImprimir} style={s.btnImprimir}>🖨️ Imprimir</button>
            )}
            {(modoEdicion === "nuevo" || modoEdicion === "editando") && (
              <button onClick={guardarMatricula} disabled={cargando} style={s.btnGuardar}>
                {cargando ? "Guardando..." : modoEdicion === "editando" ? "Actualizar" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {mostrarListado && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>📋 Listado de Matriculaciones</h2>
              <div style={s.filtrosHeader}>
                <button onClick={() => setMostrarInactivos(!mostrarInactivos)} style={mostrarInactivos ? s.btnActivo : s.btnInactivo}>
                  {mostrarInactivos ? "📋 Ocultar inactivos" : "🗑️ Mostrar inactivos"}
                </button>
                <button onClick={() => setMostrarListado(false)} style={s.btnCerrarModal}>✕</button>
              </div>
            </div>
            <div style={s.modalBody}>
              {matriculaciones.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888" }}>No hay matriculaciones registradas</p>
              ) : (
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead><tr style={s.thead}><th style={s.th}>Inscripción No.</th><th style={s.th}>Fecha</th><th style={s.th}>Estudiante</th><th style={s.th}>Sección</th><th style={s.th}>Valor</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th></tr></thead>
                    <tbody>
                      {matriculaciones.map((mat) => (
                        <tr key={mat.id} style={{ opacity: mat.estudiante?.activo === false ? 0.6 : 1 }}>
                          <td style={s.td}>{mat.inscripcionNo}</td>
                          <td style={s.td}>{formatFechaLarga(mat.fecha)}</td>
                          <td style={s.td}>{mat.estudiante?.nombre} {mat.estudiante?.apellido}{mat.estudiante?.activo === false && <span style={{ color: "#c53030", fontSize: "10px", marginLeft: "8px" }}>(Dado de baja)</span>}</td>
                          <td style={s.td}>{mat.seccion?.aula || "—"}</td>
                          <td style={s.td}>{formatMonto(mat.valorCobrado)}</td>
                          <td style={s.td}><span style={mat.estudiante?.activo !== false ? s.badgeActivo : s.badgeInactivo}>{mat.estudiante?.activo !== false ? "Activo" : "Inactivo"}</span></td>
                          <td style={s.td}>
                            <button onClick={() => verMatricula(mat)} style={s.btnVer} title="Ver matrícula">👁️ Ver</button>
                            {mat.estudiante?.activo !== false && (
                              <button onClick={() => darDeBaja(mat.estudianteId, mat.estudiante?.nombre, mat.estudiante?.apellido)} style={s.btnBaja} title="Dar de baja al estudiante">🚫 Baja</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarModalTransporte && (
        <div style={s.modalOverlay}>
          <div style={s.modalTransporte}>
            <h3 style={s.modalTitulo}>🚌 Servicio de Transporte</h3>
            <p style={{ marginBottom: "16px" }}>¿Desea activar el servicio de transporte para el estudiante <strong>{estudianteMatriculado?.nombre} {estudianteMatriculado?.apellido}</strong>?</p>
            <div style={s.modalButtons}>
              <button onClick={() => { setMostrarModalTransporte(false); router.push(`/dashboard/transporte?vincular=true&estudianteId=${estudianteMatriculado?.id}`); }} style={s.btnConfirmar}>✅ Sí, activar transporte</button>
              <button onClick={() => setMostrarModalTransporte(false)} style={{ background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" }}>❌ No, gracias</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "none" }}>
        <ImprimirContenido ref={componentRef} titulo="Comprobante de Matrícula" datos={modoEdicion === "editando" && matriculaActual ? { ...matriculaActual, estudianteNombre: matriculaActual.estudiante?.nombre, estudianteApellido: matriculaActual.estudiante?.apellido, estudianteCodigo: matriculaActual.estudiante?.codigo, seccionNombre: matriculaActual.seccion?.aula, cursoGrado: matriculaActual.seccion?.curso?.grado, fechaFormateada: formatFechaLarga(matriculaActual.fecha) } : null} tipo="matricula" />
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  contenido: { maxWidth: "800px", margin: "0 auto", padding: "28px 20px" },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" },
  formCard: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "12px", borderBottom: "2px solid #eee", flexWrap: "wrap", gap: "12px" },
  formHeaderLeft: { display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" },
  inscripcionNo: { fontWeight: "bold", color: "#2C1810", fontSize: "14px" },
  fecha: { color: "#666", fontSize: "13px" },
  badgeEditando: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" },
  badgeViendo: { background: "#EBF3FB", color: "#2C1810", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" },
  navegacion: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  btnNav: { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "14px" },
  btnNuevo: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  navInfo: { fontSize: "12px", color: "#666", minWidth: "50px", textAlign: "center" },
  seccion: { marginBottom: "24px", padding: "16px", background: "#fafafa", borderRadius: "8px" },
  seccionTitulo: { fontSize: "15px", fontWeight: "bold", color: "#2C1810", margin: "0 0 16px 0", borderBottom: "2px solid #1F5C99", paddingBottom: "6px", display: "inline-block" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  textarea: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" as any },
  buttonGroup: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee", flexWrap: "wrap" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  btnSecundario: { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  overlay: { position: "fixed" as any, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: "12px", width: "90%", maxWidth: "900px", maxHeight: "80vh", display: "flex", flexDirection: "column" as any },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #ddd" },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  btnCerrarModal: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" },
  filtrosHeader: { display: "flex", gap: "12px", alignItems: "center" },
  btnActivo: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  btnInactivo: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  modalBody: { padding: "20px", overflow: "auto" as any, flex: 1 },
  tablaWrap: { overflowX: "auto", width: "100%" },
  tabla: { width: "100%", borderCollapse: "collapse" as any, fontSize: "13px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  th: { padding: "10px 12px", color: "#fff", textAlign: "left" as any, fontSize: "12px" },
  td: { padding: "8px 12px", borderBottom: "1px solid #eee" },
  btnVer: { background: "#EBF3FB", color: "#2C1810", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "12px" },
  btnBaja: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "12px", marginLeft: "8px" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", display: "inline-block" },
  badgeInactivo: { background: "#fed7d7", color: "#c53030", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", display: "inline-block" },
  modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalTransporte: { background: "#fff", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90%", textAlign: "center" as const },
  modalButtons: { display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" },
  btnConfirmar: { background: "#2F855A", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontSize: "14px" },
  btnCancelarModal: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontSize: "14px" }
};