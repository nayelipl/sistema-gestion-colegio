// Modal para mostrar el detalle completo de un recibo, 
// incluyendo información del tutor, concepto, método de pago, estado (anulado o activo) 
// y opciones para imprimir o cerrar el modal.
import { formatFechaLocal } from "@/lib/formatear-fecha";
import React from "react";

interface ModalDetalleReciboProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  recibo: {
    reciboNo: string;
    fecha: string;
    hora: string;
    alPortador?: string;
    metodoPago: string;
    total: number;
    realizadoPor: string;
    anulado: boolean;
    anuladoPor?: string;
    motivoAnulacion?: string;
    tutor: { nombre: string; apellido: string; cuentaNo: string };
    concepto?: string;
    descripcion?: string;
  } | null;
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #ddd", background: "#f8f9fa" },
  titulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  btnCerrar: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" },
  body: { padding: "20px", overflow: "auto", flex: 1 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "16px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" },
  footer: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", borderTop: "1px solid #ddd", background: "#f8f9fa" },
  btnImprimir: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  btnCerrarFooter: { background: "#718096", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
};

export function ModalDetalleRecibo({ isOpen, onClose, onPrint, recibo }: ModalDetalleReciboProps) {
  if (!isOpen || !recibo) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.titulo}>🧾 Detalle del Recibo</h3>
          <button onClick={onClose} style={modalStyles.btnCerrar}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <div style={modalStyles.grid}>
            <div><strong>Recibo No.:</strong> {recibo.reciboNo}</div>
            <div><strong>Fecha:</strong> {formatFechaLocal(recibo.fecha)}</div>
            <div><strong>Concepto:</strong> {recibo.concepto || "OTRO"}</div>
            <div><strong>Al portador:</strong> {recibo.alPortador || recibo.descripcion?.split(" - ")[1] || recibo.tutor?.nombre || "—"}</div>
            <div><strong>Monto:</strong> RD${recibo.total.toFixed(2)}</div>
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
        </div>
        <div style={modalStyles.footer}>
          <button onClick={onPrint} style={modalStyles.btnImprimir}>🖨️ Imprimir</button>
          <button onClick={onClose} style={modalStyles.btnCerrarFooter}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
