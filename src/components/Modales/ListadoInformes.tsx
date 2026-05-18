// Modal para mostrar un listado de informes guardados, con opciones para ver, editar, anular o eliminar cada informe.
import React, { useState } from "react";
import { Informe } from "@/hooks/useInformes";

interface ListadoInformesProps {
  isOpen: boolean;
  onClose: () => void;
  informes: Informe[];
  onVer: (informe: Informe) => void;
  onEditar: (informe: Informe) => void;
  onAnular: (id: number) => void;
  onEliminar?: (id: number) => void;
  mostrarEliminar?: boolean;
  inline?: boolean;
}

const listadoStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "700px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" as const },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" },
  tab: { padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", background: "none", border: "none" },
  tabActivo: { background: "#2C1810", color: "#fff" },
  informeCard: { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "12px" },
  informeCardAnulado: { border: "1px solid #fed7d7", borderRadius: "8px", padding: "12px", marginBottom: "12px", background: "#fff5f5" },
  informeHeader: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  informeFecha: { fontSize: "11px", color: "#666" },
  informeDesc: { fontSize: "12px", color: "#666", marginBottom: "8px" },
  informeActions: { display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" as const },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" },
  btnEliminar: { background: "#c53030", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" },
  btnCerrar: { background: "#718096", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", marginTop: "16px", width: "100%" },
  badgeAnulado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", marginLeft: "8px" },
};

export function ListadoInformes({
  isOpen,
  onClose,
  informes,
  onVer,
  onEditar,
  onAnular,
  onEliminar,
  mostrarEliminar = false,
}: ListadoInformesProps) {
  const [mostrarAnulados, setMostrarAnulados] = useState(false);
  
  if (!isOpen) return null;

  const informesActivos = informes.filter(i => !i.anulado);
  const informesAnulados = informes.filter(i => i.anulado);

  return (
    <div style={listadoStyles.overlay}>
      <div style={listadoStyles.modal}>
        <h3>📊 Informes Guardados</h3>
        
        <div style={listadoStyles.tabs}>
          <button onClick={() => setMostrarAnulados(false)} style={{ ...listadoStyles.tab, ...(!mostrarAnulados ? listadoStyles.tabActivo : {}) }}>
            📋 Activos ({informesActivos.length})
          </button>
          <button onClick={() => setMostrarAnulados(true)} style={{ ...listadoStyles.tab, ...(mostrarAnulados ? listadoStyles.tabActivo : {}) }}>
            🚫 Anulados ({informesAnulados.length})
          </button>
        </div>

        {!mostrarAnulados && (
          <div>
            {informesActivos.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No hay informes activos</p>
            ) : (
              informesActivos.map(informe => (
                <div key={informe.id} style={listadoStyles.informeCard}>
                  <div style={listadoStyles.informeHeader}>
                    <strong>{informe.titulo}</strong>
                    <span style={listadoStyles.informeFecha}>{new Date(informe.creadoEn).toLocaleDateString()}</span>
                  </div>
                  {informe.descripcion && <div style={listadoStyles.informeDesc}>{informe.descripcion}</div>}
                  <div style={listadoStyles.informeActions}>
                    <button onClick={() => onVer(informe)} style={listadoStyles.btnVer}>👁️ Ver</button>
                    <button onClick={() => onEditar(informe)} style={listadoStyles.btnEditar}>✏️ Editar</button>
                    <button onClick={() => onAnular(informe.id)} style={listadoStyles.btnAnular}>🚫 Anular</button>
                    {mostrarEliminar && onEliminar && <button onClick={() => onEliminar(informe.id)} style={listadoStyles.btnEliminar}>🗑️ Eliminar</button>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mostrarAnulados && (
          <div>
            {informesAnulados.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No hay informes anulados</p>
            ) : (
              informesAnulados.map(informe => (
                <div key={informe.id} style={listadoStyles.informeCardAnulado}>
                  <div style={listadoStyles.informeHeader}>
                    <strong style={{ color: "#c53030", textDecoration: "line-through" }}>{informe.titulo}</strong>
                    <span style={listadoStyles.informeFecha}>{new Date(informe.creadoEn).toLocaleDateString()}</span>
                  </div>
                  {informe.descripcion && <div style={listadoStyles.informeDesc}>{informe.descripcion}</div>}
                  <div style={listadoStyles.informeActions}>
                    <button onClick={() => onVer(informe)} style={listadoStyles.btnVer}>👁️ Ver</button>
                    {mostrarEliminar && onEliminar && <button onClick={() => onEliminar(informe.id)} style={listadoStyles.btnEliminar}>🗑️ Eliminar</button>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <button onClick={onClose} style={listadoStyles.btnCerrar}>Cerrar</button>
      </div>
    </div>
  );
}
