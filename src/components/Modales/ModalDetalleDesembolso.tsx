// Para las facturas de desembolso de Caja chica
"use client";
import React from "react";
import { formatFechaLarga } from "@/lib/formatear-fecha";

type Desembolso = {
  id: number;
  desembolsoNo: string;
  fecha: string;
  pagadoA: string;
  monto: number;
  conCargoA: string;
  porConceptoDe: string;
  aprobadoPor: string;
  recibidoPor: string;
  cedula: string | null;
  estado: string;
  anuladoPor?: string | null;
  anuladoEn?: string | null;
  motivoAnulacion?: string | null;
  creadoPor: string;
  creadoEn: string;
};

type ModalDetalleDesembolsoProps = {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  desembolso: Desembolso | null;
  styles: Record<string, React.CSSProperties>;
};

export const ModalDetalleDesembolso = ({ isOpen, onClose, onPrint, desembolso, styles }: ModalDetalleDesembolsoProps) => {
  if (!isOpen || !desembolso) return null;

  const formatMonto = (monto: number) => `RD$${monto.toFixed(2)}`;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitulo}>
            Detalle del Desembolso
            {desembolso.estado === "ANULADA" && <span style={styles.anuladoBadge}>ANULADO</span>}
          </h3>
          <button onClick={onClose} style={styles.btnCerrarModal}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.detalleGrid}>
            <div><strong>Desembolso No.:</strong> {desembolso.desembolsoNo}</div>
            <div><strong>Fecha:</strong> {formatFechaLarga(desembolso.fecha)}</div>
            <div><strong>Pagado a:</strong> {desembolso.pagadoA}</div>
            <div><strong>Monto:</strong> {formatMonto(desembolso.monto)}</div>
            <div><strong>Con cargo a:</strong> {desembolso.conCargoA}</div>
            <div><strong>Por concepto de:</strong> {desembolso.porConceptoDe}</div>
            <div><strong>Aprobado por:</strong> {desembolso.aprobadoPor}</div>
            <div><strong>Recibido por:</strong> {desembolso.recibidoPor}</div>
            {desembolso.cedula && <div><strong>Cédula:</strong> {desembolso.cedula}</div>}
            <div><strong>Estado:</strong> {desembolso.estado === "ANULADA" ? "ANULADO" : "ACTIVO"}</div>
            {desembolso.anuladoPor && <div><strong>Anulado por:</strong> {desembolso.anuladoPor}</div>}
            {desembolso.motivoAnulacion && <div><strong>Motivo:</strong> {desembolso.motivoAnulacion}</div>}
            <div><strong>Creado por:</strong> {desembolso.creadoPor}</div>
            <div><strong>Fecha creación:</strong> {formatFechaLarga(desembolso.creadoEn)}</div>
          </div>
        </div>
        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Cerrar</button>
          <button onClick={onPrint} style={styles.btnImprimirModal}>🖨️ Imprimir</button>
        </div>
      </div>
    </div>
  );
};

ModalDetalleDesembolso.displayName = "ModalDetalleDesembolso";