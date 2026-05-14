import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface InformeConfig {
  endpoint: string;
  dataSelector?: (data: any) => any;
  onLoad?: (data: any) => void;
}

export interface Informe {
  id: number;
  titulo: string;
  descripcion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tipo?: string;
  cuotasVencidas?: number;
  columnas?: any;
  totalPendiente?: number;
  totalCobrado?: number;
  datos?: any;
  anioEscolar?: string;
  creadoEn: string;
  anulado: boolean;
  creador?: {
    nombre: string;
    email: string;
  };
}

export function useInformes(config: InformeConfig) {
  const { data: session } = useSession();
  const [informes, setInformes] = useState<Informe[]>([]);
  const [anioEscolarActivo, setAnioEscolarActivo] = useState<string>("");
  const [mostrarModalGuardar, setMostrarModalGuardar] = useState(false);
  const [mostrarListado, setMostrarListado] = useState(false);
  const [informeEditando, setInformeEditando] = useState<Informe | null>(null);
  const [tituloInforme, setTituloInforme] = useState("");
  const [descripcionInforme, setDescripcionInforme] = useState("");

  const cargarInformes = useCallback(async () => {
    try {
      const res = await fetch(config.endpoint);
      const data = await res.json();
      setInformes(data.informes || []);
      setAnioEscolarActivo(data.anioEscolarActivo || "");
      if (config.onLoad) config.onLoad(data);
    } catch (error) {
      console.error("Error cargando informes:", error);
    }
  }, [config.endpoint, config.onLoad]);

  const guardarInforme = async (data: any) => {
    if (!tituloInforme.trim()) {
      throw new Error("Debe ingresar un título para el informe");
    }

    const usuarioId = (session?.user as any)?.id;

    const informeData = {
      titulo: tituloInforme,
      descripcion: descripcionInforme,
      ...data,
      creadoPor: (session?.user as any)?.id,
    };

    const url = informeEditando 
      ? `${config.endpoint}/${informeEditando.id}`
      : config.endpoint;
    
    const method = informeEditando ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(informeData),
    });
    
    if (!res.ok) throw new Error("Error al guardar el informe");
    
    setMostrarModalGuardar(false);
    setTituloInforme("");
    setDescripcionInforme("");
    setInformeEditando(null);
    cargarInformes();
    
    return await res.json();
  };

  const anularInforme = async (id: number, setExito?: (msg: string)  => void) => {
    if (!confirm("¿Está seguro de anular este informe? Quedará registrado como anulado")) return;
    
    try {
      const res = await fetch(`${config.endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anulado: true }),
      });
      
      if (res.ok) {
        const data = await res.json();
        cargarInformes();

      } else {
        const error = await res.json();
        throw new Error(error.error || "Error al anular el informe");
      }
    } catch (error) {
      console.error("Error anulando informe:", error);
      throw error;
    }
  };

  const eliminarInforme = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar permanentemente este informe? Esta acción no se puede deshacer")) return;
    
    const res = await fetch(`${config.endpoint}/${id}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      cargarInformes();
    }
  };

  const editarInforme = (informe: Informe) => {
    setInformeEditando(informe);
    setTituloInforme(informe.titulo);
    setDescripcionInforme(informe.descripcion || "");
    setMostrarModalGuardar(true);
    setMostrarListado(false);
  };

  useEffect(() => {
    cargarInformes();
  }, [cargarInformes]);

  return {
    informes,
    anioEscolarActivo,
    mostrarModalGuardar,
    mostrarListado,
    informeEditando,
    tituloInforme,
    descripcionInforme,
    setMostrarModalGuardar,
    setMostrarListado,
    setTituloInforme,
    setDescripcionInforme,
    setInformeEditando,
    guardarInforme,
    anularInforme,
    eliminarInforme,
    editarInforme,
    cargarInformes,
  };
}
