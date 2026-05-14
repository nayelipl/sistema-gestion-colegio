// Modal para mostrar un listado de informes guardados, con opciones para ver, editar, anular o eliminar cada informe.
import React from "react";
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
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "700px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" as const, },
  informeCard: { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "12px", },
  informeHeader: { display: "flex", justifyContent: "space-between", marginBottom: "8px", },
  informeFecha: { fontSize: "11px", color: "#666", },
  informeDesc: { fontSize: "12px", color: "#666", marginBottom: "8px", },
  informeActions: { display: "flex", gap: "8px", marginTop: "8px", },
  btnVer: { background: "#4299e1", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", },
  btnEditar: { background: "#ed8936", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", },
  btnAnular: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", },
  btnEliminar: { background: "#c53030", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", },
  btnCerrar: { background: "#718096", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", marginTop: "16px", width: "100%", },
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
  if (!isOpen) return null;

  const informesNoAnulados = informes.filter(i => !i.anulado);

  return (
    <div style={listadoStyles.overlay}>
      <div style={listadoStyles.modal}>
        <h3>📊 Informes Guardados</h3>
        <div>
          {informesNoAnulados.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
              No hay informes guardados
            </p>
          ) : (
            informesNoAnulados.map(informe => (
              <div key={informe.id} style={listadoStyles.informeCard}>
                <div style={listadoStyles.informeHeader}>
                  <strong style={{
                    color: informe.anulado ? "#e53e3e" : "#333",
                    textDecoration: informe.anulado ? "line-through" : "none"
                }}>
                    {informe.titulo}
                </strong>
                  <span style={listadoStyles.informeFecha}>
                    {new Date(informe.creadoEn).toLocaleDateString()}
                  </span>
                </div>
                {informe.descripcion && (
                  <div style={listadoStyles.informeDesc}>{informe.descripcion}</div>
                )}
                <div style={listadoStyles.informeActions}>
                  <button onClick={() => onVer(informe)} style={listadoStyles.btnVer}>
                    👁️ Ver
                  </button>
                  <button onClick={() => onEditar(informe)} style={listadoStyles.btnEditar}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => onAnular(informe.id)} style={listadoStyles.btnAnular}>
                    🚫 Anular
                  </button>
                  {mostrarEliminar && onEliminar && (
                    <button onClick={() => onEliminar(informe.id)} style={listadoStyles.btnEliminar}>
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} style={listadoStyles.btnCerrar}>Cerrar</button>
      </div>
    </div>
  );
}
