"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "cobrar" | "estado" | "cuadre";
type Tutor = {
  id: number; codigo: string; nombre: string; apellido: string; cedula: string;
};
type Pago = {
  id: number; concepto: string; monto: number; montoPagado: number;
  cambio: number; creadoEn: string;
  tutor: { nombre: string; apellido: string; codigo: string };
};

const CONCEPTOS = [
  "Colegiatura", "Transporte", "Uniforme", "Matrícula",
  "Actividad escolar", "Seguro escolar", "Otro",
];

export default function PagosPresencialesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>("cobrar");
  const [tutores, setTutores]   = useState<Tutor[]>([]);
  const [pagos, setPagos]       = useState<Pago[]>([]);
  const [form, setForm]         = useState<any>({});
  const [busqueda, setBusqueda] = useState("");
  const [tutorSel, setTutorSel] = useState<Tutor | null>(null);
  const [pagosTutor, setPagosTutor] = useState<Pago[]>([]);
  const [fechaCuadre, setFechaCuadre] = useState(new Date().toISOString().split("T")[0]);
  const [cambioMostrar, setCambioMostrar] = useState<number | null>(null);
  const [error, setError]       = useState("");
  const [exito, setExito]       = useState("");
  const [cargando, setCargando] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => setTutores(d.tutores || []));
  }, []);

  useEffect(() => {
    if (tab === "cuadre") cargarCuadre();
  }, [tab, fechaCuadre]);

  useEffect(() => {
    if (tutorSel) {
      fetch(`/api/pagos?tutorId=${tutorSel.id}`)
        .then(r => r.json())
        .then(d => setPagosTutor(d.pagos || []));
    }
  }, [tutorSel]);

  const cargarCuadre = async () => {
    const res  = await fetch(`/api/pagos?fecha=${fechaCuadre}`);
    const data = await res.json();
    setPagos(data.pagos || []);
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

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); setCambioMostrar(null); };

  const calcularCambio = () => {
    const monto      = parseFloat(form.monto || 0);
    const montoPagado = parseFloat(form.montoPagado || 0);
    if (montoPagado >= monto && monto > 0) {
      setCambioMostrar(montoPagado - monto);
    }
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    setExito("");

    const res  = await fetch("/api/pagos", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    setCargando(false);

    if (!res.ok) { setError(data.error); return; }
    setCambioMostrar(data.cambio);
    setExito(`Pago registrado. Cambio a entregar: RD$ ${Number(data.cambio).toLocaleString()}`);
    setForm({});
  };

  const tutoresFiltrados = tutores.filter(t =>
    `${t.nombre} ${t.apellido} ${t.cedula} ${t.codigo}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalCuadre = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🏧 Pagos Presenciales</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Pagos Presenciales</h1>
          <p style={s.subtitulo}>Recibir pagos, estado de cuenta y cuadre de caja</p>
        </div>

        <div style={s.tabs}>
          {([
            { key: "cobrar", label: "💵 Recibir Pago" },
            { key: "estado", label: "📄 Estado de Cuenta" },
            { key: "cuadre", label: "🧾 Cuadre de Caja" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(""); setExito(""); }}
              style={{ ...s.tab, ...(tab === t.key ? s.tabActivo : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RECIBIR PAGO ── */}
        {tab === "cobrar" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Registrar Pago</h2>

            {exito && (
              <div style={s.exitoBox}>
                <div style={{ fontSize: "32px" }}>✅</div>
                <p style={{ fontWeight: "bold", color: "#276749" }}>{exito}</p>
                <button onClick={() => { setExito(""); setCambioMostrar(null); }} style={s.btnGuardar}>
                  Registrar otro pago
                </button>
              </div>
            )}

            {!exito && (
              <form onSubmit={registrarPago}>
                <div style={s.grid}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Tutor *</label>
                    <select name="tutorId" value={form.tutorId || ""} onChange={c} style={s.input} required>
                      <option value="">Selecciona un tutor</option>
                      {tutores.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.apellido} — Cód. {t.codigo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Concepto *</label>
                    <select name="concepto" value={form.concepto || ""} onChange={c} style={s.input} required>
                      <option value="">Selecciona concepto</option>
                      {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Monto a cobrar (RD$) *</label>
                    <input type="number" name="monto" value={form.monto || ""} onChange={c}
                      onBlur={calcularCambio} style={s.input} required min="1" />
                  </div>
                  <div>
                    <label style={s.label}>Monto recibido (RD$) *</label>
                    <input type="number" name="montoPagado" value={form.montoPagado || ""} onChange={c}
                      onBlur={calcularCambio} style={s.input} required min="1" />
                  </div>
                  {cambioMostrar !== null && (
                    <div style={s.cambioBox}>
                      <p style={s.cambioLabel}>Cambio a entregar:</p>
                      <p style={s.cambioValor}>RD$ {Number(cambioMostrar).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {error && <p style={s.errorMsg}>{error}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button type="submit" disabled={cargando}
                    style={{ ...s.btnGuardar, opacity: cargando ? 0.7 : 1 }}>
                    {cargando ? "Registrando..." : "Registrar pago"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── ESTADO DE CUENTA ── */}
        {tab === "estado" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Estado de Cuenta del Tutor</h2>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setTutorSel(null); }}
              placeholder="Buscar tutor por nombre, cédula o código..."
              style={{ ...s.input, marginBottom: "16px" }}
            />
            {busqueda && (
              <div style={s.sugerencias}>
                {tutoresFiltrados.slice(0, 5).map(t => (
                  <div key={t.id} style={s.sugerencia}
                    onClick={() => { setTutorSel(t); setBusqueda(`${t.nombre} ${t.apellido}`); }}>
                    <strong>{t.nombre} {t.apellido}</strong>
                    <span style={{ color: "#888", fontSize: "12px" }}> — Cód. {t.codigo} — {t.cedula}</span>
                  </div>
                ))}
              </div>
            )}

            {tutorSel && (
              <>
                <div style={s.tutorCard}>
                  <p><strong>Tutor:</strong> {tutorSel.nombre} {tutorSel.apellido}</p>
                  <p><strong>Código:</strong> {tutorSel.codigo}</p>
                  <p><strong>Cédula:</strong> {tutorSel.cedula}</p>
                </div>

                {pagosTutor.length === 0 ? (
                  <div style={s.vacio}>Este tutor no tiene pagos registrados.</div>
                ) : (
                  <div style={s.tablaWrap}>
                    <table style={s.tabla}>
                      <thead>
                        <tr style={s.thead}>
                          <th style={s.th}>Concepto</th>
                          <th style={s.th}>Monto</th>
                          <th style={s.th}>Pagado</th>
                          <th style={s.th}>Cambio</th>
                          <th style={s.th}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagosTutor.map((p, i) => (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                            <td style={s.td}>{p.concepto}</td>
                            <td style={s.td}>RD$ {Number(p.monto).toLocaleString()}</td>
                            <td style={s.td}>RD$ {Number(p.montoPagado).toLocaleString()}</td>
                            <td style={s.td}>RD$ {Number(p.cambio).toLocaleString()}</td>
                            <td style={s.td}>{new Date(p.creadoEn).toLocaleDateString("es-DO")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CUADRE DE CAJA ── */}
        {tab === "cuadre" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Cuadre de Caja</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <label style={s.label}>Fecha:</label>
              <input type="date" value={fechaCuadre}
                onChange={e => setFechaCuadre(e.target.value)}
                style={{ ...s.input, width: "200px" }} />
            </div>

            <div style={s.resumenGrid}>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total transacciones</p>
                <p style={s.resumenValor}>{pagos.length}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total recaudado</p>
                <p style={s.resumenValor}>RD$ {totalCuadre.toLocaleString()}</p>
              </div>
            </div>

            {pagos.length === 0 ? (
              <div style={s.vacio}>No hay pagos registrados en esta fecha.</div>
            ) : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Tutor</th>
                      <th style={s.th}>Concepto</th>
                      <th style={s.th}>Monto</th>
                      <th style={s.th}>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}>{p.tutor.nombre} {p.tutor.apellido}</td>
                        <td style={s.td}>{p.concepto}</td>
                        <td style={s.td}>RD$ {Number(p.monto).toLocaleString()}</td>
                        <td style={s.td}>{new Date(p.creadoEn).toLocaleTimeString("es-DO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:      { color: "#1F5C99", fontWeight: "bold" },
  main:        { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:         { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:     { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:    { fontWeight: "bold", fontSize: "16px" },
  navUser:     { fontSize: "14px" },
  contenido:   { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  header:      { marginBottom: "24px" },
  titulo:      { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:   { fontSize: "13px", color: "#666", margin: 0 },
  tabs:        { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:         { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:   { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  card:        { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  cardTitulo:  { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  grid:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  label:       { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:       { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  cambioBox:   { gridColumn: "1 / -1", background: "#EBF3FB", border: "2px solid #1F5C99", borderRadius: "10px", padding: "16px", textAlign: "center" as any },
  cambioLabel: { fontSize: "13px", color: "#555", margin: "0 0 4px" },
  cambioValor: { fontSize: "28px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  exitoBox:    { textAlign: "center" as any, padding: "24px", display: "flex", flexDirection: "column" as any, alignItems: "center", gap: "12px" },
  sugerencias: { background: "#fff", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "16px", overflow: "hidden" },
  sugerencia:  { padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: "13px" },
  tutorCard:   { background: "#f0f4f8", borderRadius: "8px", padding: "14px", marginBottom: "16px", fontSize: "13px", display: "flex", gap: "20px", flexWrap: "wrap" as any },
  resumenGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" },
  resumenCard: { background: "#f0f4f8", borderRadius: "10px", padding: "20px", borderTop: "3px solid #1F5C99" },
  resumenLabel:{ fontSize: "12px", color: "#666", margin: "0 0 8px" },
  resumenValor:{ fontSize: "24px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  errorMsg:    { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginTop: "12px" },
  btnGuardar:  { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  vacio:       { textAlign: "center", padding: "40px", color: "#888" },
  tablaWrap:   { overflowX: "auto" as any, borderRadius: "10px", overflow: "hidden" },
  tabla:       { width: "100%", borderCollapse: "collapse" as any },
  thead:       { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:          { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:          { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
};
