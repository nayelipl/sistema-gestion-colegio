// Modal para mostrar el detalle completo de un recibo de Cobro de Cargos a Tutores, 
// incluyendo información del tutor, cargos pagados, método de pago, estado (anulado o activo) 
// y opciones para imprimir o cerrar el modal.
"use client";
import React from "react";

interface ModalDetalleReciboProps {
isOpen: boolean;
onClose: () => void;
onPrint: () => void;
recibo: {
    id: number;
    reciboNo: string;
    fecha: string;
    hora: string;
    metodoPago: string;
    subTotal: number;
    recargoTotal: number;
    total: number;
    realizadoPor: string;
    anulado: boolean;
    anuladoPor?: string;
    anuladoEn?: string;
    motivoAnulacion?: string;
    tutor: {
    nombre: string;
    apellido: string;
    cuentaNo: string;
    };
    pagos: Array<{
    montoPagado: number;
    cargo: {
        cargoNo: string;
        tipo: string;
    };
    }>;
} | null;
}

const modalStyles: Record<string, React.CSSProperties> = {
overlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
modal: { background: "#fff", borderRadius: "12px", width: "600px", maxWidth: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column" as const, overflow: "hidden" },
header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #ddd", background: "#f8f9fa" },
titulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
btnCerrar: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" },
body: { padding: "20px", overflow: "auto" as const, flex: 1 },
detalleGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "16px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" },
subTitulo: { margin: "16px 0 8px", fontSize: "14px", fontWeight: "bold" },
tablaWrap: { overflowX: "auto", marginTop: "8px" },
tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)" },
th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0" },
tfoot: { background: "#f8f9fa", fontWeight: "bold" },
footer: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", borderTop: "1px solid #ddd", background: "#f8f9fa" },
btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
btnCerrarFooter: { background: "#718096", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
};

export function ModalDetalleReciboCargos({ isOpen, onClose, onPrint, recibo }: ModalDetalleReciboProps) {
if (!isOpen || !recibo) return null;

return (
    <div style={modalStyles.overlay}>
    <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
        <h3 style={modalStyles.titulo}>🧾 Detalle del Recibo</h3>
        <button onClick={onClose} style={modalStyles.btnCerrar}>✕</button>
        </div>
        <div style={modalStyles.body}>
        <div style={modalStyles.detalleGrid}>
            <div><strong>Recibo No.:</strong> {recibo.reciboNo}</div>
            <div><strong>Fecha:</strong> {new Date(recibo.fecha).toLocaleString("es-DO")}</div>
            <div><strong>Tutor:</strong> {recibo.tutor.nombre} {recibo.tutor.apellido}</div>
            <div><strong>Cuenta:</strong> {recibo.tutor.cuentaNo}</div>
            <div><strong>Método de Pago:</strong> {recibo.metodoPago}</div>
            <div><strong>Realizado por:</strong> {recibo.realizadoPor}</div>
            <div><strong>Estado:</strong> {recibo.anulado ? "ANULADO" : "ACTIVO"}</div>
            {recibo.anulado && (
            <>
                <div><strong>Anulado por:</strong> {recibo.anuladoPor || "—"}</div>
                <div><strong>Motivo:</strong> {recibo.motivoAnulacion || "—"}</div>
            </>
            )}
        </div>

        <div style={modalStyles.subTitulo}>📋 Cargos pagados:</div>
        <div style={modalStyles.tablaWrap}>
            <table style={modalStyles.tabla}>
            <thead>
                <tr style={modalStyles.thead}>
                <th style={modalStyles.th}>Cargo No.</th>
                <th style={modalStyles.th}>Tipo</th>
                <th style={modalStyles.th}>Monto Pagado</th>
                </tr>
            </thead>
            <tbody>
                {recibo.pagos.map((pago, idx) => (
                <tr key={idx}>
                    <td style={modalStyles.td}>{pago.cargo.cargoNo || "—"}</td>
                    <td style={modalStyles.td}>{pago.cargo.tipo || "—"}</td>
                    <td style={modalStyles.td}>RD${pago.montoPagado.toFixed(2)}</td>
                </tr>
                ))}
            </tbody>
            <tfoot>
                <tr style={modalStyles.tfoot}>
                <td colSpan={2} style={modalStyles.td}><strong>Sub-Total:</strong></td>
                <td style={modalStyles.td}>RD${recibo.subTotal.toFixed(2)}</td>
                </tr>
                <tr style={modalStyles.tfoot}>
                <td colSpan={2} style={modalStyles.td}><strong>Recargo:</strong></td>
                <td style={modalStyles.td}>RD${recibo.recargoTotal.toFixed(2)}</td>
                </tr>
                <tr style={modalStyles.tfoot}>
                <td colSpan={2} style={modalStyles.td}><strong>Total:</strong></td>
                <td style={modalStyles.td}>RD${recibo.total.toFixed(2)}</td>
                </tr>
            </tfoot>
            </table>
        </div>
        </div>
        <div style={modalStyles.footer}>
        <button onClick={onPrint} style={modalStyles.btnImprimir}>🖨️ Imprimir</button>
        <button onClick={onClose} style={modalStyles.btnCerrarFooter}>Cerrar</button>
        </div>
    </div>
    </div>
);
}
