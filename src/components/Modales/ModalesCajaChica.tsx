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
  cedula: string;
  estado: string;
  anuladoPor?: string;
  anuladoEn?: string;
  motivoAnulacion?: string;
  creadoPor: string;
  creadoEn: string;
};

type FondoActual = {
  fondo: { saldoInicial: number; fondoMinimo: number } | null;
  saldoActual: number;
  totalDesembolsos: number;
  fondoMinimo: number;
  requiereReposicion: boolean;
};

// Modal inicializar fondo
type ModalInicializarFondoProps = {
  isOpen: boolean;
  onClose: () => void;
  onInicializar: () => void;
  saldoInicialInput: string;
  setSaldoInicialInput: (value: string) => void;
  fondoMinimoInput: string;
  setFondoMinimoInput: (value: string) => void;
  cargando: boolean;
  styles: Record<string, React.CSSProperties>;
};

export const ModalInicializarFondo = ({
  isOpen,
  onClose,
  onInicializar,
  saldoInicialInput,
  setSaldoInicialInput,
  fondoMinimoInput,
  setFondoMinimoInput,
  cargando,
  styles,
}: ModalInicializarFondoProps) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Inicializar Fondo de Caja Chica</h3>
        <div style={styles.formGroup}>
          <label>Saldo Inicial (RD$)</label>
          <input type="number" step="0.01" value={saldoInicialInput} onChange={(e) => setSaldoInicialInput(e.target.value)} style={styles.input} placeholder="0.00" />
        </div>
        <div style={styles.formGroup}>
          <label>Fondo Mínimo (RD$)</label>
          <input type="number" step="0.01" value={fondoMinimoInput} onChange={(e) => setFondoMinimoInput(e.target.value)} style={styles.input} placeholder="0.00" />
        </div>
        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onInicializar} disabled={cargando} style={styles.btnGuardar}>Inicializar</button>
        </div>
      </div>
    </div>
  );
};

// Modal nuevo desembolso
type FormDesembolso = {
  fecha: string;
  pagadoA: string;
  monto: string;
  conCargoA: string;
  porConceptoDe: string;
  aprobadoPor: string;
  recibidoPor: string;
  cedula: string;
};

type ModalNuevoDesembolsoProps = {
  isOpen: boolean;
  onClose: () => void;
  onRegistrar: () => void;
  formDesembolso: FormDesembolso;
  setFormDesembolso: React.Dispatch<React.SetStateAction<FormDesembolso>>;
  cargando: boolean;
  styles: Record<string, React.CSSProperties>;
};

export const ModalNuevoDesembolso = ({
  isOpen,
  onClose,
  onRegistrar,
  formDesembolso,
  setFormDesembolso,
  cargando,
  styles,
}: ModalNuevoDesembolsoProps) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Nuevo Desembolso</h3>
        <div style={styles.formGrid}>
          <div>
            <label>Fecha *</label>
            <input type="date" value={formDesembolso.fecha} onChange={(e) => setFormDesembolso({...formDesembolso, fecha: e.target.value})} style={styles.input} />
          </div>
          <div>
            <label>Pagado a *</label>
            <input type="text" value={formDesembolso.pagadoA} onChange={(e) => setFormDesembolso({...formDesembolso, pagadoA: e.target.value})} style={styles.input} placeholder="Beneficiario" />
          </div>
          <div>
            <label>Monto (RD$) *</label>
            <input type="number" step="0.01" value={formDesembolso.monto} onChange={(e) => setFormDesembolso({...formDesembolso, monto: e.target.value})} style={styles.input} placeholder="0.00" />
          </div>
          <div>
            <label>Con cargo a *</label>
            <input type="text" value={formDesembolso.conCargoA} onChange={(e) => setFormDesembolso({...formDesembolso, conCargoA: e.target.value})} style={styles.input} placeholder="Quién asume el gasto" />
          </div>
          <div>
            <label>Por concepto de *</label>
            <input type="text" value={formDesembolso.porConceptoDe} onChange={(e) => setFormDesembolso({...formDesembolso, porConceptoDe: e.target.value})} style={styles.input} placeholder="Motivo del gasto" />
          </div>
          <div>
            <label>Aprobado por *</label>
            <input type="text" value={formDesembolso.aprobadoPor} onChange={(e) => setFormDesembolso({...formDesembolso, aprobadoPor: e.target.value})} style={styles.input} placeholder="Quién autoriza" />
          </div>
          <div>
            <label>Recibido por *</label>
            <input type="text" value={formDesembolso.recibidoPor} onChange={(e) => setFormDesembolso({...formDesembolso, recibidoPor: e.target.value})} style={styles.input} placeholder="Quién recibe" />
          </div>
          <div>
            <label>Cédula</label>
            <input type="text" value={formDesembolso.cedula} onChange={(e) => setFormDesembolso({...formDesembolso, cedula: e.target.value})} style={styles.input} placeholder="000-0000000-0" />
          </div>
        </div>
        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onRegistrar} disabled={cargando} style={styles.btnGuardar}>Registrar</button>
        </div>
      </div>
    </div>
  );
};

