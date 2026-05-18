"use client";
import type { Denominacion } from "@/app/dashboard/financiero/reporte-ingresos/page";

interface TablaMetodosPagoProps {
  denominaciones: Denominacion[];
  denominacionesInput: string[];
  onDenominacionChange: (index: number, value: string) => void;
  totalDenominaciones: number;
  totalTarjeta: number;
  totalCheque: number;
  totalTransferencia: number;
  totalMonto: number;
  onLimpiar: () => void;
}

export function TablaMetodosPago({
  denominaciones,
  denominacionesInput,
  onDenominacionChange,
  totalDenominaciones,
  totalTarjeta,
  totalCheque,
  totalTransferencia,
  totalMonto,
  onLimpiar,
}: TablaMetodosPagoProps) {
  const diferencia = totalDenominaciones - totalMonto;
  const diferenciaColor = diferencia >= 0 ? "#276749" : "#c53030";

  return (
    <div style={s.metodosPagoCard}>
      <h3 style={s.metodosPagoTitulo}>💳 Métodos de Pago</h3>
      <div style={s.metodosPagoTableWrap}>
        <table style={s.tablaMetodosPago}>
          <thead>
            <tr style={s.thead}>
              <th>Denominación</th><th>Cantidad</th><th>Efectivo</th>
              <th>Tarjeta</th><th>Cheque</th><th>Transferencia</th>
            </tr>
          </thead>
          <tbody>
            {denominaciones.map((den, idx) => (
              <tr key={den.valor}>
                <td style={s.tdDenominacion}>RD${den.valor.toFixed(2)}</td>
                <td style={s.tdCantidad}>
                  <input type="number" min="0" value={denominacionesInput[idx] || ""}
                    onChange={(e) => onDenominacionChange(idx, e.target.value)}
                    style={s.inputCantidad} placeholder="0" />
                </td>
                <td style={s.tdEfectivo}>RD${den.total.toFixed(2)}</td>
                <td style={s.tdMetodo}>—</td><td style={s.tdMetodo}>—</td><td style={s.tdMetodo}>—</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={s.tfoot}><td><strong>TOTALES</strong></td><td>—</td>
              <td><strong>RD${totalDenominaciones.toFixed(2)}</strong></td>
              <td><strong>RD${totalTarjeta.toFixed(2)}</strong></td>
              <td><strong>RD${totalCheque.toFixed(2)}</strong></td>
              <td><strong>RD${totalTransferencia.toFixed(2)}</strong></td>
            </tr>
            <tr style={s.tfoot}><td><strong>SOBRANTE/FALTANTE</strong></td><td>—</td>
              <td colSpan={4}><strong style={{ color: diferenciaColor }}>RD${Math.abs(diferencia).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        <button onClick={onLimpiar} style={s.btnSecundario}>🧹 Limpiar Efectivo</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  metodosPagoCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" },
  metodosPagoTitulo: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", marginBottom: "16px", paddingBottom: "8px", borderBottom: "2px solid #2C1810" },
  metodosPagoTableWrap: { overflowX: "auto", marginBottom: "10px", maxWidth: "100%" },
  tablaMetodosPago: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "600px", tableLayout: "fixed" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
  tdDenominacion: { padding: "10px 8px", whiteSpace: "nowrap" },
  tdCantidad: { padding: "10px 8px", textAlign: "center" },
  tdEfectivo: { padding: "10px 8px", textAlign: "right", whiteSpace: "nowrap" },
  tdMetodo: { padding: "10px 8px", textAlign: "center", whiteSpace: "nowrap" },
  inputCantidad: { width: "70px", padding: "6px 4px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", textAlign: "center" },
  tfoot: { background: "#e9f1f8", fontWeight: "bold" },
  btnSecundario: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", marginTop: "16px" },
};
