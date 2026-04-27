"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const ROLES_GESTION  = ["ADMINISTRADOR", "CAJERO"];
const ROLES_VER      = ["ADMINISTRADOR", "CAJERO", "SECRETARIA_DOCENTE", "DIRECCION_ACADEMICA"];

type Uniforme = {
  id: number; nombre: string; talla: string; precio: number;
  stock: number; stockMinimo: number; descripcion: string;
};

type VentaUniforme = {
  id: number; ventaNo: string; fecha: string; cantidad: number;
  precioUnitario: number; total: number; cancelado: boolean;
  uniforme: { nombre: string; talla: string };
  estudiante: { nombre: string; apellido: string; codigo: string };
};

export default function InventarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uniformes, setUniformes]   = useState<Uniforme[]>([]);
  const [ventas, setVentas]         = useState<VentaUniforme[]>([]);
  const [tab, setTab]               = useState<"inventario"|"ventas">("inventario");
  const [busqueda, setBusqueda]     = useState("");
  const [modal, setModal]           = useState(false);
  const [modalVenta, setModalVenta] = useState(false);
  const [editando, setEditando]     = useState<Uniforme | null>(null);
  const [form, setForm]             = useState<any>({});
  const [formVenta, setFormVenta]   = useState<any>({});
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [error, setError]           = useState("");
  const [exito, setExito]           = useState("");
  const [cargando, setCargando]     = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    cargarDatos();
  }, [status]);

  const cargarDatos = async () => {
    setCargando(true);
    const [resU, resV, resE] = await Promise.all([
      fetch("/api/inventario").then(r => r.json()),
      fetch("/api/inventario/ventas").then(r => r.json()),
      fetch("/api/usuarios?rol=ESTUDIANTE").then(r => r.json()),
    ]);
    setUniformes(resU.uniformes || []);
    setVentas(resV.ventas || []);
    setEstudiantes(resE.estudiantes || resE.usuarios || []);
    setCargando(false);
  };

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_VER.includes(rol)) return (
    <div style={s.sinAcceso}>🚫 Sin permiso. <a href="/dashboard" style={s.enlace}>Volver</a></div>
  );

  const puedeGestionar = ROLES_GESTION.includes(rol);
  const c  = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  const cv = (e: any) => setFormVenta({ ...formVenta, [e.target.name]: e.target.value });

  const filtrados = uniformes.filter(u =>
    `${u.nombre} ${u.talla}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ stockMinimo: 1 });
    setModal(true);
    setError("");
  };

  const abrirEditar = (u: Uniforme) => {
    setEditando(u);
    setForm({ nombre: u.nombre, talla: u.talla, precio: u.precio, stock: u.stock, stockMinimo: u.stockMinimo, descripcion: u.descripcion || "" });
    setModal(true);
    setError("");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const method = editando ? "PUT" : "POST";
    const body   = editando ? { ...form, id: editando.id } : form;
    const res    = await fetch("/api/inventario", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data   = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModal(false);
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const guardarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res  = await fetch("/api/inventario/ventas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formVenta) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setExito(data.mensaje);
    setModalVenta(false);
    setFormVenta({});
    cargarDatos();
    setTimeout(() => setExito(""), 3000);
  };

  const fmt = (n: number) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
  const totalVentas = ventas.filter(v => !v.cancelado).reduce((s, v) => s + v.total, 0);

  return (
    <main style={s.main}>
      <NavBar titulo="Inventario de Uniformes" icono="👕" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Inventario de Uniformes</h1>
            <p style={s.subtitulo}>{uniformes.length} artículos · {uniformes.filter(u => u.stock <= u.stockMinimo).length} con stock bajo</p>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            {puedeGestionar && (
              <>
                <button onClick={() => { setFormVenta({}); setModalVenta(true); setError(""); }} style={s.btnVenta}>🛒 Registrar venta</button>
                <button onClick={abrirNuevo} style={s.btnNuevo}>+ Nuevo artículo</button>
              </>
            )}
          </div>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error  && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.resumenGrid}>
          <div style={s.resCard}>
            <span style={s.resValor}>{uniformes.length}</span>
            <span style={s.resLabel}>Artículos</span>
          </div>
          <div style={s.resCard}>
            <span style={s.resValor}>{uniformes.reduce((s, u) => s + u.stock, 0)}</span>
            <span style={s.resLabel}>Unidades en stock</span>
          </div>
          <div style={{...s.resCard, borderColor:"#fed7d7"}}>
            <span style={{...s.resValor, color:"#c53030"}}>{uniformes.filter(u => u.stock <= u.stockMinimo).length}</span>
            <span style={s.resLabel}>Stock bajo</span>
          </div>
          <div style={{...s.resCard, borderColor:"#9ae6b4"}}>
            <span style={{...s.resValor, color:"#276749"}}>{fmt(totalVentas)}</span>
            <span style={s.resLabel}>Total vendido</span>
          </div>
        </div>

        <div style={s.tabs}>
          <button onClick={() => setTab("inventario")} style={tab==="inventario" ? s.tabActivo : s.tab}>📦 Inventario</button>
          <button onClick={() => setTab("ventas")} style={tab==="ventas" ? s.tabActivo : s.tab}>🛒 Ventas</button>
        </div>

        {tab === "inventario" && (
          <>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o talla..." style={s.inputBusqueda} />
            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={s.th}>Artículo</th>
                    <th style={s.th}>Talla</th>
                    <th style={s.th}>Precio</th>
                    <th style={s.th}>Stock</th>
                    <th style={s.th}>Stock mínimo</th>
                    <th style={s.th}>Estado</th>
                    {puedeGestionar && <th style={s.th}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={s.td}>
                        <strong>{u.nombre}</strong>
                        {u.descripcion && <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#666" }}>{u.descripcion}</p>}
                      </td>
                      <td style={s.tdNum}>{u.talla}</td>
                      <td style={s.tdNum}>{fmt(u.precio)}</td>
                      <td style={s.tdNum}>
                        <strong style={{ color: u.stock <= u.stockMinimo ? "#c53030" : "#276749" }}>{u.stock}</strong>
                      </td>
                      <td style={s.tdNum}>{u.stockMinimo}</td>
                      <td style={s.td}>
                        <span style={{...s.badge, ...(u.stock <= u.stockMinimo
                          ? {background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7"}
                          : {background:"#f0fff4", color:"#276749", border:"1px solid #9ae6b4"})}}>
                          {u.stock <= u.stockMinimo ? "⚠️ Stock bajo" : "✓ Disponible"}
                        </span>
                      </td>
                      {puedeGestionar && (
                        <td style={s.td}>
                          <button onClick={() => abrirEditar(u)} style={s.btnEditar}>✏️ Editar</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "ventas" && (
          <div style={s.tablaWrap}>
            <table style={s.tabla}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>No. Venta</th>
                  <th style={s.th}>Fecha</th>
                  <th style={s.th}>Artículo</th>
                  <th style={s.th}>Estudiante</th>
                  <th style={s.th}>Cant.</th>
                  <th style={s.th}>Total</th>
                  <th style={s.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}><span style={s.codigo}>{v.ventaNo}</span></td>
                    <td style={s.td}>{new Date(v.fecha).toLocaleDateString("es-DO")}</td>
                    <td style={s.td}>{v.uniforme?.nombre} — {v.uniforme?.talla}</td>
                    <td style={s.td}>{v.estudiante?.nombre} {v.estudiante?.apellido}</td>
                    <td style={s.tdNum}>{v.cantidad}</td>
                    <td style={s.tdNum}>{fmt(v.total)}</td>
                    <td style={s.td}>
                      <span style={{...s.badge, ...(v.cancelado
                        ? {background:"#fff5f5", color:"#c53030", border:"1px solid #fed7d7"}
                        : {background:"#f0fff4", color:"#276749", border:"1px solid #9ae6b4"})}}>
                        {v.cancelado ? "Cancelado" : "Activo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr><td colSpan={7} style={{...s.td, textAlign:"center", color:"#888"}}>No hay ventas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>{editando ? "Editar artículo" : "Nuevo artículo"}</h2>
            <form onSubmit={guardar}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"16px" }}>
                <div>
                  <label style={s.label}>Nombre *</label>
                  <input name="nombre" value={form.nombre||""} onChange={c} style={s.input} required placeholder="Ej: Camisa blanca manga larga" />
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Talla *</label>
                    <input name="talla" value={form.talla||""} onChange={c} style={s.input} required placeholder="Ej: S, M, L, 10, 12" />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Precio (RD$) *</label>
                    <input name="precio" type="number" min="0" step="0.01" value={form.precio||""} onChange={c} style={s.input} required />
                  </div>
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Stock *</label>
                    <input name="stock" type="number" min="0" value={form.stock||""} onChange={c} style={s.input} required />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Stock mínimo</label>
                    <input name="stockMinimo" type="number" min="0" value={form.stockMinimo||1} onChange={c} style={s.input} />
                  </div>
                </div>
                <div>
                  <label style={s.label}>Descripción</label>
                  <input name="descripcion" value={form.descripcion||""} onChange={c} style={s.input} placeholder="Descripción opcional" />
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

      {modalVenta && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Registrar venta de uniforme</h2>
            <form onSubmit={guardarVenta}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"16px" }}>
                <div>
                  <label style={s.label}>Artículo *</label>
                  <select name="uniformeId" value={formVenta.uniformeId||""} onChange={cv} style={s.input} required>
                    <option value="">Selecciona artículo</option>
                    {uniformes.filter(u => u.stock > 0).map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} — Talla {u.talla} (Stock: {u.stock}) — {fmt(u.precio)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Estudiante *</label>
                  <select name="estudianteId" value={formVenta.estudianteId||""} onChange={cv} style={s.input} required>
                    <option value="">Selecciona estudiante</option>
                    {estudiantes.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellido} — {e.codigo}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Cantidad *</label>
                    <input name="cantidad" type="number" min="1" value={formVenta.cantidad||""} onChange={cv} style={s.input} required />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={s.label}>Método de pago *</label>
                    <select name="metodoPago" value={formVenta.metodoPago||""} onChange={cv} style={s.input} required>
                      <option value="">Selecciona</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Observaciones</label>
                  <input name="observaciones" value={formVenta.observaciones||""} onChange={cv} style={s.input} placeholder="Opcional" />
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalBotones}>
                <button type="button" onClick={() => setModalVenta(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>Registrar venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading:      { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  sinAcceso:    { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" },
  enlace:       { color:"#2C1810" },
  main:         { minHeight:"100vh", background:"#f0f4f8", fontFamily:"Arial, sans-serif" },
  contenido:    { maxWidth:"1200px", margin:"0 auto", padding:"28px 20px" },
  header:       { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", flexWrap:"wrap", gap:"12px" },
  titulo:       { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:    { fontSize:"13px", color:"#666", margin:0 },
  btnNuevo:     { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  btnVenta:     { background:"linear-gradient(135deg,#276749,#2D9D5E)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
  exitoMsg:     { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:     { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  resumenGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"12px", marginBottom:"20px" },
  resCard:      { background:"#fff", borderRadius:"10px", padding:"16px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderLeft:"4px solid #ddd", display:"flex", flexDirection:"column", gap:"4px" },
  resValor:     { fontSize:"20px", fontWeight:"bold", color:"#2C1810" },
  resLabel:     { fontSize:"12px", color:"#666" },
  tabs:         { display:"flex", gap:"8px", marginBottom:"16px" },
  tab:          { background:"#fff", color:"#666", border:"1px solid #ddd", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  tabActivo:    { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer", fontWeight:"bold" },
  inputBusqueda:{ width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px", marginBottom:"16px", boxSizing:"border-box" },
  tablaWrap:    { overflowX:"auto", background:"#fff", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  tabla:        { width:"100%", borderCollapse:"collapse" },
  theadRow:     { background:"linear-gradient(135deg,#2C1810,#4a2518)" },
  th:           { padding:"12px 10px", color:"#fff", fontSize:"12px", fontWeight:"bold", textAlign:"left" },
  td:           { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle" },
  tdNum:        { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", textAlign:"center", verticalAlign:"middle" },
  badge:        { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold" },
  codigo:       { fontSize:"11px", color:"#999", background:"#f0f0f0", borderRadius:"4px", padding:"2px 6px" },
  btnEditar:    { background:"#EBF3FB", color:"#2C1810", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalCard:    { background:"#fff", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"500px", maxHeight:"90vh", overflowY:"auto" },
  modalTitulo:  { fontSize:"18px", fontWeight:"bold", color:"#2C1810", margin:"0 0 20px" },
  label:        { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  input:        { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  modalBotones: { display:"flex", gap:"10px", justifyContent:"flex-end" },
  btnCancelar:  { background:"#f0f0f0", color:"#333", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  btnGuardar:   { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
};
