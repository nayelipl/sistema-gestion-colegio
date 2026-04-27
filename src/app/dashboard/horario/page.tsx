"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const HORAS = ["07:00","07:45","08:30","09:15","10:00","10:45","11:30","12:15","13:00","13:45","14:30","15:15","16:00"];
const ROLES_GESTION = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];
const ROLES_VER = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE", "MAESTRO", "TUTOR", "ESTUDIANTE"];

type Seccion = { id: number; codigo: string; aula: string; curso: { grado: string } };
type Asignacion = { id: number; asignatura: { nombre: string; codigo: string }; maestro: { nombre: string; apellido: string }; seccion: { aula: string; curso: { grado: string } } };
type Horario = { id: number; diaSemana: number; horaInicio: string; horaFin: string; seccionId: number; asignacion: { maestro: { nombre: string; apellido: string }; asignatura: { nombre: string; codigo: string } } };

export default function HorarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [secciones, setSecciones]     = useState<Seccion[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [horarios, setHorarios]       = useState<Horario[]>([]);
  const [seccionId, setSeccionId]     = useState("");
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState<any>({});
  const [error, setError]             = useState("");
  const [exito, setExito]             = useState("");
  const [cargando, setCargando]       = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/academico/secciones").then(r => r.json()),
      fetch("/api/asignaciones").then(r => r.json()),
    ]).then(([s, a]) => {
      setSecciones(s.secciones || []);
      setAsignaciones(a.asignaciones || []);
      setCargando(false);
    });
  }, [status]);

  useEffect(() => {
    if (!seccionId) { setHorarios([]); return; }
    fetch(`/api/horario?seccionId=${seccionId}`)
      .then(r => r.json())
      .then(d => setHorarios(d.horarios || []));
  }, [seccionId]);

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_VER.includes(rol)) return <div style={s.sinAcceso}>🚫 Sin permiso. <a href="/dashboard" style={s.enlace}>Volver</a></div>;

  const puedeGestionar = ROLES_GESTION.includes(rol);

  const asignacionesFiltradas = asignaciones.filter(a =>
    seccionId ? String((a as any).seccion?.id || (a as any).seccionId) === seccionId : true
  );

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/horario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, seccionId }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito("Horario registrado.");
    setModal(false);
    setForm({});
    fetch(`/api/horario?seccionId=${seccionId}`).then(r => r.json()).then(d => setHorarios(d.horarios || []));
    setTimeout(() => setExito(""), 3000);
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este horario?")) return;
    await fetch(`/api/horario?id=${id}`, { method: "DELETE" });
    setHorarios(h => h.filter(x => x.id !== id));
  };

  // Construir grilla
  const grilla: Record<number, Record<string, Horario | null>> = {};
  for (let d = 1; d <= 5; d++) {
    grilla[d] = {};
    HORAS.slice(0, -1).forEach(h => { grilla[d][h] = null; });
  }
  horarios.forEach(h => {
    if (grilla[h.diaSemana]) grilla[h.diaSemana][h.horaInicio] = h;
  });

  return (
    <main style={s.main}>
      <NavBar titulo="Horario Escolar" icono="📅" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Horario Escolar</h1>
            <p style={s.subtitulo}>Consulta y gestión de horarios por sección</p>
          </div>
          {puedeGestionar && seccionId && (
            <button onClick={() => { setModal(true); setForm({}); setError(""); }} style={s.btnNuevo}>
              + Agregar bloque
            </button>
          )}
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.filtroRow}>
          <label style={s.label}>Sección:</label>
          <select value={seccionId} onChange={e => setSeccionId(e.target.value)} style={s.select}>
            <option value="">Selecciona una sección</option>
            {secciones.map(sec => (
              <option key={sec.id} value={sec.id}>
                {sec.curso.grado} — {sec.aula} ({sec.codigo})
              </option>
            ))}
          </select>
        </div>

        {!seccionId ? (
          <div style={s.vacio}>Selecciona una sección para ver su horario.</div>
        ) : horarios.length === 0 && !modal ? (
          <div style={s.vacio}>No hay horario registrado para esta sección.</div>
        ) : (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr>
                  <th style={s.thHora}>Hora</th>
                  {DIAS.slice(1).map(d => <th key={d} style={s.th}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {HORAS.slice(0, -1).map((hora, i) => (
                  <tr key={hora}>
                    <td style={s.tdHora}>{hora} – {HORAS[i + 1]}</td>
                    {[1,2,3,4,5].map(dia => {
                      const bloque = grilla[dia][hora];
                      return (
                        <td key={dia} style={s.td}>
                          {bloque ? (
                            <div style={s.bloque}>
                              <strong style={{ fontSize: "12px" }}>{bloque.asignacion.asignatura.nombre}</strong>
                              <span style={s.bloqueProf}>{bloque.asignacion.maestro.nombre} {bloque.asignacion.maestro.apellido}</span>
                              {puedeGestionar && (
                                <button onClick={() => eliminar(bloque.id)} style={s.btnEliminar}>✕</button>
                              )}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
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
            <h2 style={s.modalTitulo}>Agregar bloque al horario</h2>
            <form onSubmit={guardar}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={s.label}>Día *</label>
                  <select name="diaSemana" value={form.diaSemana || ""} onChange={e => setForm({...form, diaSemana: e.target.value})} style={s.input} required>
                    <option value="">Selecciona</option>
                    {DIAS.slice(1).map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Hora inicio *</label>
                    <select name="horaInicio" value={form.horaInicio || ""} onChange={e => setForm({...form, horaInicio: e.target.value})} style={s.input} required>
                      <option value="">Selecciona</option>
                      {HORAS.slice(0, -1).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Hora fin *</label>
                    <select name="horaFin" value={form.horaFin || ""} onChange={e => setForm({...form, horaFin: e.target.value})} style={s.input} required>
                      <option value="">Selecciona</option>
                      {HORAS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Asignatura / Maestro *</label>
                  <select name="asignacionId" value={form.asignacionId || ""} onChange={e => setForm({...form, asignacionId: e.target.value})} style={s.input} required>
                    <option value="">Selecciona</option>
                    {asignacionesFiltradas.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.asignatura.nombre} — {a.maestro.nombre} {a.maestro.apellido}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:    { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" },
  enlace:       { color: "#2C1810" },
  main:         { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  contenido:    { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo:       { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo:    { fontSize: "13px", color: "#666", margin: 0 },
  btnNuevo:     { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg:     { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg:     { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  filtroRow:    { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  label:        { fontSize: "13px", fontWeight: "600", color: "#333" },
  select:       { padding: "9px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", minWidth: "280px" },
  vacio:        { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:    { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width: "100%", borderCollapse: "collapse" },
  th:           { padding: "12px 8px", background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", fontSize: "13px", fontWeight: "bold", textAlign: "center", minWidth: "140px" },
  thHora:       { padding: "12px 8px", background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", fontSize: "13px", fontWeight: "bold", textAlign: "center", minWidth: "100px" },
  td:           { padding: "6px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", verticalAlign: "top", height: "60px" },
  tdHora:       { padding: "6px 10px", borderBottom: "1px solid #f0f0f0", fontSize: "12px", color: "#666", whiteSpace: "nowrap", textAlign: "center", background: "#f8f9fa" },
  bloque:       { background: "linear-gradient(135deg,#EBF3FB,#F3EBF9)", border: "1px solid #C5D8F0", borderRadius: "6px", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "2px", height: "100%", position: "relative" },
  bloqueProf:   { fontSize: "11px", color: "#666" },
  btnEliminar:  { position: "absolute", top: "4px", right: "4px", background: "none", border: "none", color: "#c53030", cursor: "pointer", fontSize: "12px", padding: "0" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard:    { background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "480px" },
  modalTitulo:  { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 20px" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" },
  modalBotones: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  btnCancelar:  { background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
  btnGuardar:   { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
};
