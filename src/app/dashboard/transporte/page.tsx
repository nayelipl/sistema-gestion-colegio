"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";
import { formatFechaLarga, formatFechaLocal } from "@/lib/formatear-fecha";
import NavBar from "@/components/NavBar";

type Tab = "rutas" | "estudiantes";

interface Ruta {
  id: number;
  nombre: string;
  descripcion: string | null;
  horarioRecogida: string;
  horarioRegreso: string | null;
  puntosRecorrido: any[];
  conductor: string | null;
  telefonoConductor: string | null;
  capacidad: number;
  activo: boolean;
  asignaciones?: any[];
  creadoEn: string;
}

interface Estudiante {
  id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  grado: string;
  direccion: string;
  tutor?: {
    id: number;
    codigo: string;
    nombre: string;
    apellido: string;
    celular?: string;
    email: string;
  };
}

interface Vinculacion {
  id: number;
  cargoNo: string;
  estudianteId: number;
  tutorId: number;
  tipo: string;
  valorCuota: number;
  duracionMeses: number;
  montoTotal: number;
  fechaInicio: string;
  estado: string;
  observaciones: string | null;
  estudiante?: {
    id: number;
    codigo: string;
    nombre: string;
    apellido: string;
    tutor?: {
      id: number;
      nombre: string;
      apellido: string;
      cuentaNo: string;
    };
  };
  tutor?: {
    id: number;
    nombre: string;
    apellido: string;
    cuentaNo: string;
  };
}

// Tipo para el servicio de transporte (facturación)
interface ServicioTransporte {
  id: number;
  cargoNo: string;
  estudianteId: number;
  tutorId: number;
  tipo: "COMPLETO" | "MEDIO (RECOGER)" | "MEDIO (LLEVAR)";
  valor: number;
  duracion: number;
  inscripcion: number;
  valorAnual: number;
  inicio: string;
  concepto: string;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "CANCELADO";
  observaciones: string;
  estudiante?: Estudiante;
  tutor?: {
    id: number;
    nombre: string;
    apellido: string;
    cuentaNo: string;
  };
}

