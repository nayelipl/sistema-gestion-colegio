"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "cuentas" | "asentar" | "corte" | "inventario";
type Tutor = {
  id: number; codigo: string; nombre: string; apellido: string; cedula: string; email: string; activo: boolean;
};
type Pago = {
  id: number; concepto: string; monto: number; montoPagado: number;
  cambio: number; tipo: string; creadoEn: string;
  tutor: { nombre: string; apellido: string; codigo: string };
};
type Uniforme = {
  id: number; tipo: string; talla: string; precio: number; cantidad: number; vendidos: number;
};

const CONCEPTOS = ["Colegiatura", "Transporte", "Uniforme", "Matrícula", "Actividad escolar", "Seguro escolar", "Otro"];

export default function FinancieroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("cuentas");
  const [tutores, setTutores]       = useState<Tutor[]>([]);
  const [uniformes, setUniformes]   = useState<Uniforme[]>([]);
  const [pagos, setPagos]           = useState<Pago[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [busqueda, setBusqueda]     = useState("");
  const [form, setForm]             = useState<any>({});
  const [error, setError]           = useState("");
  const [exito, setExito]           = useState("");
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split("T")[0]);
  const [tipoCorte, setTipoCorte]   = useState<"PRESENCIAL" | "ONLINE" | "TODOS">("TODOS");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => {
      setTutores(d.tutores || []);
      setCargando(false);
    });
    fetch("/api/inventario").then(r => r.json()).then(d => setUniformes(d.uniformes || []));
  }, []);

  useEffect(() => {
    if (tab === "corte") cargarCorte();
  }, [tab, fechaCorte, tipoCorte]);

  const cargarCorte = async () => {
    const params = new URLSearchParams({ fecha: fechaCorte });
    if (tipoCorte !== "TODOS") params.append("tipo", tipoCorte);
    const res  = await fetch(`/api/pagos?${params}`);
    const data = await res.json();
    setPagos(data.pagos || []);
  };

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "CONTADOR" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const asentarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/pagos", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...form, tipo: "PRESENCIAL" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setForm({});
    setTimeout(() => setExito(""), 3000);
  };

  const tutoresFiltrados = tutores.filter(t =>
    `${t.nombre} ${t.apellido} ${t.cedula} ${t.codigo}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalCorte      = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
  const presenciales    = pagos.filter(p => p.tipo === "PRESENCIAL");
  const online          = pagos.filter(p => p.tipo === "ONLINE");
  const totalPresencial = presenciales.reduce((sum, p) => sum + Number(p.monto), 0);
  const totalOnline     = online.reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>💰 Módulo Financiero</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <div style={s.header}>
          <h1 style={s.titulo}>Módulo Financiero</h1>
          <p style={s.subtitulo}>Gestión financiera del colegio</p>
        </div>

        <div style={s.tabs}>
          {([
            { key: "cuentas",   label: "💳 Cuentas por Cobrar" },
            { key: "asentar",   label: "📥 Asentar Pago" },
            { key: "corte",     label: "🧾 Corte de Pagos" },
            { key: "inventario",label: "👕 Inventario Uniformes" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(""); setExito(""); }}
              style={{ ...s.tab, ...(tab === t.key ? s.tabActivo : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CUENTAS POR COBRAR ── */}
        {tab === "cuentas" && (
          <>
            <div style={s.resumenGrid}>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total tutores</p>
                <p style={s.resumenValor}>{tutores.length}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Tutores activos</p>
                <p style={s.resumenValor}>{tutores.filter(t => t.activo).length}</p>
              </div>
            </div>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar tutor por nombre, cédula o código..."
              style={s.inputBusqueda} />
            {cargando ? <div style={s.vacio}>Cargando...</div> :
              tutoresFiltrados.length === 0 ? <div style={s.vacio}>No hay tutores registrados.</div> : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Cédula</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Estado</th>
                  </tr></thead>
                  <tbody>
                    {tutoresFiltrados.map((t, i) => (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}><code style={s.codigo}>{t.codigo}</code></td>
                        <td style={s.td}>{t.nombre} {t.apellido}</td>
                        <td style={s.td}>{t.cedula}</td>
                        <td style={s.td}>{t.email}</td>
                        <td style={s.td}><span style={t.activo ? s.activo : s.inactivo}>{t.activo ? "Activo" : "Inactivo"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ASENTAR PAGO ── */}
        {tab === "asentar" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Asentar Pago</h2>
            {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
            <form onSubmit={asentarPago}>
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
                  <label style={s.label}>Monto (RD$) *</label>
                  <input type="number" name="monto" value={form.monto || ""} onChange={c} style={s.input} required min="1" />
                </div>
                <div>
                  <label style={s.label}>Monto recibido (RD$) *</label>
                  <input type="number" name="montoPagado" value={form.montoPagado || ""} onChange={c} style={s.input} required min="1" />
                </div>
                <div>
                  <label style={s.label}>Tipo de pago</label>
                  <select name="tipo" value={form.tipo || "PRESENCIAL"} onChange={c} style={s.input}>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="ONLINE">En línea</option>
                  </select>
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="submit" style={s.btnGuardar}>Asentar pago</button>
              </div>
            </form>
          </div>
        )}

        {/* ── CORTE DE PAGOS ── */}
        {tab === "corte" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Corte de Pagos</h2>
            <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div>
                <label style={s.label}>Fecha</label>
                <input type="date" value={fechaCorte}
                  onChange={e => setFechaCorte(e.target.value)} style={{ ...s.input, width: "180px" }} />
              </div>
              <div>
                <label style={s.label}>Tipo</label>
                <select value={tipoCorte} onChange={e => setTipoCorte(e.target.value as any)} style={{ ...s.input, width: "180px" }}>
                  <option value="TODOS">Todos</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="ONLINE">En línea</option>
                </select>
              </div>
            </div>

            <div style={s.resumenGrid}>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total presencial</p>
                <p style={s.resumenValor}>RD$ {totalPresencial.toLocaleString()}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total en línea</p>
                <p style={s.resumenValor}>RD$ {totalOnline.toLocaleString()}</p>
              </div>
              <div style={{ ...s.resumenCard, borderColor: "#5D2F7D" }}>
                <p style={s.resumenLabel}>Total general</p>
                <p style={{ ...s.resumenValor, color: "#5D2F7D" }}>RD$ {totalCorte.toLocaleString()}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Transacciones</p>
                <p style={s.resumenValor}>{pagos.length}</p>
              </div>
            </div>

            {pagos.length === 0 ? <div style={s.vacio}>No hay pagos en esta fecha.</div> : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Tutor</th>
                    <th style={s.th}>Concepto</th>
                    <th style={s.th}>Monto</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Hora</th>
                  </tr></thead>
                  <tbody>
                    {pagos.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}>{p.tutor.nombre} {p.tutor.apellido}</td>
                        <td style={s.td}>{p.concepto}</td>
                        <td style={s.td}>RD$ {Number(p.monto).toLocaleString()}</td>
                        <td style={s.td}>
                          <span style={p.tipo === "PRESENCIAL" ? s.badgePresencial : s.badgeOnline}>
                            {p.tipo === "PRESENCIAL" ? "Presencial" : "En línea"}
                          </span>
                        </td>
                        <td style={s.td}>{new Date(p.creadoEn).toLocaleTimeString("es-DO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── INVENTARIO ── */}
        {tab === "inventario" && (
          uniformes.length === 0 ? <div style={s.vacio}>No hay uniformes registrados.</div> : (
            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Tipo</th>
                  <th style={s.th}>Talla</th>
                  <th style={s.th}>Precio</th>
                  <th style={s.th}>Disponibles</th>
                  <th style={s.th}>Vendidos</th>
                </tr></thead>
                <tbody>
                  {uniformes.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={s.td}>{u.tipo}</td>
                      <td style={s.td}>{u.talla}</td>
                      <td style={s.td}>RD$ {Number(u.precio).toLocaleString()}</td>
                      <td style={s.td}><span style={u.cantidad > 0 ? s.activo : s.inactivo}>{u.cantidad}</span></td>
                      <td style={s.td}>{u.vendidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:       { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  sinAcceso:     { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace:        { color: "#1F5C99", fontWeight: "bold" },
  main:          { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav:           { background: "linear-gradient(135deg, #1F5C99, #5D2F7D)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack:       { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle:      { fontWeight: "bold", fontSize: "16px" },
  navUser:       { fontSize: "14px" },
  contenido:     { maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" },
  header:        { marginBottom: "24px" },
  titulo:        { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:     { fontSize: "13px", color: "#666", margin: 0 },
  tabs:          { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as any },
  tab:           { padding: "10px 16px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:     { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  card:          { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  cardTitulo:    { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  grid:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  label:         { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:         { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  inputBusqueda: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" as any },
  resumenGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" },
  resumenCard:   { background: "#f0f4f8", borderRadius: "10px", padding: "20px", borderTop: "3px solid #1F5C99" },
  resumenLabel:  { fontSize: "12px", color: "#666", margin: "0 0 8px" },
  resumenValor:  { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  exitoMsg:      { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg:      { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginTop: "12px" },
  btnGuardar:    { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  vacio:         { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:     { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:         { width: "100%", borderCollapse: "collapse" as any },
  thead:         { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:            { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:            { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  activo:        { background: "#c6f6d5", color: "#276749", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  inactivo:      { background: "#fed7d7", color: "#c53030", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  codigo:        { background: "#f0f4f8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" },
  badgePresencial:{ background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  badgeOnline:   { background: "#F3E8FF", color: "#5D2F7D", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
};