// Modal generar cuadre y seleccionar fechas
type ModalGenerarCuadreProps = {
  isOpen: boolean;
  onClose: () => void;
  onPrevisualizar: () => void;
  cuadreFechaDesde: string;
  setCuadreFechaDesde: (value: string) => void;
  cuadreFechaHasta: string;
  setCuadreFechaHasta: (value: string) => void;
  cargando: boolean;
  styles: Record<string, React.CSSProperties>;
};

export const ModalGenerarCuadre = ({
  isOpen,
  onClose,
  onPrevisualizar,
  cuadreFechaDesde,
  setCuadreFechaDesde,
  cuadreFechaHasta,
  setCuadreFechaHasta,
  cargando,
  styles,
}: ModalGenerarCuadreProps) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Generar Cuadre de Caja Chica</h3>
        <div style={styles.formGroup}>
          <label>Fecha desde *</label>
          <input type="date" value={cuadreFechaDesde} onChange={(e) => setCuadreFechaDesde(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label>Fecha hasta *</label>
          <input type="date" value={cuadreFechaHasta} onChange={(e) => setCuadreFechaHasta(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onPrevisualizar} disabled={cargando} style={styles.btnGuardar}>
            {cargando ? "Cargando..." : "Previsualizar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal resultados del cuadre
type ModalResultadosCuadreProps = {
  isOpen: boolean;
  onClose: () => void;
  onGuardarBorrador: () => void;
  onReportar: () => void;
  periodoDesde: string;
  periodoHasta: string;
  saldoInicial: number;
  totalDesembolsos: number;
  desembolsos: Desembolso[];
  cargando?: boolean;
  styles: Record<string, React.CSSProperties>;
  formatMonto: (monto: number) => string;
};

export const ModalResultadosCuadre = ({
  isOpen,
  onClose,
  onGuardarBorrador,
  onReportar,
  periodoDesde,
  periodoHasta,
  saldoInicial,
  totalDesembolsos,
  desembolsos,
  cargando,
  styles,
  formatMonto,
}: ModalResultadosCuadreProps) => {
  if (!isOpen) return null;

  const saldoActual = saldoInicial - totalDesembolsos;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Resumen del Cuadre</h3>

        <div style={{ background: "#f0f4f8", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
          <div><strong>Período:</strong> {formatFechaLarga(periodoDesde)} - {formatFechaLarga(periodoHasta)}</div>
        </div>

        <div style={styles.cuadreResumen}>
          <div><strong>Saldo Inicial:</strong> {formatMonto(saldoInicial)}</div>
          <div><strong>Total Desembolsos:</strong> {formatMonto(totalDesembolsos)}</div>
          <div><strong>Saldo Actual:</strong> {formatMonto(saldoActual)}</div>
          <div><strong>Monto Reposición:</strong> {formatMonto(totalDesembolsos)}</div>
        </div>

        {desembolsos.length > 0 && (
          <>
            <h4>Desembolsos incluidos ({desembolsos.length})</h4>
            <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
              <table style={styles.tablaMini}>
                <thead>
                  <tr>
                    <th style={styles.thMini}>No.</th>
                    <th style={styles.thMini}>Fecha</th>
                    <th style={styles.thMini}>Pagado a</th>
                    <th style={styles.thMini}>Monto</th>
                    <th style={styles.thMini}>Concepto</th>
                    <th style={styles.thMini}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {desembolsos.map((d, idx) => (
                    <tr key={idx} style={d.estado === "ANULADA" ? { backgroundColor: "#fff5f5" } : {}}>
                      <td style={styles.tdMini}>{d.desembolsoNo}</td>
                      <td style={styles.tdMini}>{formatFechaLarga(d.fecha)}</td>
                      <td style={styles.tdMini}>{d.pagadoA} {d.estado === "ANULADA" && <span style={{ color: "#c53030", marginLeft: "8px" }}>(ANULADO)</span>}</td>
                      <td style={styles.tdMini}>{formatMonto(d.monto)}</td>
                      <td style={styles.tdMini}>{d.porConceptoDe}</td>
                      <td style={styles.tdMini}>
                        {d.estado === "ANULADA" ? 
                          <span style={styles.badgeAnulado}>ANULADO</span> : 
                          <span style={styles.badgeActivo}>ACTIVO</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Atrás</button>
          <button onClick={onGuardarBorrador} disabled={cargando} style={styles.btnBorrador}>Guardar Borrador</button>
          <button onClick={onReportar} disabled={cargando} style={styles.btnGuardar}>Reportar</button>
        </div>
      </div>
    </div>
  );
};

// Modal editar cuadre para seleccionar fechas
type ModalEditarCuadreProps = {
  isOpen: boolean;
  onClose: () => void;
  onPrevisualizar: () => void;
  cuadreFechaDesde: string;
  setCuadreFechaDesde: (value: string) => void;
  cuadreFechaHasta: string;
  setCuadreFechaHasta: (value: string) => void;
  cargando: boolean;
  styles: Record<string, React.CSSProperties>;
};

export const ModalEditarCuadre = ({
  isOpen,
  onClose,
  onPrevisualizar,
  cuadreFechaDesde,
  setCuadreFechaDesde,
  cuadreFechaHasta,
  setCuadreFechaHasta,
  cargando,
  styles,
}: ModalEditarCuadreProps) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Editar Cuadre de Caja Chica</h3>
        <div style={styles.formGroup}>
          <label>Fecha desde *</label>
          <input type="date" value={cuadreFechaDesde} onChange={(e) => setCuadreFechaDesde(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label>Fecha hasta *</label>
          <input type="date" value={cuadreFechaHasta} onChange={(e) => setCuadreFechaHasta(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onPrevisualizar} disabled={cargando} style={styles.btnGuardar}>
            {cargando ? "Cargando..." : "Previsualizar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de resultados de editar el cuadre
type ModalResultadosEditarCuadreProps = {
  isOpen: boolean;
  onClose: () => void;
  onGuardarBorrador: () => void;
  onReportar: () => void;
  periodoDesde: string;
  periodoHasta: string;
  saldoInicial: number;
  totalDesembolsos: number;
  desembolsos: Desembolso[];
  cargando?: boolean;
  styles: Record<string, React.CSSProperties>;
  formatMonto: (monto: number) => string;
};

export const ModalResultadosEditarCuadre = ({
  isOpen,
  onClose,
  onGuardarBorrador,
  onReportar,
  periodoDesde,
  periodoHasta,
  saldoInicial,
  totalDesembolsos,
  desembolsos,
  cargando,
  styles,
  formatMonto,
}: ModalResultadosEditarCuadreProps) => {
  if (!isOpen) return null;

  const saldoActual = saldoInicial - totalDesembolsos;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3>Resumen del Cuadre</h3>

        <div style={{ background: "#f0f4f8", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
          <div><strong>Período:</strong> {formatFechaLarga(periodoDesde)} - {formatFechaLarga(periodoHasta)}</div>
        </div>

        <div style={styles.cuadreResumen}>
          <div><strong>Saldo Inicial:</strong> {formatMonto(saldoInicial)}</div>
          <div><strong>Total Desembolsos:</strong> {formatMonto(totalDesembolsos)}</div>
          <div><strong>Saldo Actual:</strong> {formatMonto(saldoActual)}</div>
          <div><strong>Monto Reposición:</strong> {formatMonto(totalDesembolsos)}</div>
        </div>

        {desembolsos.length > 0 && (
          <>
            <h4>Desembolsos incluidos ({desembolsos.length})</h4>
            <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
              <table style={styles.tablaMini}>
                <thead>
                  <tr>
                    <th style={styles.thMini}>No.</th>
                    <th style={styles.thMini}>Fecha</th>
                    <th style={styles.thMini}>Pagado a</th>
                    <th style={styles.thMini}>Monto</th>
                    <th style={styles.thMini}>Concepto</th>
                    <th style={styles.thMini}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {desembolsos.map((d, idx) => (
                    <tr key={idx} style={d.estado === "ANULADA" ? { backgroundColor: "#fff5f5" } : {}}>
                      <td style={styles.tdMini}>{d.desembolsoNo}</td>
                      <td style={styles.tdMini}>{formatFechaLarga(d.fecha)}</td>
                      <td style={styles.tdMini}>{d.pagadoA} {d.estado === "ANULADA" && <span style={{ color: "#c53030", marginLeft: "8px" }}>(ANULADO)</span>}</td>
                      <td style={styles.tdMini}>{formatMonto(d.monto)}</td>
                      <td style={styles.tdMini}>{d.porConceptoDe}</td>
                      <td style={styles.tdMini}>
                        {d.estado === "ANULADA" ? 
                          <span style={styles.badgeAnulado}>ANULADO</span> : 
                          <span style={styles.badgeActivo}>ACTIVO</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={styles.modalBotones}>
          <button onClick={onClose} style={styles.btnCancelar}>Atrás</button>
          <button onClick={onGuardarBorrador} disabled={cargando} style={styles.btnBorrador}>Guardar Borrador</button>
          <button onClick={onReportar} disabled={cargando} style={styles.btnGuardar}>Reportar</button>
        </div>
      </div>
    </div>
  );
};
