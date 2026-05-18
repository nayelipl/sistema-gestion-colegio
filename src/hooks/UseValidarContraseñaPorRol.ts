import { useState } from "react";

interface ValidarContrasenaPorRolOptions {
  rol: string;
  mensaje?: string;
}

export function useValidarContrasenaPorRol() {
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validarContrasena = async (
    contrasena: string,
    options: ValidarContrasenaPorRolOptions
  ): Promise<boolean> => {
    setValidando(true);
    setError(null);

    try {
      const res = await fetch("/api/usuarios/validar-contrasena-por-rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrasena, rol: options.rol }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al validar la contraseña");
        return false;
      }

      return data.valido === true;
    } catch (error) {
      setError("Error de conexión al validar la contraseña");
      return false;
    } finally {
      setValidando(false);
    }
  };

  return {
    validarContrasena,
    validando,
    error,
    setError,
  };
}