export default function TransportePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Tabs
  const [tab, setTab] = useState<Tab>("rutas");

  // Estado para Rutas
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [puntosRecorrido, setPuntosRecorrido] = useState<any[]>([]);
  const [nuevoPunto, setNuevoPunto] = useState({ calle: '', numero: '', sector: '', referencia: '' });
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Estado para Vinculaciones (servicios activos)
  const [vinculaciones, setVinculaciones] = useState<Vinculacion[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    cancelados: 0,
    montoTotal: 0,
  });
  const [filtroEstadoForm, setFiltroEstadoForm] = useState("TODOS");
  const [filtroTipoForm, setFiltroTipoForm] = useState("TODOS");
  const [filtroEstadoActivo, setFiltroEstadoActivo] = useState("TODOS");
  const [filtroTipoActivo, setFiltroTipoActivo] = useState("TODOS");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVinculacion, setSelectedVinculacion] = useState<Vinculacion | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [fechaCancelacion, setFechaCancelacion] = useState("");
  const [cargandoVinculaciones, setCargandoVinculaciones] = useState(true);

  // Estado para Vincular (nuevo servicio)
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [formServicio, setFormServicio] = useState<Partial<ServicioTransporte>>({
    tipo: undefined,
    valor: 0,
    duracion: 10,
    inscripcion: 0,
    estado: "ACTIVO",
    observaciones: ""
  });
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
  const [tarifaTransporte, setTarifaTransporte] = useState(0);
  const [rutasDisponibles, setRutasDisponibles] = useState<Ruta[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null);
  const [cargandoVincular, setCargandoVincular] = useState(false);
  const [errorVincular, setErrorVincular] = useState("");
  const [exitoVincular, setExitoVincular] = useState("");

  // Estados para navegación por año escolar
  const [aniosEscolares, setAniosEscolares] = useState<string[]>([]);
  const [anioEscolarIndex, setAnioEscolarIndex] = useState(0);
  const [cargandoAnios, setCargandoAnios] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  // Verificar autenticación
  useEffect(() => {
    if (exitoVincular || mensaje) {
      const timer = setTimeout(() => {
        setExitoVincular("");
        setMensaje("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [exitoVincular, mensaje]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Verificar permisos y cargar datos iniciales
  useEffect(() => {
    if (status !== "authenticated") return;
    if (rol !== "ADMINISTRADOR" && rol !== "CONTADOR" && rol !== "CAJERO") {
      router.push("/dashboard");
      return;
    }
    cargarRutas();
    cargarVinculaciones();
    cargarTarifa();
    cargarRutasDisponibles();
    cargarAniosEscolares();
  }, [status, rol]);

  useEffect(() => {
    if (status === "authenticated" && aniosEscolares.length > 0) {
      cargarVinculacionesConFiltros(filtroEstadoActivo, filtroTipoActivo);
    }
  }, [anioEscolarIndex, aniosEscolares]);

  // Funciones de rutas
  const cargarRutas = async () => {
    setCargandoRutas(true);
    setError("");
    try {
      const res = await fetch("/api/transporte/rutas");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRutas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando rutas:", err);
      setError("Error al cargar las rutas");
      setRutas([]);
    } finally {
      setCargandoRutas(false);
    }
  };

  const cargarRutasDisponibles = async () => {
    try {
      const res = await fetch("/api/transporte/rutas");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRutasDisponibles(Array.isArray(data) ? data.filter((r: Ruta) => r.activo) : []);
    } catch (err) {
      console.error("Error cargando rutas disponibles:", err);
    }
  };

  const cargarTarifa = async () => {
    try {
      const res = await fetch("/api/administracion/tarifas/activas");
      const data = await res.json();
      if (res.ok && data.tarifaActiva) {
        const tarifaTransporteData = data.tarifaActiva.tarifasTransporte?.find((t: any) => t.tipo === "COMPLETO");
        if (tarifaTransporteData) {
          const valorAnual = Number(tarifaTransporteData.valorAnual);
          setTarifaTransporte(valorAnual);
          console.log("Tarifa transporte cargada:", valorAnual);
        }
      }
    } catch (err) {
      console.error("Error cargando tarifa:", err);
    }
  };

  const cargarAniosEscolares = async () => {
    setCargandoAnios(true);
    try {
      const res = await fetch("/api/transporte/anios-escolares");
      const data = await res.json();
      setAniosEscolares(data.anios || []);
      if (data.anios && data.anios.length > 0) {
        setAnioEscolarIndex(0);
      }
    } catch (err) {
      console.error("Error cargando años escolares:", err);
    } finally {
      setCargandoAnios(false);
    }
  };

  const navegarAnio = (direccion: "anterior" | "siguiente" | "primero" | "ultimo") => {
    if (aniosEscolares.length === 0) return;
    
    let nuevoIndex = anioEscolarIndex;
    switch (direccion) {
      case "primero":
        nuevoIndex = 0;
        break;
      case "anterior":
        nuevoIndex = Math.max(0, anioEscolarIndex - 1);
        break;
      case "siguiente":
        nuevoIndex = Math.min(aniosEscolares.length - 1, anioEscolarIndex + 1);
        break;
      case "ultimo":
        nuevoIndex = aniosEscolares.length - 1;
        break;
    }
    
    if (nuevoIndex !== anioEscolarIndex) {
      setAnioEscolarIndex(nuevoIndex);
      cargarVinculacionesPorAnio(aniosEscolares[nuevoIndex]);
    }
  };

  const crearRuta = async (formData: FormData) => {
    setError("");
    setMensaje("");
    setCargandoRutas(true);
    try {
      const res = await fetch("/api/transporte/rutas", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje("Ruta creada exitosamente");
        await cargarRutas();
        await cargarRutasDisponibles();
        setShowModal(false);
        setPuntosRecorrido([]);
        setSelectedRuta(null);
      } else {
        setError(data.error || "Error al crear ruta");
      }
    } catch (err) {
      setError("Error de conexión al crear la ruta");
    } finally {
      setCargandoRutas(false);
    }
  };

  const actualizarRuta = async (id: number, formData: FormData) => {
    setError("");
    setMensaje("");
    setCargandoRutas(true);
    try {
      const res = await fetch(`/api/transporte/rutas/${id}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje("Ruta actualizada exitosamente");
        await cargarRutas();
        await cargarRutasDisponibles();
        setShowModal(false);
        setSelectedRuta(null);
        setPuntosRecorrido([]);
      } else {
        setError(data.error || "Error al actualizar ruta");
      }
    } catch (err) {
      setError("Error de conexión al actualizar la ruta");
    } finally {
      setCargandoRutas(false);
    }
  };

  const activarRuta = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/transporte/rutas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(data.mensaje || "Ruta activada");
        await cargarRutas();
        await cargarRutasDisponibles();
      } else {
        setError(data.error || "Error al activar ruta");
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  const desactivarRuta = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/transporte/rutas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(data.mensaje || "Ruta desactivada");
        await cargarRutas();
        await cargarRutasDisponibles();
      } else {
        setError(data.error || "Error al desactivar ruta");
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  const eliminarRutaPermanente = async (id: number) => {
    if (!confirm("¿Eliminar permanentemente esta ruta? Esta acción no se puede deshacer.")) return;
    setError("");
    try {
      const res = await fetch(`/api/transporte/rutas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMensaje(data.mensaje || "Ruta eliminada");
        await cargarRutas();
        await cargarRutasDisponibles();
      } else {
        setError(data.error || "Error al eliminar ruta");
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  const agregarPunto = () => {
    if (nuevoPunto.calle && nuevoPunto.sector) {
      setPuntosRecorrido([...puntosRecorrido, { ...nuevoPunto }]);
      setNuevoPunto({ calle: '', numero: '', sector: '', referencia: '' });
    }
  };

  // Funciones de vinculaciones (servicios activos)
  const cargarVinculaciones = async () => {
    setCargandoVinculaciones(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroEstadoActivo !== "TODOS") params.append("estado", filtroEstadoActivo);
      if (filtroTipoActivo !== "TODOS") params.append("tipo", filtroTipoActivo);
      if (aniosEscolares[anioEscolarIndex]) params.append("anioEscolar", aniosEscolares[anioEscolarIndex]);

      console.log("URL de petición:", `/api/transporte/vinculaciones?${params.toString()}`);

      const res = await fetch(`/api/transporte/vinculaciones?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      console.log("Tipos de vinculaciones:", vinculaciones.map(v => v.tipo));

      setVinculaciones(data.vinculaciones || []);

      setEstadisticas(data.estadisticas || {
        total: 0,
        activos: 0,
        suspendidos: 0,
        cancelados: 0,
        montoTotal: 0,
      });
    } catch (err) {
      console.error("Error cargando vinculaciones:", err);
      setError("Error al cargar los servicios de transporte");
      setVinculaciones([]);
    } finally {
      setCargandoVinculaciones(false);
    }
  };

  const cargarVinculacionesPorAnio = async (anioEscolar: string) => {
    setCargandoVinculaciones(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroEstadoForm !== "TODOS") params.append("estado", filtroEstadoForm);
      if (filtroTipoForm !== "TODOS") params.append("tipo", filtroTipoForm);
      if (anioEscolar) params.append("anioEscolar", anioEscolar);

      const res = await fetch(`/api/transporte/vinculaciones?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setVinculaciones(data.vinculaciones || []);
      setEstadisticas(data.estadisticas || {
        total: 0,
        activos: 0,
        suspendidos: 0,
        cancelados: 0,
        montoTotal: 0,
      });
    } catch (err) {
      console.error("Error cargando vinculaciones:", err);
      setError("Error al cargar los servicios de transporte");
      setVinculaciones([]);
    } finally {
      setCargandoVinculaciones(false);
    }
  };

  const cambiarEstadoVinculacion = async () => {
    if (!selectedVinculacion) return;

    const payload: any = { estado: nuevoEstado };
    if (nuevoEstado === "CANCELADO" && fechaCancelacion) {
      payload.fechaCancelacion = fechaCancelacion;
    }

    setError("");
    try {
      const res = await fetch(`/api/transporte/vinculaciones/${selectedVinculacion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cambiar estado");
      } else {
        setMensaje(data.mensaje || "Estado actualizado");
        cargarVinculacionesConFiltros(filtroEstadoActivo, filtroTipoActivo);
        setModalVisible(false);
        setSelectedVinculacion(null);
        setNuevoEstado("");
        setFechaCancelacion("");
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  // Funciones para vincular estudiante
  const cargarEstudiantes = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) return [];
    
    try {
      const res = await fetch(`/api/usuarios/estudiantes/buscar?q=${encodeURIComponent(inputValue)}&tipo=matriculados`);
      const data = await res.json();
      if (!res.ok) return [];
      
      return data.map((item: any) => ({
        value: item.estudiante.id,
        label: `${item.estudiante.codigo} - ${item.estudiante.nombre} ${item.estudiante.apellido}`,
        estudiante: item.estudiante,
        tutor: item.estudiante.tutor
      }));
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      return [];
    }
  };

  const handleEstudianteChange = (option: any) => {
    if (option) {
      setEstudianteSeleccionado(option);
      setErrorVincular("");
    } else {
      setEstudianteSeleccionado(null);
    }
  };

  const handleTipoChange = (tipo: string) => {
    if (!tipo) {
      setFormServicio(prev => ({
        ...prev,
        tipo: undefined,
        valor: 0,
        valorAnual: 0
      }));
      return;
    }

    // Asegurar que tarifaTransporte tiene un valor
    if (tarifaTransporte === 0) {
      setErrorVincular("Error: No se pudo cargar la tarifa de transporte. Recargue la página.");
      return;
    }

    let valorAnual = 0;
    let valorCuota = 0;
    
    // Calcular según el tipo
    if (tipo === "COMPLETO") {
      valorAnual = tarifaTransporte;
    } else if (tipo === "MEDIO_RECOGER" || tipo === "MEDIO_LLEVAR") {
      valorAnual = tarifaTransporte / 2;
    } else if (tipo === "MEDIO (RECOGER)" || tipo === "MEDIO (LLEVAR)") {
      valorAnual = tarifaTransporte / 2;
    }
    
    // Calcular valor por cuota (dividir entre duración actual)
    const duracion = formServicio.duracion || 10;
    valorCuota = valorAnual / duracion;
    
    setFormServicio(prev => ({
      ...prev,
      tipo: tipo as "COMPLETO" | "MEDIO (RECOGER)" | "MEDIO (LLEVAR)",
      valor: valorCuota,
      valorAnual: valorAnual
    }));
  };

  const getConcepto = (tipo: string) => {
    switch (tipo) {
      case "COMPLETO": return "FACTURACIÓN SERVICIO TRANSPORTE COMPLETO";
      case "MEDIO (RECOGER)": return "FACTURACIÓN SERVICIO ½ TRANSPORTE (RECOGER)";
      case "MEDIO (LLEVAR)": return "FACTURACIÓN SERVICIO ½ TRANSPORTE (LLEVAR)";
      default: return "";
    }
  };

  const limpiarFormularioVincular = () => {
    setEstudianteSeleccionado(null);
    setRutaSeleccionada(null);
    setFormServicio({
      tipo: undefined,
      valor: tarifaTransporte / 10,
      duracion: 10,
      inscripcion: 0,
      estado: "ACTIVO",
      observaciones: ""
    });
    setErrorVincular("");
    setExitoVincular("");
  };

  const guardarServicioTransporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteSeleccionado) {
      setErrorVincular("Debe seleccionar un estudiante");
      return;
    }

    if (!formServicio.tipo) {
      setErrorVincular("Debe seleccionar un tipo de transporte");
      return;
    }

    setErrorVincular("");
    setExitoVincular("");
    setCargandoVincular(true);

    const fechaInicioStr = formatFechaLocal(new Date());
    const { fechaDesde: fechaInicioAjustada } = ajustarFechasAPI(fechaInicioStr, undefined);
    const fechaInicio = fechaInicioAjustada || new Date();

    const servicioData = {
      estudianteId: estudianteSeleccionado.value,
      tipo: formServicio.tipo,
      valor: formServicio.valor,
      duracion: formServicio.duracion,
      inscripcion: formServicio.inscripcion || 0,
      valorAnual: formServicio.valorAnual,
      fechaInicioStr: formatFechaLocal(new Date()),
      concepto: getConcepto(formServicio.tipo || "COMPLETO"),
      estado: "ACTIVO",
      observaciones: formServicio.observaciones,
      rutaId: rutaSeleccionada
    };

    try {
      const res = await fetch("/api/transporte/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicioData),
      });

      const data = await res.json();
      if (res.ok) {
        setExitoVincular(`✅ Servicio de transporte registrado. ${data.mensaje || ""}`);
        limpiarFormularioVincular();
        cargarVinculaciones();
        setShowVincularModal(false);
      } else {
        setErrorVincular(data.error || "Error al registrar servicio");
      }
    } catch (err) {
      setErrorVincular("Error de conexión al registrar el servicio");
    } finally {
      setCargandoVincular(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "ACTIVO": return <span style={s.badgeActivo}>✅ ACTIVO</span>;
      case "SUSPENDIDO": return <span style={s.badgeSuspendido}>⏸️ SUSPENDIDO</span>;
      case "CANCELADO": return <span style={s.badgeCancelado}>❌ CANCELADO</span>;
      default: return <span>{estado}</span>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "COMPLETO": return "🚌 Transporte Completo";
      case "MEDIO (RECOGER)": return "🚐 ½ Transporte (Recoger)";
      case "MEDIO (LLEVAR)": return "🚐 ½ Transporte (Llevar)";
      default: return tipo;
    }
  };

  const aplicarFiltros = () => {
    
    console.log("Filtro estado seleccionado:", filtroEstadoForm);
    console.log("Filtro tipo seleccionado:", filtroTipoForm);
    
    // Normalizar los valores antes de enviar a la API
    let estadoNormalizado = filtroEstadoForm;
    let tipoNormalizado = filtroTipoForm;

    // Asegurar que los estados estén en mayúsculas como espera la API
    if (estadoNormalizado !== "TODOS") {
      estadoNormalizado = estadoNormalizado.toUpperCase();
    }
    
    console.log("Estado normalizado:", estadoNormalizado);
    console.log("Tipo normalizado:", tipoNormalizado);

    // Actualizar los filtros activos con los valores del formulario
    setFiltroEstadoActivo(estadoNormalizado);
    setFiltroTipoActivo(tipoNormalizado);
    
    // Pasar los valores directamente a la función
    cargarVinculacionesConFiltros(estadoNormalizado, tipoNormalizado);
  };

  // Función que recibe los filtros como parámetros
  const cargarVinculacionesConFiltros = async (estado: string, tipo: string) => {
    setCargandoVinculaciones(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (estado !== "TODOS") params.append("estado", estado);
      if (tipo !== "TODOS") params.append("tipo", tipo);
      if (aniosEscolares[anioEscolarIndex]) params.append("anioEscolar", aniosEscolares[anioEscolarIndex]);

      console.log("URL de petición:", `/api/transporte/vinculaciones?${params.toString()}`);

      const res = await fetch(`/api/transporte/vinculaciones?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setVinculaciones(data.vinculaciones || []);
      setEstadisticas(data.estadisticas || {
        total: 0,
        activos: 0,
        suspendidos: 0,
        cancelados: 0,
        montoTotal: 0,
      });
    } catch (err) {
      console.error("Error cargando vinculaciones:", err);
      setError("Error al cargar los servicios de transporte");
      setVinculaciones([]);
    } finally {
      setCargandoVinculaciones(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroEstadoForm("TODOS");
    setFiltroTipoForm("TODOS");
    setFiltroEstadoActivo("TODOS");
    setFiltroTipoActivo("TODOS");
    cargarVinculacionesConFiltros("TODOS", "TODOS");
  };

  const formatMonto = (monto: any): string => {
    // Convertir a número si es necesario
    const numero = typeof monto === 'number' ? monto : parseFloat(monto);
    // Verificar si es un número válido
    if (isNaN(numero)) {
      console.warn("formatMonto recibió valor inválido:", monto);
      return "RD$0.00";
    }
    return `RD$${numero.toFixed(2)}`;
  };

  if (status === "loading") return <div style={s.loading}>Verificando autenticación...</div>;
  if (status === "unauthenticated") return null;
  if (rol !== "ADMINISTRADOR" && rol !== "CONTADOR" && rol !== "CAJERO") {
    return (
      <div style={s.sinAcceso}>
        <p>🚫 No tienes permiso para acceder a esta sección.</p>
        <Link href="/dashboard" style={s.enlace}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <main style={s.main}>
      <NavBar titulo="Gestión de Transporte" icono="🚌" userName={session?.user?.name} />      <div style={s.contenido}>
        <div style={s.header}>
          <div>
            <h1 style={s.titulo}>Transporte Escolar</h1>
            <p style={s.subtitulo}>Gestión de rutas y servicios de transporte</p>
          </div>
          {tab === "rutas" && (
            <button onClick={() => setShowModal(true)} style={s.btnPrimary}>
              + Nueva Ruta
            </button>
          )}
          {tab === "estudiantes" && (
            <button onClick={() => setShowVincularModal(true)} style={s.btnPrimary}>
              + Vincular Estudiante
            </button>
          )}
        </div>

        {mensaje && <div style={s.exitoMsg}>✅ {mensaje}</div>}
        {(error || errorVincular) && <div style={s.errorMsg}>❌ {error || errorVincular}</div>}
        {exitoVincular && <div style={s.exitoMsg}>✅ {exitoVincular}</div>}

        <div style={s.tabs}>
          {([
            { key: "rutas", label: `🚌 Rutas (${rutas.length})` },
            { key: "estudiantes", label: `👨‍🎓 Servicios Activos (${vinculaciones.filter(v => v.estado === "ACTIVO").length})` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ ...s.tab, ...(tab === t.key ? s.tabActivo : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PESTAÑA RUTAS */}
        {tab === "rutas" && (
          <>
            {cargandoRutas ? (
              <div style={s.loadingSmall}>Cargando rutas...</div>
            ) : rutas.length === 0 ? (
              <div style={s.vacio}>
                <p>No hay rutas creadas. Haz clic en "Nueva Ruta" para comenzar.</p>
              </div>
            ) : (
              <div style={s.rutasGrid}>
                {rutas.map((ruta) => (
                  <div key={ruta.id} style={{ ...s.rutaCard, ...(!ruta.activo ? s.rutaInactiva : {}) }}>
                    <div style={s.rutaHeader}>
                      <div>
                        <h3 style={s.rutaNombre}>{ruta.nombre}</h3>
                        {!ruta.activo && <span style={s.badgeInactivo}>INACTIVA</span>}
                      </div>
                      <div style={s.rutaAcciones}>
                        <button
                          onClick={() => {
                            setSelectedRuta(ruta);
                            setPuntosRecorrido(ruta.puntosRecorrido || []);
                            setShowModal(true);
                          }}
                          style={s.btnEditar}
                        >
                          Editar
                        </button>
                        {ruta.activo ? (
                          <button onClick={() => desactivarRuta(ruta.id)} style={s.btnDesactivar}>
                            Desactivar
                          </button>
                        ) : (
                          <button onClick={() => activarRuta(ruta.id)} style={s.btnActivar}>
                            Activar
                          </button>
                        )}
                        <button onClick={() => eliminarRutaPermanente(ruta.id)} style={s.btnEliminar}>
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <p style={s.rutaDescripcion}>{ruta.descripcion || "Sin descripción"}</p>

                    <div style={s.rutaDetalles}>
                      <span>🕐 Recogida: {ruta.horarioRecogida}</span>
                      {ruta.horarioRegreso && <span>🕔 Regreso: {ruta.horarioRegreso}</span>}
                      <span>👨‍✈️ Conductor: {ruta.conductor || "N/A"}</span>
                      <span>📞 Teléfono: {ruta.telefonoConductor || "N/A"}</span>
                      <span>💺 Capacidad: {ruta.capacidad}</span>
                    </div>

                    {ruta.puntosRecorrido && Array.isArray(ruta.puntosRecorrido) && ruta.puntosRecorrido.length > 0 && (
                      <div style={s.puntosRecorrido}>
                        <strong>📍 Puntos de recogida:</strong>
                        <div style={s.puntosLista}>
                          {ruta.puntosRecorrido.map((punto: any, idx: number) => (
                            <span key={idx} style={s.puntoTag}>
                              {punto.calle} #{punto.numero}, {punto.sector}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {ruta.asignaciones && ruta.asignaciones.length > 0 && (
                      <div style={s.estudiantesAsignados}>
                        <strong>🎒 Estudiantes asignados ({ruta.asignaciones.length}/{ruta.capacidad}):</strong>
                        <div style={s.estudiantesLista}>
                          {ruta.asignaciones.map((asig: any) => (
                            <span key={asig.id} style={s.estudianteTag}>
                              {asig.estudiante?.nombre} {asig.estudiante?.apellido}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PESTAÑA ESTUDIANTES (Servicios Activos) */}
        {tab === "estudiantes" && (
          <div>
            <div style={s.statsContainer}>
              <div style={s.statCard}><strong>Total:</strong> {estadisticas.total}</div>
              <div style={s.statCardActivo}><strong>Activos:</strong> {estadisticas.activos}</div>
              <div style={s.statCardSuspendido}><strong>Suspendidos:</strong> {estadisticas.suspendidos}</div>
              <div style={s.statCardCancelado}><strong>Cancelados:</strong> {estadisticas.cancelados}</div>
              <div style={s.statCardMonto}><strong>Monto total:</strong> {formatMonto(estadisticas.montoTotal || 0)}</div>
            </div>

            <div style={s.filtrosContainer}>
              <div>
                <label style={s.label}>Estado:</label>
                <select value={filtroEstadoForm} onChange={(e) => setFiltroEstadoForm(e.target.value)} style={s.inputSmall}>
                  <option value="TODOS">Todos</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="SUSPENDIDO">Suspendidos</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Tipo:</label>
                <select value={filtroTipoForm} onChange={(e) => setFiltroTipoForm(e.target.value)} style={s.inputSmall}>
                  <option value="TODOS">Todos</option>
                  <option value="COMPLETO">Transporte Completo</option>
                  <option value="MEDIO (RECOGER)">½ Transporte (Recoger)</option>
                  <option value="MEDIO (LLEVAR)">½ Transporte (Llevar)</option>
                </select>
              </div>
              <button onClick={aplicarFiltros} style={s.btnFiltrar}>🔍 Filtrar</button>
              <button onClick={limpiarFiltros} style={s.btnLimpiar}>🧹 Limpiar Filtros</button>
            </div>

            {cargandoVinculaciones ? (
              <div style={s.loadingSmall}>Cargando servicios...</div>
            ) : vinculaciones.length === 0 ? (
              <div style={s.vacio}>No hay servicios de transporte registrados para el año {aniosEscolares[anioEscolarIndex]}</div>
            ) : (
              <>
                {/* Tabla de Transporte Completo */}
                <h3 style={s.subtituloTabla}>🚌 Transporte Completo</h3>
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead>
                      <tr style={s.thead}>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Tutor</th>
                        <th style={s.th}>Tipo</th>
                        <th style={s.th}>Valor</th>
                        <th style={s.th}>Inicio</th>
                        <th style={s.th}>Estado</th>
                        <th style={s.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vinculaciones.filter(v => v.tipo === "COMPLETO").map((v) => (
                        <tr key={v.id}>
                          <td style={s.td}>
                            {v.estudiante?.nombre} {v.estudiante?.apellido}<br />
                            <small style={{ color: "#888" }}>{v.estudiante?.codigo}</small>
                          </td>
                          <td style={s.td}>
                            {v.tutor?.nombre} {v.tutor?.apellido}<br />
                            <small style={{ color: "#888" }}>Cuenta: {v.tutor?.cuentaNo}</small>
                          </td>
                          <td style={s.td}>{getTipoLabel(v.tipo)}</td>
                          <td style={s.td}>{formatMonto(Number(v.montoTotal))}</td>
                          <td style={s.td}>{formatFechaLarga(v.fechaInicio)}</td>
                          <td style={s.td}>{getEstadoBadge(v.estado)}</td>
                          <td style={s.td}>
                            <button
                              onClick={() => {
                                setSelectedVinculacion(v);
                                setNuevoEstado(v.estado);
                                setModalVisible(true);
                              }}
                              style={s.btnEditar}
                            >
                              Cambiar Estado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tabla de ½ Transporte (Recoger) */}
                <h3 style={s.subtituloTabla}>🚐 ½ Transporte (Recoger)</h3>
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead>
                      <tr style={s.thead}>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Tutor</th>
                        <th style={s.th}>Valor</th>
                        <th style={s.th}>Inicio</th>
                        <th style={s.th}>Estado</th>
                        <th style={s.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vinculaciones.filter(v => v.tipo === "MEDIO (RECOGER)").map((v) => (
                        <tr key={v.id}>
                          <td style={s.td}>
                            {v.estudiante?.nombre} {v.estudiante?.apellido}<br />
                            <small style={{ color: "#888" }}>{v.estudiante?.codigo}</small>
                          </td>
                          <td style={s.td}>
                            {v.tutor?.nombre} {v.tutor?.apellido}
                          </td>
                          <td style={s.td}>{formatMonto(Number(v.montoTotal))}</td>
                          <td style={s.td}>{formatFechaLarga(v.fechaInicio)}</td>
                          <td style={s.td}>{getEstadoBadge(v.estado)}</td>
                          <td style={s.td}>
                            <button onClick={() => {
                              setSelectedVinculacion(v);
                              setNuevoEstado(v.estado);
                              setModalVisible(true);
                            }} style={s.btnEditar}>Cambiar Estado</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tabla de ½ Transporte (Llevar) */}
                <h3 style={s.subtituloTabla}>🚐 ½ Transporte (Llevar)</h3>
                <div style={s.tablaWrap}>
                  <table style={s.tabla}>
                    <thead>
                      <tr style={s.thead}>
                        <th style={s.th}>Estudiante</th>
                        <th style={s.th}>Tutor</th>
                        <th style={s.th}>Valor</th>
                        <th style={s.th}>Inicio</th>
                        <th style={s.th}>Estado</th>
                        <th style={s.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vinculaciones.filter(v => v.tipo === "MEDIO (LLEVAR)").map((v) => (
                        <tr key={v.id}>
                          <td style={s.td}>
                            {v.estudiante?.nombre} {v.estudiante?.apellido}<br />
                            <small style={{ color: "#888" }}>{v.estudiante?.codigo}</small>
                          </td>
                          <td style={s.td}>
                            {v.tutor?.nombre} {v.tutor?.apellido}
                          </td>
                          <td style={s.td}>{formatMonto(Number(v.montoTotal))}</td>
                          <td style={s.td}>{formatFechaLarga(v.fechaInicio)}</td>
                          <td style={s.td}>{getEstadoBadge(v.estado)}</td>
                          <td style={s.td}>
                            <button onClick={() => {
                              setSelectedVinculacion(v);
                              setNuevoEstado(v.estado);
                              setModalVisible(true);
                            }} style={s.btnEditar}>Cambiar Estado</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal Vincular Estudiante */}
        {showVincularModal && (
          <div style={s.modalOverlay}>
            <div style={s.modalContentLg}>
              <div style={s.modalHeader}>
                <h2 style={s.modalTitulo}>📋 Activar Servicio de Transporte</h2>
                <button onClick={() => { setShowVincularModal(false); limpiarFormularioVincular(); }} style={s.btnCerrarModal}>✕</button>
              </div>

              {/* Mensajes dentro del modal */}
              {errorVincular && <div style={s.errorMsgModal}>❌ {errorVincular}</div>}
              {exitoVincular && <div style={s.exitoMsgModal}>✅ {exitoVincular}</div>}
              
              <form onSubmit={guardarServicioTransporte}>
                <div style={s.formGroup}>
                  <label style={s.label}>Buscar Estudiante *</label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={cargarEstudiantes}
                    onChange={handleEstudianteChange}
                    value={estudianteSeleccionado}
                    placeholder="Buscar estudiante por código, nombre o apellido..."
                    isClearable
                    styles={{
                      control: (base) => ({ ...base, padding: "4px", borderRadius: "7px", borderr: "1px solid #ddd", minHeight: "42px" }),
                      menu: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                </div>

                {estudianteSeleccionado && (
                  <>
                    <div style={s.infoEstudiante}>
                      <strong>📌 Estudiante:</strong> {estudianteSeleccionado.estudiante?.codigo} - {estudianteSeleccionado.estudiante?.apellido}, {estudianteSeleccionado.estudiante?.nombre}
                      <br />
                      <strong>📚 Grado:</strong> {estudianteSeleccionado.estudiante?.seccion?.curso?.grado || "No asignado"}
                    </div>

                    {estudianteSeleccionado.tutor && (
                      <div style={s.infoTutor}>
                        <strong>👨‍👩‍👧 Tutor:</strong> {estudianteSeleccionado.tutor.codigo} - {estudianteSeleccionado.tutor.nombre} {estudianteSeleccionado.tutor.apellido}
                      </div>
                    )}

                    <div style={s.formGrid}>
                      <div>
                        <label style={s.label}>Tipo de Servicio *</label>
                        <select
                          value={formServicio.tipo ?? ''}
                          onChange={(e) => handleTipoChange(e.target.value)}
                          style={s.input}
                          required
                        >
                          <option value="">-- Seleccione un tipo de transporte --</option>
                          <option value="COMPLETO">TRANSPORTE COMPLETO</option>
                          <option value="MEDIO (RECOGER)">1/2 TRANSPORTE (RECOGER)</option>
                          <option value="MEDIO (LLEVAR)">1/2 TRANSPORTE (LLEVAR)</option>
                        </select>
                      </div>
                      <div>
                        <label style={s.label}>Valor Anual (RD$)</label>
                        <input
                          type="number"
                          value={formServicio.valorAnual ?? ''}
                          onChange={(e) => setFormServicio({ ...formServicio, valorAnual: parseFloat(e.target.value) })}
                          style={s.input}
                          step="0.01"
                          readOnly
                        />
                      </div>
                      <div>
                        <label style={s.label}>Duración (meses) *</label>
                        <input
                          type="number"
                          value={formServicio.duracion ?? ''}
                          onChange={(e) => setFormServicio({ ...formServicio, duracion: parseInt(e.target.value) })}
                          style={s.input}
                          min="1"
                          max="12"
                          required
                        />
                      </div>
                      <div>
                        <label style={s.label}>Ruta (opcional)</label>
                        <select
                          value={rutaSeleccionada || ""}
                          onChange={(e) => setRutaSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
                          style={s.input}
                        >
                          <option value="">Sin ruta asignada</option>
                          {rutasDisponibles.map((ruta) => (
                            <option key={ruta.id} value={ruta.id ?? ''}>
                              {ruta.nombre} ({ruta.horarioRecogida})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={s.label}>Concepto</label>
                      <input
                        value={getConcepto(formServicio.tipo || "COMPLETO")}
                        readOnly
                        style={{ ...s.input, background: "#f0f0f0" }}
                      />
                    </div>

                    <div>
                      <label style={s.label}>Observaciones</label>
                      <textarea
                        value={formServicio.observaciones ?? ''}
                        onChange={(e) => setFormServicio({ ...formServicio, observaciones: e.target.value })}
                        style={s.textarea}
                        rows={3}
                        placeholder="Comentarios adicionales..."
                      />
                    </div>
                  </>
                )}

                <div style={s.modalButtons}>
                  <button type="button" onClick={() => { setShowVincularModal(false); limpiarFormularioVincular(); }} style={s.btnCancelar}>
                    Cancelar
                  </button>
                  {estudianteSeleccionado && (
                    <button type="submit" disabled={cargandoVincular} style={s.btnGuardar}>
                      {cargandoVincular ? "Registrando..." : "🔗 Vincular Estudiante"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Ruta */}
        {showModal && (
          <div style={s.modalOverlay}>
            <div style={s.modalContentLg}>
              <div style={s.modalHeader}>
                <h2 style={s.modalTitulo}>{selectedRuta ? "Editar Ruta" : "Nueva Ruta"}</h2>
                <button onClick={() => { setShowModal(false); setSelectedRuta(null); setPuntosRecorrido([]); }} style={s.btnCerrarModal}>✕</button>
              </div>
              <form action={(formData) => {
                if (selectedRuta) {
                  actualizarRuta(selectedRuta.id, formData);
                } else {
                  crearRuta(formData);
                }
                setSelectedRuta(null);
              }}>
                <div style={s.formGrid}>
                  <div>
                    <label style={s.label}>Nombre *</label>
                    <input name="nombre" defaultValue={selectedRuta?.nombre} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Capacidad *</label>
                    <input name="capacidad" type="number" defaultValue={selectedRuta?.capacidad || 20} style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Horario recogida *</label>
                    <input name="horarioRecogida" defaultValue={selectedRuta?.horarioRecogida} placeholder="Ej: 7:00 AM" style={s.input} required />
                  </div>
                  <div>
                    <label style={s.label}>Horario regreso</label>
                    <input name="horarioRegreso" defaultValue={selectedRuta?.horarioRegreso || ""} placeholder="Ej: 4:00 PM" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Conductor</label>
                    <input name="conductor" defaultValue={selectedRuta?.conductor || ""} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Teléfono conductor</label>
                    <input name="telefonoConductor" defaultValue={selectedRuta?.telefonoConductor || ""} style={s.input} />
                  </div>
                </div>

                <div>
                  <label style={s.label}>Descripción</label>
                  <textarea name="descripcion" defaultValue={selectedRuta?.descripcion || ""} style={s.textarea} rows={2} />
                </div>

                <label style={s.label}>📍 Puntos de Recogida</label>
                <div style={s.puntosForm}>
                  <div style={s.puntosInputs}>
                    <input placeholder="Calle" value={nuevoPunto.calle} onChange={(e) => setNuevoPunto({ ...nuevoPunto, calle: e.target.value })} style={s.inputSmall} />
                    <input placeholder="Número" value={nuevoPunto.numero} onChange={(e) => setNuevoPunto({ ...nuevoPunto, numero: e.target.value })} style={s.inputSmall} />
                    <input placeholder="Sector" value={nuevoPunto.sector} onChange={(e) => setNuevoPunto({ ...nuevoPunto, sector: e.target.value })} style={s.inputSmall} />
                    <input placeholder="Referencia" value={nuevoPunto.referencia} onChange={(e) => setNuevoPunto({ ...nuevoPunto, referencia: e.target.value })} style={s.inputSmall} />
                    <button type="button" onClick={agregarPunto} style={s.btnAgregarPunto}>+ Agregar</button>
                  </div>
                </div>

                {puntosRecorrido.length > 0 && (
                  <div style={s.puntosAgregados}>
                    {puntosRecorrido.map((p, i) => (
                      <div key={i} style={s.puntoAgregado}>
                        <span>{p.calle} #{p.numero}, {p.sector}</span>
                        <button type="button" onClick={() => setPuntosRecorrido(puntosRecorrido.filter((_, idx) => idx !== i))} style={s.eliminarPuntoBtn}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <input type="hidden" name="puntosRecorrido" value={JSON.stringify(puntosRecorrido)} />

                <div style={s.modalButtons}>
                  <button type="button" onClick={() => { setShowModal(false); setSelectedRuta(null); setPuntosRecorrido([]); }} style={s.btnCancelar}>Cancelar</button>
                  <button type="submit" style={s.btnGuardar}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para cambiar estado de vinculación */}
        {modalVisible && selectedVinculacion && (
          <div style={s.modalOverlay}>
            <div style={s.modalContent}>
              <div style={s.modalHeader}>
                <h3>Cambiar estado de transporte</h3>
                <button onClick={() => setModalVisible(false)} style={s.btnCerrarModal}>✕</button>
              </div>
              <p><strong>Estudiante:</strong> {selectedVinculacion.estudiante?.nombre} {selectedVinculacion.estudiante?.apellido}</p>
              <p><strong>Tipo:</strong> {getTipoLabel(selectedVinculacion.tipo)}</p>
              <div style={s.formGroup}>
                <label style={s.label}>Nuevo estado</label>
                <select value={nuevoEstado ?? ''} onChange={(e) => setNuevoEstado(e.target.value)} style={s.input}>
                  <option value="ACTIVO">Activo</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
              {nuevoEstado === "CANCELADO" && (
                <div style={s.formGroup}>
                  <label style={s.label}>Cancelar a partir de</label>
                  <input type="date" value={fechaCancelacion ?? ''} onChange={(e) => setFechaCancelacion(e.target.value)} style={s.input} required />
                  <small>Los cargos generados a partir de esta fecha serán acreditados</small>
                </div>
              )}
              <div style={s.modalButtons}>
                <button onClick={() => setModalVisible(false)} style={s.btnCancelar}>Cancelar</button>
                <button onClick={cambiarEstadoVinculacion} style={s.btnGuardar}>Guardar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#2C1810" },
  loadingSmall: { textAlign: "center", padding: "40px", color: "#888" },
  sinAcceso: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace: { color: "#2C1810", fontWeight: "bold", textDecoration: "none" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  btnPrimary: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { border: "1px solid #2C1810", color: "#2C1810", background: "#EBF3FB" },
  vacio: { background: "#fff", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#666" },
  rutasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: "20px" },
  rutaCard: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "all 0.3s ease" },
  rutaInactiva: { opacity: 0.7, background: "#f9f9f9" },
  rutaHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" },
  rutaNombre: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  badgeInactivo: { background: "#c53030", color: "#fff", fontSize: "10px", padding: "2px 8px", borderRadius: "20px" },
  rutaAcciones: { display: "flex", gap: "8px", flexWrap: "wrap" },
  btnActivar: { background: "#2F855A", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" },
  btnDesactivar: { background: "#E6A017", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" },
  btnEditar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" },
  btnEliminar: { background: "#C53030", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" },
  rutaDescripcion: { color: "#666", fontSize: "13px", marginBottom: "12px" },
  rutaDetalles: { display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#555", marginBottom: "12px", borderTop: "1px solid #eee", paddingTop: "12px" },
  puntosRecorrido: { marginTop: "12px", fontSize: "13px" },
  puntosLista: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" },
  puntoTag: { background: "#EBF3FB", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" },
  estudiantesAsignados: { marginTop: "12px", fontSize: "13px", borderTop: "1px solid #eee", paddingTop: "12px" },
  estudiantesLista: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" },
  estudianteTag: { background: "#E6F7E6", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" },
  statsContainer: { display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  statCard: { background: "#fff", borderRadius: "10px", padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", textAlign: "center" },
  statCardActivo: { background: "#E6F7E6", borderRadius: "10px", padding: "12px 20px", textAlign: "center", color: "#276749" },
  statCardSuspendido: { background: "#FEFCBF", borderRadius: "10px", padding: "12px 20px", textAlign: "center", color: "#744210" },
  statCardCancelado: { background: "#FED7D7", borderRadius: "10px", padding: "12px 20px", textAlign: "center", color: "#C53030" },
  statCardMonto: { background: "#EBF3FB", borderRadius: "10px", padding: "12px 20px", textAlign: "center", color: "#2C1810" },
  filtrosContainer: { display: "flex", gap: "16px", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap", background: "#fff", padding: "16px", borderRadius: "12px" },
  btnFiltrar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  btnLimpiar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeSuspendido: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeCancelado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  tablaWrap: { overflowX: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "700px" },
  thead: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff" },
  th: { padding: "12px 14px", color: "#fff", fontSize: "12px", fontWeight: "bold", textAlign: "left" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: "13px" },
  label: { display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" },
  input: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" },
  inputSmall: { padding: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", minWidth: "120px" },
  textarea: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", fontFamily: "inherit" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "16px" },
  formGroup: { marginBottom: "16px" },
  puntosForm: { marginBottom: "12px" },
  puntosInputs: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  btnAgregarPunto: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  puntosAgregados: { marginBottom: "16px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" },
  puntoAgregado: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "13px" },
  eliminarPuntoBtn: { background: "none", border: "none", color: "#C53030", cursor: "pointer", fontSize: "16px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "500px", width: "90%", maxHeight: "90vh", overflow: "auto" },
  modalContentLg: { background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "700px", width: "90%", maxHeight: "90vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #eee" },
  modalTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  btnCerrarModal: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" },
  modalButtons: { display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" },
  btnCancelar: { background: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer" },
  btnGuardar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer" },
  infoEstudiante: { background: "#EBF3FB", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" },
  infoTutor: { background: "#f0f4f8", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" },
  navegacionAnioContainer: { background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  navegacionAnio: { display: "flex", gap: "12px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  btnNav: { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  navInfo: { fontSize: "14px", fontWeight: "bold", color: "#2C1810", minWidth: "200px", textAlign: "center" },
  subtituloTabla: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", margin: "20px 0 12px 0", paddingBottom: "6px", borderBottom: "2px solid #1F5C99" },
  errorMsgModal: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
  exitoMsgModal: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" },
};