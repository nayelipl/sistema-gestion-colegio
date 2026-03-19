"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Pago = {
  id: number; concepto: string; monto: number; tipo: string; creadoEn: string;
};

const CONCEPTOS = ["Colegiatura", "Transporte", "Uniforme", "Matrícula", "Actividad escolar", "Seguro escolar"];

export default function PagosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pagos, setPagos]     = useState<Pago[]>([]);
  const [form, setForm]       = useState<any>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState("");
  const [exito, setExito]     = useState("");
  const [tab, setTab]         = useState<"estado" | "pagar">("estado");

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tutor/pagos")
      .then(r => r.json())
      .then(d => { setPagos(d.pagos || []); setCargando(false); });
  }, [status]);

  if (status === "loading") return <div style={s.loading}>Cargando...</div>;
  if (rol !== "TUTOR" && rol !== "ADMINISTRADOR") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  const c = (e: any) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const realizarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito("");
    const res  = await fetch("/api/tutor/pagos", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setForm({});
    setTab("estado");
    fetch("/api/tutor/pagos").then(r => r.json()).then(d => setPagos(d.pagos || []));
    setTimeout(() => setExito(""), 4000);
  };

  const total = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <main style={s.main}>
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>💳 Estado de Cuenta y Pagos</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
        <h1 style={s.titulo}>Estado de Cuenta</h1>
        <p style={s.subtitulo}>Historial de pagos y pagos en línea</p>

        <div style={s.tabs}>
          <button onClick={() => setTab("estado")}
            style={{ ...s.tab, ...(tab === "estado" ? s.tabActivo : {}) }}>
            📄 Historial de Pagos
          </button>
          <button onClick={() => setTab("pagar")}
            style={{ ...s.tab, ...(tab === "pagar" ? s.tabActivo : {}) }}>
            💳 Realizar Pago
          </button>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}

        {tab === "estado" && (
          <>
            <div style={s.resumenGrid}>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total pagos realizados</p>
                <p style={s.resumenValor}>{pagos.length}</p>
              </div>
              <div style={s.resumenCard}>
                <p style={s.resumenLabel}>Total pagado</p>
                <p style={s.resumenValor}>RD$ {total.toLocaleString()}</p>
              </div>
            </div>

            {cargando ? <div style={s.vacio}>Cargando...</div> :
              pagos.length === 0 ? <div style={s.vacio}>No tienes pagos registrados.</div> : (
              <div style={s.tablaWrap}>
                <table style={s.tabla}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Concepto</th>
                    <th style={s.th}>Monto</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Fecha</th>
                  </tr></thead>
                  <tbody>
                    {pagos.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                        <td style={s.td}>{p.concepto}</td>
                        <td style={s.td}>RD$ {Number(p.monto).toLocaleString()}</td>
                        <td style={s.td}>
                          <span style={p.tipo === "ONLINE" ? s.badgeOnline : s.badgePresencial}>
                            {p.tipo === "ONLINE" ? "En línea" : "Presencial"}
                          </span>
                        </td>
                        <td style={s.td}>{new Date(p.creadoEn).toLocaleDateString("es-DO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "pagar" && (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Realizar Pago en Línea</h2>
            <form onSubmit={realizarPago}>
              <div style={s.formGrid}>
                <div>
                  <label style={s.label}>Concepto *</label>
                  <select name="concepto" value={form.concepto || ""} onChange={c} style={s.input} required>
                    <option value="">Selecciona concepto</option>
                    {CONCEPTOS.map(con => <option key={con} value={con}>{con}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Monto (RD$) *</label>
                  <input type="number" name="monto" value={form.monto || ""} onChange={c}
                    style={s.input} required min="1" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Número de tarjeta *</label>
                  <input name="tarjeta" value={form.tarjeta || ""} onChange={c}
                    style={s.input} required placeholder="**** **** **** ****" maxLength={19} />
                </div>
                <div>
                  <label style={s.label}>Vencimiento *</label>
                  <input name="vencimiento" value={form.vencimiento || ""} onChange={c}
                    style={s.input} required placeholder="MM/AA" maxLength={5} />
                </div>
                <div>
                  <label style={s.label}>CVV *</label>
                  <input name="cvv" value={form.cvv || ""} onChange={c}
                    style={s.input} required placeholder="***" maxLength={4} type="password" />
                </div>
              </div>
              <div style={s.infoBox}>
                🔒 Tus datos de pago están protegidos con encriptación SSL
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="submit" style={s.btnGuardar}>💳 Confirmar pago</button>
              </div>
            </form>
          </div>
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
  contenido:     { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  titulo:        { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 4px" },
  subtitulo:     { fontSize: "13px", color: "#666", marginBottom: "24px" },
  tabs:          { display: "flex", gap: "8px", marginBottom: "20px" },
  tab:           { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo:     { borderColor: "#1F5C99", color: "#1F5C99", background: "#EBF3FB" },
  exitoMsg:      { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px" },
  resumenGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" },
  resumenCard:   { background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderTop: "3px solid #1F5C99" },
  resumenLabel:  { fontSize: "12px", color: "#666", margin: "0 0 8px" },
  resumenValor:  { fontSize: "22px", fontWeight: "bold", color: "#1F5C99", margin: 0 },
  card:          { background: "#fff", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  cardTitulo:    { fontSize: "16px", fontWeight: "bold", color: "#1F5C99", margin: "0 0 20px" },
  formGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
  label:         { fontSize: "12px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" },
  input:         { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as any },
  infoBox:       { background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#276749", marginBottom: "8px" },
  errorMsg:      { color: "#e53e3e", fontSize: "13px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" },
  btnGuardar:    { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  vacio:         { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
  tablaWrap:     { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla:         { width: "100%", borderCollapse: "collapse" as any },
  thead:         { background: "linear-gradient(135deg,#1F5C99,#5D2F7D)" },
  th:            { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" as any },
  td:            { padding: "10px 14px", fontSize: "13px", borderBottom: "1px solid #f0f0f0" },
  badgeOnline:   { background: "#F3E8FF", color: "#5D2F7D", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
  badgePresencial:{ background: "#EBF3FB", color: "#1F5C99", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: "bold" },
};
