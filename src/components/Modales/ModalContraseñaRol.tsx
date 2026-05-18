// Modal para solicitar la contraseña de un rol específico (Contador, Director, etc.) 
// antes de realizar una acción sensible (anular recibo, eliminar cuenta por cobrar, etc.).
// Recibe el rol requerido, la acción que se va a realizar y una función de confirmación 
// que se ejecuta si la contraseña es correcta.
import React, { useState, useEffect } from "react";

interface ModalContrasenaRolProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contrasena: string) => void;
  rol: string;
  accion: string;
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90%", },
  titulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", marginBottom: "16px", },
  label: { fontSize: "13px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "4px", },
  input: {width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" },
  buttons: { display: "flex", gap: "12px", justifyContent: "flex-end", },
  btnConfirmar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", },
  btnCancelar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 16px", cursor: "pointer", },
  error: { color: "#c53030", fontSize: "12px", marginBottom: "12px", textAlign: "center", },
};

export function ModalContrasenaRol({
  isOpen,
  onClose,
  onConfirm,
  rol,
  accion,
}: ModalContrasenaRolProps) {
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setContrasena("");
      setError("");
      setCargando(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!contrasena.trim()) {
      setError("Debe ingresar la contraseña");
      return;
    }

    setError("");
    setCargando(true);

    try {
      const res = await fetch("/api/usuarios/validar-contrasena-por-rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrasena, rol }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al validar la contraseña");
        setIntentos(intentos + 1);
        setContrasena("");
        return;
      }

      if (data.valido) {
        onConfirm(contrasena);
        setContrasena("");
        setIntentos(0);
        onClose();
      } else {
        setError("Contraseña incorrecta");
        setIntentos(intentos + 1);
        setContrasena("");
      }
    } catch (error) {
      setError("Error al validar la contraseña");
    } finally {
      setCargando(false);
    }
  };

  const rolTexto = rol === "CONTADOR" ? "Contador" : rol;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={modalStyles.titulo}>🔐 Autorización requerida</h3>
        <p style={{ fontSize: "13px", marginBottom: "16px", color: "#666" }}>
          Para <strong>{accion}</strong>, debe ingresar la contraseña del <strong>{rolTexto}</strong>.
          {intentos > 0 && (
            <span style={{ color: "#e53e3e", display: "block", marginTop: "8px" }}>
              Intento fallido #{intentos}
            </span>
          )}
        </p>
        <label style={modalStyles.label}>Contraseña del {rolTexto}</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          style={modalStyles.input}
          placeholder={`Ingrese la contraseña del ${rolTexto}`}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
        />
        {error && <div style={modalStyles.error}>❌ {error}</div>}
        <div style={modalStyles.buttons}>
          <button onClick={onClose} style={modalStyles.btnCancelar} disabled={cargando}>
            Cancelar
          </button>
          <button onClick={handleConfirm} style={modalStyles.btnConfirmar} disabled={cargando}>
            {cargando ? "Validando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
