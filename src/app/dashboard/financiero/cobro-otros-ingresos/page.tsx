"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { ModalContrasenaRol } from "../../../../components/Modales/ModalContraseñaRol";
import { ModalDetalleRecibo } from "@/components/Modales/ModalDetalleRecibo";
import { formatFechaLocal } from "@/lib/formatear-fecha";
import { useImprimir } from "@/hooks/useImprimir";
import { ImprimirContenido } from "@/components/ImprimirContenido";
import NavBar from "@/components/NavBar";

type Tab = "cobro" | "recibos";

type Recibo = {
  id: number;
  reciboNo: string;
  fecha: string;
  hora: string;
  metodoPago: string;
  total: number;
  realizadoPor: string;
  anulado: boolean;
  anuladoPor?: string;
  motivoAnulacion?: string;
  tutor: { nombre: string; apellido: string; cuentaNo: string };
  concepto: string;
  alPortador: string;
  descripcion: string;
};

type ReciboImpresion = {
  reciboNo: string;
  fecha: Date;
  total: number;
  metodoPago: string;
  concepto: string;
  alPortador: string;
  descripcion: string;
  realizadoPor?: string;
};

export default function CobroOtrosIngresosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as any)?.role ?? "";
  
  const [tab, setTab] = useState<Tab>("cobro");

  // Formulario de cobro
  const [fechaPago, setFechaPago] = useState(formatFechaLocal(new Date()));
  const [concepto, setConcepto] = useState("");
  const [alPortador, setAlPortador] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CHEQUE" | "">("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Listado de recibos
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [cargandoRecibos, setCargandoRecibos] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [conceptoFiltro, setConceptoFiltro] = useState("TODOS");
  const [haBuscado, setHaBuscado] = useState(false);
  const [mostrarModalClave, setMostrarModalClave] = useState(false);
  
  const [reciboDetalle, setReciboDetalle] = useState<Recibo | null>(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [reciboParaAnular, setReciboParaAnular] = useState<Recibo | null>(null);
  
  const { componentRef, handleImprimir } = useImprimir();
  const [reciboRecienCreado, setReciboRecienCreado] = useState<ReciboImpresion | null>(null);

  const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !ROLES_PERMITIDOS.includes(rol)) {
      router.push("/dashboard");
    }
  }, [status, rol]);

  const cargarEstudiantes = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) return [];
    
    try {
      // Para Derecho a Graduación y Excursión Escolar, buscar estudiantes matriculados en el año escolar actual
      const res = await fetch(`/api/usuarios/estudiantes/buscar?q=${encodeURIComponent(inputValue)}&tipo=matriculados`);
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      return [];
    }
  };

  const handleConceptoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setConcepto(value);
    setEstudianteSeleccionado(null);
    if (value === "OTRO") {
      setAlPortador("");
    } else {
      setDescripcion("");
      setAlPortador("");
    }
  };

  const registrarPagoPresencial = async (contrasena?: string) => {
    if (!concepto) {
      setError("Debe seleccionar un concepto");
      return;
    }
    if (!alPortador) {
      setError(`Debe especificar ${concepto === "OTRO" ? "el nombre" : "el estudiante"}`);
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      setError("Debe ingresar un monto válido");
      return;
    }
    if (!metodoPago) {
      setError("Debe seleccionar un método de pago");
      return;
    }

    const payload: any = {
      fecha: fechaPago,
      concepto,
      alPortador,
      monto: parseFloat(monto),
      metodoPago,
      descripcion: descripcion || "",
      nota: "",
      origen: "PRESENCIAL",
    };

    if (estudianteSeleccionado) {
      payload.estudianteId = estudianteSeleccionado.value;
      } else if (concepto === "DERECHO A GRADUACIÓN" || concepto === "EXCURSIÓN ESCOLAR") {
        setError("Debe seleccionar un estudiante");
        return;
    }

    if (contrasena) {
      payload.contrasenaAutorizacion = contrasena;
    }

    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/financiero/registro-otro-ingreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Error de API:", data);
        setError(data.error || "Error al registrar el pago");
        return;
    }

      setExito(`${data.mensaje} - Recibo: ${data.reciboNo}`);
      
      const reciboParaImprimir: ReciboImpresion = {
        reciboNo: data.reciboNo,
        fecha: new Date(),
        total: parseFloat(monto),
        metodoPago,
        concepto,
        alPortador,
        descripcion: descripcion || "",
        realizadoPor: session?.user?.name || "",
      };
      
      setReciboRecienCreado(reciboParaImprimir);

      setConcepto("");
      setAlPortador("");
      setEstudianteSeleccionado(null);
      setDescripcion("");
      setMonto("");
      setMetodoPago("");

      // Esperar un momento para que el componente se actualice y luego imprimir
      setTimeout(() => {
        handleImprimir();
        cargarRecibos();
      }, 500);
      
      setTimeout(() => setExito(""), 5000);
    } catch (error) {
      setError("Error al registrar el pago");
    } finally {
      setCargando(false);
    }
  };

  const cargarRecibos = async () => {
    setCargandoRecibos(true);
    setHaBuscado(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (conceptoFiltro !== "TODOS") params.append("concepto", conceptoFiltro);

      const res = await fetch(`/api/financiero/recibos-otros-ingresos?${params.toString()}`);
      const data = await res.json();
      setRecibos(data.recibos || []);
    } catch (error) {
      console.error("Error cargando recibos:", error);
    } finally {
      setCargandoRecibos(false);
    }
  };

  const limpiarFormulario = () => {
    setFechaPago(formatFechaLocal(new Date()));
    setConcepto("");
    setAlPortador("");
    setEstudianteSeleccionado(null);
    setDescripcion("");
    setMonto("");
    setMetodoPago("");
    setError("");
    };

  const limpiarFiltrosRecibos = () => {
    setFechaDesde("");
    setFechaHasta("");
    setConceptoFiltro("TODOS");
    setRecibos([]);
    setHaBuscado(false);
    };

  const verDetalleRecibo = (recibo: Recibo) => {
    setReciboDetalle(recibo);
    setMostrarModalDetalle(true);
    };

  const anularRecibo = async (recibo: Recibo, contrasena?: string) => {
    if (recibo.anulado) {
        setError("Este recibo ya está anulado");
        setTimeout(() => setError(""), 3000);
        return;
    }

    const motivo = prompt("Motivo de anulación:", "Pago registrado por error");
    if (!motivo) return;

    try {
        const body: any = { anulado: true, motivo };
        
        if (contrasena) {
        body.contrasenaAutorizacion = contrasena;
        }

        const res = await fetch(`/api/financiero/recibos-otros-ingresos/${recibo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);
        
        setExito(`✅ Recibo ${recibo.reciboNo} anulado correctamente`);
        setTimeout(() => setExito(""), 4000);
        cargarRecibos();
        setMostrarModalClave(false);
        setReciboParaAnular(null);
    } catch (error) {
        setError("Error al anular el recibo");
    }
    };

    const handleAnularRecibo = (recibo: Recibo) => {
    if (rol === "CONTADOR" || rol === "ADMINISTRADOR") {
        anularRecibo(recibo);
    } else {
        setReciboParaAnular(recibo);
        setMostrarModalClave(true);
    }
    };

    const handleConfirmarAnulacion = (contrasena: string) => {
    if (reciboParaAnular) {
        anularRecibo(reciboParaAnular, contrasena);
        setReciboParaAnular(null);
    }
    };

  if (status === "loading") return <div>Cargando...</div>;
  if (!ROLES_PERMITIDOS.includes(rol)) return null;

  return (
    <main style={styles.main}>
      <NavBar titulo="Cobro de Otros Ingresos" icono="💰" userName={session?.user?.name} />
      <div style={styles.contenido}>
        <div style={styles.header}>
          <h1 style={styles.titulo}>Cobro de Otros Ingresos</h1>
          <p style={styles.subtitulo}>Registro de pagos por derecho a graduación, excursiones escolares y otros conceptos</p>
        </div>

        {exito && <div style={styles.exitoMsg}>✅ {exito}</div>}
        {error && <div style={styles.errorMsg}>❌ {error}</div>}

        <div style={styles.tabs}>
          <button onClick={() => setTab("cobro")} style={{ ...styles.tab, ...(tab === "cobro" ? styles.tabActivo : {}) }}>
            💰 Registrar Pago
          </button>
          <button onClick={() => { setTab("recibos") }} style={{ ...styles.tab, ...(tab === "recibos" ? styles.tabActivo : {}) }}>
            📋 Listado de Recibos ({recibos.length})
          </button>
        </div>

        {/* Pestaña de Cobro */}
        {tab === "cobro" && (
          <div style={styles.formCard}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Concepto *</label>
              <select value={concepto} onChange={handleConceptoChange} style={styles.select} required>
                <option value="">-- Seleccione un concepto --</option>
                <option value="DERECHO A GRADUACIÓN">🎓 Derecho a Graduación</option>
                <option value="EXCURSIÓN ESCOLAR">🚌 Excursión Escolar</option>
                <option value="OTRO">📝 Otro</option>
              </select>
            </div>

            {concepto === "DERECHO A GRADUACIÓN" && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estudiante *</label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={cargarEstudiantes}
                    onChange={(option: any) => {
                    if (option) {
                    setEstudianteSeleccionado({
                        value: option.value,
                        label: option.label,
                        estudiante: option.estudiante
                    });
                    setAlPortador(`${option.estudiante?.nombre} ${option.estudiante?.apellido}`);
                    } else {
                        setEstudianteSeleccionado(null);
                    }
                }}
                value={estudianteSeleccionado}
                placeholder="Buscar estudiante por código, nombre o apellido..."
                isClearable
                styles={asyncSelectStyles}
                />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nota (opcional)</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    style={styles.textarea}
                    rows={2}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </>
            )}

            {concepto === "EXCURSIÓN ESCOLAR" && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estudiante *</label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={cargarEstudiantes}
                    onChange={(option: any) => {
                    if (option) {
                      setEstudianteSeleccionado ({
                        value: option.value,
                        label: option.label,
                        estudiante: option.estudiante
                      });
                      setAlPortador(`${option.estudiante?.nombre} ${option.estudiante?.apellido}`);
                    } else {
                        setEstudianteSeleccionado(null);
                        setAlPortador("");
                    }
                    }}
                    value={estudianteSeleccionado}
                    placeholder="Buscar estudiante por código, nombre o apellido..."
                    isClearable
                    styles={asyncSelectStyles}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Descripción *</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    style={styles.textarea}
                    rows={2}
                    placeholder="Describa el motivo de la excursión..."
                    required
                  />
                </div>
              </>
            )}

            {concepto === "OTRO" && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Al portador *</label>
                  <input
                    type="text"
                    value={alPortador}
                    onChange={(e) => setAlPortador(e.target.value)}
                    style={styles.input}
                    placeholder="Nombre de la persona que recibe el pago"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Descripción del concepto *</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    style={styles.textarea}
                    rows={2}
                    placeholder="Describa el concepto del pago..."
                    required
                  />
                </div>
              </>
            )}

            {(concepto === "DERECHO A GRADUACIÓN" || concepto === "EXCURSIÓN ESCOLAR") && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Al portador</label>
                <input
                  type="text"
                  value={alPortador || (estudianteSeleccionado?.estudiante ? `${estudianteSeleccionado.estudiante.nombre} ${estudianteSeleccionado.estudiante.apellido}` : "")}
                  style={styles.input}
                  disabled
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Monto (RD$) *</label>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Método de Pago *</label>
              <div style={styles.metodoGrid}>
                <label style={styles.checkboxLabel}>
                  <input type="radio" name="metodoPago" value="EFECTIVO" checked={metodoPago === "EFECTIVO"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                  💵 Efectivo
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="radio" name="metodoPago" value="CHEQUE" checked={metodoPago === "CHEQUE"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                  📝 Cheque
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="radio" name="metodoPago" value="TRANSFERENCIA" checked={metodoPago === "TRANSFERENCIA"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                  🏦 Transferencia
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="radio" name="metodoPago" value="TARJETA" checked={metodoPago === "TARJETA"} onChange={(e) => setMetodoPago(e.target.value as any)} />
                  💳 Tarjeta
                </label>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button onClick={limpiarFormulario} style={styles.btnSecundario}>🧹 Limpiar</button>
              <button onClick={() => registrarPagoPresencial()} disabled={cargando} style={styles.btnGuardar}>
                {cargando ? "Procesando..." : "Registrar Pago"}
              </button>
            </div>
          </div>
        )}

        {/* Pestaña de Listado de Recibos */}
        {tab === "recibos" && (
        <div style={styles.recibosContainer}>
            <div style={styles.filtrosGrid}>
            <div>
                <label style={styles.label}>Fecha desde</label>
                <input 
                type="date" 
                value={fechaDesde} 
                onChange={(e) => setFechaDesde(e.target.value)} 
                style={styles.input} 
                />
            </div>
            <div>
                <label style={styles.label}>Fecha hasta</label>
                <input 
                type="date" 
                value={fechaHasta} 
                onChange={(e) => setFechaHasta(e.target.value)} 
                style={styles.input} 
                />
            </div>
            <div>
                <label style={styles.label}>Concepto</label>
                <select 
                value={conceptoFiltro} 
                onChange={(e) => setConceptoFiltro(e.target.value)} 
                style={styles.input}
                >
                <option value="TODOS">Todos</option>
                <option value="DERECHO A GRADUACIÓN">Derecho a Graduación</option>
                <option value="EXCURSIÓN ESCOLAR">Excursión Escolar</option>
                <option value="OTRO">Otro</option>
                </select>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button onClick={cargarRecibos} style={styles.btnFiltrar}>🔍 Filtrar</button>
                <button onClick={limpiarFiltrosRecibos} style={styles.btnLimpiar}>🧹 Limpiar</button>
            </div>
            </div>

            {!haBuscado && (
            <div style={styles.vacio}>🔍 Haga clic en "Filtrar" para ver todos los recibos o aplicar filtros específicos</div>
            )}
            
            {haBuscado && cargandoRecibos && (
            <div style={styles.vacio}>Cargando recibos...</div>
            )}
            
            {haBuscado && !cargandoRecibos && recibos.length === 0 && (
            <div style={styles.vacio}>
                {fechaDesde || fechaHasta || conceptoFiltro !== "TODOS" 
                ? "No hay recibos con los filtros seleccionados" 
                : "No hay recibos registrados"}
            </div>
            )}
            
            {/* Mostrar tabla de resultados */}
            {haBuscado && !cargandoRecibos && recibos.length > 0 && (
            <div style={styles.tablaWrap}>
                <table style={styles.tabla}>
                <thead>
                    <tr style={styles.thead}>
                    <th>Recibo No.</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Al portador</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {recibos.map((recibo) => (
                    <tr key={recibo.id} style={recibo.anulado ? { backgroundColor: "#fff5f5" } : {}}>
                        <td>{recibo.reciboNo}</td>
                        <td>{formatFechaLocal(recibo.fecha)}</td>
                        <td>{recibo.concepto}</td>
                        <td>{recibo.alPortador}</td>
                        <td>RD${recibo.total.toFixed(2)}</td>
                        <td>{recibo.anulado ? <span style={styles.badgeAnulado}>ANULADO</span> : <span style={styles.badgeActivo}>ACTIVO</span>}</td>
                        <td>
                        <button onClick={() => verDetalleRecibo(recibo)} style={styles.btnVer}>👁️ Ver</button>
                        <button onClick={() => {
                          setReciboRecienCreado({
                                reciboNo: recibo.reciboNo,
                                fecha: new Date(recibo.fecha),
                                total: recibo.total,
                                metodoPago: recibo.metodoPago,
                                concepto: recibo.concepto,
                                alPortador: recibo.alPortador,
                                descripcion: recibo.descripcion,
                                realizadoPor: recibo.realizadoPor,
                              });
                              setTimeout(() => handleImprimir(), 100); 
                          }} style={styles.btnImprimir}>🖨️ Imprimir</button>
                        {!recibo.anulado && (
                            <button onClick={() => handleAnularRecibo(recibo)} style={styles.btnAnular}>🚫 Anular</button>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </div>
        )}
      </div>

      <ModalDetalleRecibo
        isOpen={mostrarModalDetalle}
        onClose={() => setMostrarModalDetalle(false)}
        onPrint={() => {
          if (reciboDetalle) {
            setReciboRecienCreado({
              reciboNo: reciboDetalle.reciboNo,
              fecha: new Date(reciboDetalle.fecha),
              total: reciboDetalle.total,
              metodoPago: reciboDetalle.metodoPago,
              concepto: reciboDetalle.concepto,
              alPortador: reciboDetalle.alPortador,
              descripcion: reciboDetalle.descripcion,
              realizadoPor: reciboDetalle.realizadoPor,
            });
            setTimeout(() => handleImprimir(), 100);
          }
        }}
        recibo={reciboDetalle}
      />

      <ModalContrasenaRol
        isOpen={mostrarModalClave}
        onClose={() => {
            setMostrarModalClave(false);
            setReciboParaAnular(null);
        }}
        onConfirm={handleConfirmarAnulacion}
        rol="CONTADOR"
        accion="anular este recibo"
        />

        {/* Componente oculto para imprimir */}
        <div style={{ display: "none" }}>
          {reciboRecienCreado && (
            <ImprimirContenido
              ref={componentRef}
              titulo="Recibo de Pago"
              datos={reciboRecienCreado}
              tipo="recibo-otros"
            />
          )}
        </div>
    </main>
  );
}

const asyncSelectStyles = {
  control: (base: any) => ({ ...base, padding: "4px", borderRadius: "7px", border: "1px solid #ddd", minHeight: "42px" }),
  menu: (base: any) => ({ ...base, zIndex: 9999 }),
};

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "20px", width: "100%", boxSizing: "border-box" as const },
  header: { marginBottom: "24px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { border: "1px solid #2C1810", color: "#2C1810", background: "#EBF3FB" },
  formCard: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  formGroup: { marginBottom: "20px" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" as const },
  metodoGrid: { display: "flex", gap: "24px", flexWrap: "wrap" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" },
  buttonGroup: { display: "flex", justifyContent: "flex-end", marginTop: "24px", flexWrap: "wrap", gap: "10px" },
  btnSecundario: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontSize: "14px" },
  btnGuardar: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  recibosContainer: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" as const, width: "100%" },
  filtrosGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px", alignItems: "flex-end" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", width: "100%", WebkitOverflowScrolling: "touch" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "700px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff" },
  th: { padding: "12px 14px", textAlign: "left", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap" as const },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: "13px", whiteSpace: "nowrap" as const },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", marginRight: "8px", fontSize: "12px" },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", fontSize: "12px" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", fontSize: "12px", marginRight: "8px" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeAnulado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", textDecoration: "line-through" },
  vacio: { textAlign: "center", padding: "40px", color: "#888", background: "#fff", borderRadius: "8px" },
};
