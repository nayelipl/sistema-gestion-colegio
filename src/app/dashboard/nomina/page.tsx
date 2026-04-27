"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECTOR_ADMINISTRATIVO"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Empleado = {
  id: number; nombre: string; apellido: string; email: string;
  cargo: string; departamento: string; salario: number; activo: boolean;
};

type LineaNomina = {
  empleadoId: number;
  salarioBruto: number;
  descuentoSFS: number;
  descuentoAFP: number;
  otrosDescuentos: number;
  salarioNeto: number;
  pagado: boolean;
};

export default function NominaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [empleados, setEmpleados]   = useState<Empleado[]>([]);
  const [nomina, setNomina]         = useState<Record<number, LineaNomina>>({});
  const [mes, setMes]               = useState(new Date().getMonth());
  const [anio, setAnio]             = useState(new Date().getFullYear());
  const [busqueda, setBusqueda]     = useState("");
  const [modal, setModal]           = useState(false);
  const [empleadoSel, setEmpleadoSel] = useState<Empleado | null>(null);
  const [formExtra, setFormExtra]   = useState({ otrosDescuentos: "0", nota: "" });
  const [error, setError]           = useState("");
  const [exito, setExito]           = useState("");
  const [cargando, setCargando]     = useState(true);

  const rol = (session?.user as any)?.role ?? "";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/empleados").then(r => r.json()).then(d => {
      setEmpleados((d.empleados || []).filter((e: Empleado) => e.activo));
      setCargando(false);
    });
  }, [status]);

  useEffect(() => {
    // Calcular nómina automáticamente al cambiar empleados/mes/año
    const nueva: Record<number, LineaNomina> = {};
    empleados.forEach(e => {
      const bruto          = Number(e.salario) || 0;
      const descuentoSFS   = bruto * 0.0304;  // 3.04% SFS empleado
      const descuentoAFP   = bruto * 0.0287;  // 2.87% AFP empleado
      const otrosDescuentos = 0;
      const neto           = bruto - descuentoSFS - descuentoAFP - otrosDescuentos;
      nueva[e.id] = { empleadoId: e.id, salarioBruto: bruto, descuentoSFS, descuentoAFP, otrosDescuentos, salarioNeto: neto, pagado: false };
    });
    setNomina(nueva);
  }, [empleados, mes, anio]);

  if (status === "loading" || cargando) return <div style={s.loading}>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return (
    <div style={s.sinAcceso}>🚫 Sin permiso. <a href="/dashboard" style={s.enlace}>Volver</a></div>
  );

  const filtrados = empleados.filter(e =>
    `${e.nombre} ${e.apellido} ${e.cargo} ${e.departamento}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalBruto   = filtrados.reduce((s, e) => s + (nomina[e.id]?.salarioBruto || 0), 0);
  const totalSFS     = filtrados.reduce((s, e) => s + (nomina[e.id]?.descuentoSFS || 0), 0);
  const totalAFP     = filtrados.reduce((s, e) => s + (nomina[e.id]?.descuentoAFP || 0), 0);
  const totalNeto    = filtrados.reduce((s, e) => s + (nomina[e.id]?.salarioNeto || 0), 0);
  const totalPagados = filtrados.filter(e => nomina[e.id]?.pagado).length;

  const fmt = (n: number) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const abrirDetalle = (emp: Empleado) => {
    setEmpleadoSel(emp);
    setFormExtra({ otrosDescuentos: String(nomina[emp.id]?.otrosDescuentos || 0), nota: "" });
    setModal(true);
    setError("");
  };

  const actualizarDescuento = (empId: number, otros: number) => {
    setNomina(prev => {
      const linea  = prev[empId];
      const neto   = linea.salarioBruto - linea.descuentoSFS - linea.descuentoAFP - otros;
      return { ...prev, [empId]: { ...linea, otrosDescuentos: otros, salarioNeto: neto } };
    });
  };

  const guardarDetalle = () => {
    if (!empleadoSel) return;
    actualizarDescuento(empleadoSel.id, parseFloat(formExtra.otrosDescuentos) || 0);
    setModal(false);
    setExito("Nómina actualizada.");
    setTimeout(() => setExito(""), 3000);
  };

  const marcarPagado = (empId: number) => {
    setNomina(prev => ({ ...prev, [empId]: { ...prev[empId], pagado: !prev[empId].pagado } }));
  };

  const marcarTodosPagados = () => {
    setNomina(prev => {
      const nuevo = { ...prev };
      filtrados.forEach(e => { nuevo[e.id] = { ...nuevo[e.id], pagado: true }; });
      return nuevo;
    });
    setExito("Todos marcados como pagados.");
    setTimeout(() => setExito(""), 3000);
  };

  return (
    <main style={s.main}>
      <NavBar titulo="Nómina" icono="💵" userName={session?.user?.name} />
      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Control de Nómina</h1>
            <p style={s.subtitulo}>Período: {MESES[mes]} {anio} · {empleados.length} empleados activos</p>
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={s.selectPeriodo}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={s.selectPeriodo}>
              {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={marcarTodosPagados} style={s.btnPagar}>✅ Marcar todos pagados</button>
          </div>
        </div>

        {exito && <div style={s.exitoMsg}>✅ {exito}</div>}
        {error  && <div style={s.errorMsg}>⚠️ {error}</div>}

        <div style={s.resumenGrid}>
          <div style={s.resCard}>
            <span style={s.resValor}>{empleados.length}</span>
            <span style={s.resLabel}>Empleados</span>
          </div>
          <div style={s.resCard}>
            <span style={s.resValor}>{fmt(totalBruto)}</span>
            <span style={s.resLabel}>Total bruto</span>
          </div>
          <div style={s.resCard}>
            <span style={s.resValor}>{fmt(totalSFS + totalAFP)}</span>
            <span style={s.resLabel}>Total descuentos</span>
          </div>
          <div style={{...s.resCard, borderColor:"#9ae6b4"}}>
            <span style={{...s.resValor, color:"#276749"}}>{fmt(totalNeto)}</span>
            <span style={s.resLabel}>Total neto a pagar</span>
          </div>
          <div style={s.resCard}>
            <span style={s.resValor}>{totalPagados}/{filtrados.length}</span>
            <span style={s.resLabel}>Pagados</span>
          </div>
        </div>

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar empleado, cargo o departamento..."
          style={s.inputBusqueda} />

        <div style={s.tablaWrap}>
          <table style={s.tabla}>
            <thead>
              <tr style={s.theadRow}>
                <th style={s.th}>Empleado</th>
                <th style={s.th}>Cargo</th>
                <th style={s.th}>Salario bruto</th>
                <th style={s.th}>SFS (3.04%)</th>
                <th style={s.th}>AFP (2.87%)</th>
                <th style={s.th}>Otros desc.</th>
                <th style={{...s.th, background:"#1a4a7a"}}>Neto a pagar</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((emp, i) => {
                const n = nomina[emp.id];
                return (
                  <tr key={emp.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={s.td}>
                      <strong>{emp.nombre} {emp.apellido}</strong>
                      <br/><span style={s.subtext}>{emp.email}</span>
                    </td>
                    <td style={s.td}>
                      {emp.cargo}<br/><span style={s.subtext}>{emp.departamento}</span>
                    </td>
                    <td style={s.tdNum}>{fmt(n?.salarioBruto || 0)}</td>
                    <td style={{...s.tdNum, color:"#c53030"}}>-{fmt(n?.descuentoSFS || 0)}</td>
                    <td style={{...s.tdNum, color:"#c53030"}}>-{fmt(n?.descuentoAFP || 0)}</td>
                    <td style={{...s.tdNum, color:"#c53030"}}>-{fmt(n?.otrosDescuentos || 0)}</td>
                    <td style={{...s.tdNum, fontWeight:"bold", color:"#276749", fontSize:"14px"}}>{fmt(n?.salarioNeto || 0)}</td>
                    <td style={s.td}>
                      <span style={{...s.badge, ...(n?.pagado ? {background:"#f0fff4",color:"#276749",border:"1px solid #9ae6b4"} : {background:"#FFFBEB",color:"#B7791F",border:"1px solid #fbd38d"})}}>
                        {n?.pagado ? "Pagado" : "Pendiente"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button onClick={() => abrirDetalle(emp)} style={s.btnEditar}>✏️ Ajustar</button>
                        <button onClick={() => marcarPagado(emp.id)} style={n?.pagado ? s.btnDespub : s.btnPub}>
                          {n?.pagado ? "↩️" : "✅"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:"#f0f4f8", fontWeight:"bold" }}>
                <td style={s.td} colSpan={2}>TOTALES</td>
                <td style={s.tdNum}>{fmt(totalBruto)}</td>
                <td style={{...s.tdNum, color:"#c53030"}}>-{fmt(totalSFS)}</td>
                <td style={{...s.tdNum, color:"#c53030"}}>-{fmt(totalAFP)}</td>
                <td style={{...s.tdNum, color:"#c53030"}}>-</td>
                <td style={{...s.tdNum, color:"#276749", fontSize:"15px"}}>{fmt(totalNeto)}</td>
                <td style={s.td} colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={s.notaLegal}>
          <strong>Nota:</strong> Los porcentajes aplicados son los establecidos por la ley dominicana: SFS empleado 3.04%, AFP empleado 2.87%.
          El empleador aporta adicionalmente SFS 7.09% y AFP 7.10% sobre el salario bruto.
        </div>
      </div>

      {modal && empleadoSel && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h2 style={s.modalTitulo}>Ajustar nómina — {empleadoSel.nombre} {empleadoSel.apellido}</h2>
            <div style={s.detalleGrid}>
              <div><span style={s.detalleLabel}>Salario bruto:</span> <strong>{fmt(nomina[empleadoSel.id]?.salarioBruto || 0)}</strong></div>
              <div><span style={s.detalleLabel}>SFS (3.04%):</span> <strong style={{color:"#c53030"}}>-{fmt(nomina[empleadoSel.id]?.descuentoSFS || 0)}</strong></div>
              <div><span style={s.detalleLabel}>AFP (2.87%):</span> <strong style={{color:"#c53030"}}>-{fmt(nomina[empleadoSel.id]?.descuentoAFP || 0)}</strong></div>
            </div>
            <div style={{ marginTop:"16px" }}>
              <label style={s.label}>Otros descuentos (RD$)</label>
              <input type="number" min="0" step="0.01" value={formExtra.otrosDescuentos}
                onChange={e => setFormExtra({...formExtra, otrosDescuentos: e.target.value})}
                style={s.input} placeholder="0.00" />
              <p style={{ fontSize:"12px", color:"#888", margin:"4px 0 0" }}>
                Préstamos, anticipos, sanciones u otros descuentos adicionales.
              </p>
            </div>
            <div style={{ marginTop:"14px" }}>
              <label style={s.label}>Nota interna</label>
              <input value={formExtra.nota} onChange={e => setFormExtra({...formExtra, nota: e.target.value})}
                style={s.input} placeholder="Ej: Descuento por préstamo personal" />
            </div>
            <div style={{...s.detalleGrid, marginTop:"16px", background:"#f0fff4", padding:"12px", borderRadius:"8px"}}>
              <div><span style={s.detalleLabel}>Neto estimado:</span>
                <strong style={{color:"#276749", fontSize:"16px"}}>
                  {fmt((nomina[empleadoSel.id]?.salarioBruto || 0)
                    - (nomina[empleadoSel.id]?.descuentoSFS || 0)
                    - (nomina[empleadoSel.id]?.descuentoAFP || 0)
                    - (parseFloat(formExtra.otrosDescuentos) || 0))}
                </strong>
              </div>
            </div>
            <div style={s.modalBotones}>
              <button onClick={() => setModal(false)} style={s.btnCancelar}>Cancelar</button>
              <button onClick={guardarDetalle} style={s.btnGuardar}>Aplicar</button>
            </div>
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
  contenido:    { maxWidth:"1300px", margin:"0 auto", padding:"28px 20px" },
  header:       { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", flexWrap:"wrap", gap:"12px" },
  titulo:       { fontSize:"22px", fontWeight:"bold", color:"#2C1810", margin:"0 0 4px" },
  subtitulo:    { fontSize:"13px", color:"#666", margin:0 },
  selectPeriodo:{ padding:"9px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"13px" },
  btnPagar:     { background:"linear-gradient(135deg,#276749,#2D9D5E)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 16px", fontSize:"13px", fontWeight:"bold", cursor:"pointer" },
  exitoMsg:     { background:"#f0fff4", border:"1px solid #9ae6b4", color:"#276749", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  errorMsg:     { background:"#fff5f5", border:"1px solid #fed7d7", color:"#c53030", borderRadius:"8px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px" },
  resumenGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"12px", marginBottom:"20px" },
  resCard:      { background:"#fff", borderRadius:"10px", padding:"16px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", borderLeft:"4px solid #ddd", display:"flex", flexDirection:"column", gap:"4px" },
  resValor:     { fontSize:"18px", fontWeight:"bold", color:"#2C1810" },
  resLabel:     { fontSize:"12px", color:"#666" },
  inputBusqueda:{ width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px", marginBottom:"16px", boxSizing:"border-box" },
  tablaWrap:    { overflowX:"auto", background:"#fff", borderRadius:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", marginBottom:"16px" },
  tabla:        { width:"100%", borderCollapse:"collapse" },
  theadRow:     { background:"linear-gradient(135deg,#2C1810,#4a2518)" },
  th:           { padding:"12px 10px", color:"#fff", fontSize:"11px", fontWeight:"bold", textAlign:"center", whiteSpace:"nowrap" },
  td:           { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle" },
  tdNum:        { padding:"10px 12px", fontSize:"13px", borderBottom:"1px solid #f0f0f0", textAlign:"right", verticalAlign:"middle" },
  subtext:      { fontSize:"11px", color:"#999" },
  badge:        { borderRadius:"12px", padding:"3px 10px", fontSize:"11px", fontWeight:"bold" },
  btnEditar:    { background:"#EBF3FB", color:"#2C1810", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"12px", cursor:"pointer" },
  btnPub:       { background:"#f0fff4", color:"#276749", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"12px", cursor:"pointer" },
  btnDespub:    { background:"#fff5f5", color:"#c53030", border:"none", borderRadius:"6px", padding:"5px 8px", fontSize:"12px", cursor:"pointer" },
  notaLegal:    { background:"#FFFBEB", border:"1px solid #fbd38d", borderRadius:"8px", padding:"12px 16px", fontSize:"12px", color:"#744210" },
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalCard:    { background:"#fff", borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"480px" },
  modalTitulo:  { fontSize:"17px", fontWeight:"bold", color:"#2C1810", margin:"0 0 16px" },
  detalleGrid:  { display:"flex", flexDirection:"column", gap:"8px", fontSize:"14px" },
  detalleLabel: { color:"#666", marginRight:"8px" },
  label:        { fontSize:"12px", fontWeight:"600", color:"#333", display:"block", marginBottom:"4px" },
  input:        { width:"100%", padding:"9px 12px", borderRadius:"7px", border:"1px solid #ddd", fontSize:"13px", boxSizing:"border-box" },
  modalBotones: { display:"flex", gap:"10px", justifyContent:"flex-end", marginTop:"20px" },
  btnCancelar:  { background:"#f0f0f0", color:"#333", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", cursor:"pointer" },
  btnGuardar:   { background:"linear-gradient(135deg,#2C1810,#4a2518)", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"14px", fontWeight:"bold", cursor:"pointer" },
};
