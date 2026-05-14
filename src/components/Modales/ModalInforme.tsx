// Modal para guardar un informe generado, solicitando un título y una descripción opcional.
// También se puede usar para editar un informe existente, precargando los datos actuales.
import React from "react";

interface ModalInformeProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  titulo: string;
  setTitulo: (value: string) => void;
  descripcion: string;
  setDescripcion: (value: string) => void;
  isEditing?: boolean;
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" as const, margin: "auto" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "4px" },
  input: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" as const },
  textarea: { width: "100%", padding: "9px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "13px", minHeight: "80px", marginBottom: "16px", boxSizing: "border-box" as const, fontFamily: "inherit" },
  buttons: { display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" },
  btnGuardar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
  btnCancelar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer" },
};

export function ModalInforme({
  isOpen,
  onClose,
  onSave,
  titulo,
  setTitulo,
  descripcion,
  setDescripcion,
  isEditing = false,
}: ModalInformeProps) {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3>{isEditing ? "Editar Informe" : "Guardar Informe"}</h3>
        
        <label style={modalStyles.label}>Título del informe</label>
        <input 
          type="text" 
          value={titulo} 
          onChange={(e) => setTitulo(e.target.value)} 
          style={modalStyles.input} 
          placeholder="Ej: Resumen de cuentas de marzo 2024"
        />
        
        <label style={modalStyles.label}>Descripción (opcional)</label>
        <textarea 
          value={descripcion} 
          onChange={(e) => setDescripcion(e.target.value)} 
          style={modalStyles.textarea} 
          placeholder="Detalles adicionales del informe..."
        />
        
        <div style={modalStyles.buttons}>
          <button onClick={onSave} style={modalStyles.btnGuardar}>Guardar</button>
          <button onClick={onClose} style={modalStyles.btnCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
