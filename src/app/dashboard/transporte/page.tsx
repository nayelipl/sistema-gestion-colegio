"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "rutas" | "estudiantes" | "vincular";

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
  tipo: "COMPLETO" | "MEDIO_RECOGER" | "MEDIO_LLEVAR";
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
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVinculacion, setSelectedVinculacion] = useState<Vinculacion | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [fechaCancelacion, setFechaCancelacion] = useState("");
  const [cargandoVinculaciones, setCargandoVinculaciones] = useState(true);

  // Estado para Vincular (nuevo servicio)
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [formServicio, setFormServicio] = useState<Partial<ServicioTransporte>>({
    tipo: "COMPLETO",
    valor: 0,
    duracion: 10,
    inscripcion: 0,
    estado: "ACTIVO",
    observaciones: ""
  });
  const [estudianteBuscado, setEstudianteBuscado] = useState<Estudiante | null>(null);
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [busquedaEstudiante, setBusquedaEstudiante] = useState("");
  const [cargandoEstudiante, setCargandoEstudiante] = useState(false);
  const [tarifaTransporte, setTarifaTransporte] = useState(0);
  const [rutasDisponibles, setRutasDisponibles] = useState<Ruta[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null);

  // Estados para navegación por año escolar
  const [aniosEscolares, setAniosEscolares] = useState<string[]>([]);
  const [anioEscolarIndex, setAnioEscolarIndex] = useState(0);
  const [cargandoAnios, setCargandoAnios] = useState(false);

  const rol = (session?.user as any)?.role ?? "";

  // Verificar autenticación
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
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
  }, [status, rol]);

  // Recargar vinculaciones cuando cambian los filtros
  useEffect(() => {
    if (status === "authenticated" && aniosEscolares.length > 0) {
      cargarVinculaciones();
    }
  }, [filtroEstado, filtroTipo, anioEscolarIndex, aniosEscolares]);

  useEffect(() => {
    if (status === "authenticated") {
      cargarAniosEscolares();
    }
  }, [status]);

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
          setTarifaTransporte(Number(tarifaTransporteData.valorAnual));
          setFormServicio(prev => ({
            ...prev,
            valor: Number(tarifaTransporteData.valorAnual) / 10,
            valorAnual: Number(tarifaTransporteData.valorAnual)
          }));
        }
      }
    } catch (err) {
      console.error("Error cargando tarifa:", err);
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
        setTimeout(() => setMensaje(""), 3000);
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
        setTimeout(() => setMensaje(""), 3000);
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
        setTimeout(() => setMensaje(""), 3000);
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
        setTimeout(() => setMensaje(""), 3000);
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
        setTimeout(() => setMensaje(""), 3000);
      } else {
        setError(data.error || "Error al eliminar ruta");
      }
    } catch (err) {
      setError("Error de conexión");
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

// Función para navegar entre años escolares
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
      // Recargar vinculaciones con el nuevo año escolar
      cargarVinculacionesPorAnio(aniosEscolares[nuevoIndex]);
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
      if (filtroEstado !== "TODOS") params.append("estado", filtroEstado);
      if (filtroTipo !== "TODOS") params.append("tipo", filtroTipo);
      if (aniosEscolares[anioEscolarIndex]) params.append("anioEscolar", aniosEscolares[anioEscolarIndex]);

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
        await cargarVinculaciones();
        setModalVisible(false);
        setSelectedVinculacion(null);
        setNuevoEstado("");
        setFechaCancelacion("");
        setTimeout(() => setMensaje(""), 3000);
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  const cargarVinculacionesPorAnio = async (anioEscolar: string) => {
    setCargandoVinculaciones(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== "TODOS") params.append("estado", filtroEstado);
      if (filtroTipo !== "TODOS") params.append("tipo", filtroTipo);
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

  //Funciones para vincular un estudiante al servicio de transporte
  const buscarEstudiante = async () => {
    if (!busquedaEstudiante.trim()) {
      setError("Ingrese código, nombre o apellido del estudiante");
      return;
    }
    setCargandoEstudiante(true);
    setError("");
    try {
      const res = await fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(busquedaEstudiante)}`);
      const data = await res.json();
      if (res.ok && data.estudiante) {
        setEstudianteBuscado(data.estudiante);
        setTutorInfo(data.estudiante.tutor || null);
      } else {
        setError("Estudiante no encontrado");
        setEstudianteBuscado(null);
        setTutorInfo(null);
      }
    } catch (err) {
      setError("Error al buscar estudiante");
    } finally {
      setCargandoEstudiante(false);
    }
  };

  const handleTipoChange = (tipo: string) => {
    let valor = tarifaTransporte;
    if (tipo === "MEDIO_RECOGER" || tipo === "MEDIO_LLEVAR") {
      valor = tarifaTransporte / 2;
    }
    setFormServicio(prev => ({
      ...prev,
      tipo: tipo as any,
      valor: valor / 10,
      valorAnual: valor,
      concepto: getConcepto(tipo)
    }));
  };

  const getConcepto = (tipo: string) => {
    switch (tipo) {
      case "COMPLETO": return "FACTURACIÓN SERVICIO TRANSPORTE COMPLETO";
      case "MEDIO_RECOGER": return "FACTURACIÓN SERVICIO ½ TRANSPORTE (RECOGER)";
      case "MEDIO_LLEVAR": return "FACTURACIÓN SERVICIO ½ TRANSPORTE (LLEVAR)";
      default: return "";
    }
  };

  const guardarServicioTransporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteBuscado) {
      setError("Debe buscar y seleccionar un estudiante");
      return;
    }

    setError("");
    setMensaje("");

    const servicioData = {
      estudianteId: estudianteBuscado.id,
      tipo: formServicio.tipo,
      valor: formServicio.valor,
      duracion: formServicio.duracion,
      inscripcion: formServicio.inscripcion || 0,
      valorAnual: formServicio.valorAnual,
      inicio: new Date().toISOString().split('T')[0],
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
        setMensaje(`✅ Servicio de transporte registrado. ${data.mensaje}`);
        setShowVincularModal(false);
        setEstudianteBuscado(null);
        setTutorInfo(null);
        setBusquedaEstudiante("");
        setRutaSeleccionada(null);
        setFormServicio({
          tipo: "COMPLETO",
          valor: tarifaTransporte / 10,
          duracion: 10,
          inscripcion: 0,
          estado: "ACTIVO",
          observaciones: ""
        });
        cargarVinculaciones();
        setTimeout(() => setMensaje(""), 5000);
      } else {
        setError(data.error || "Error al registrar servicio");
      }
    } catch (err) {
      setError("Error de conexión al registrar el servicio");
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
      case "MEDIO_RECOGER": return "🚐 ½ Transporte (Recoger)";
      case "MEDIO_LLEVAR": return "🚐 ½ Transporte (Llevar)";
      default: return tipo;
    }
  };

  if (status === "loading") {
    return <div style={s.loading}>Verificando autenticación...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

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
      <nav style={s.nav}>
        <Link href="/dashboard" style={s.navBack}>← Volver al Dashboard</Link>
        <span style={s.navTitle}>🚌 Gestión de Transporte</span>
        <span style={s.navUser}>👤 {session?.user?.name}</span>
      </nav>

      <div style={s.contenido}>
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
          {tab === "vincular" && (
            <button onClick={() => setShowVincularModal(true)} style={s.btnPrimary}>
              + Vincular Estudiante
            </button>
          )}
        </div>

        {mensaje && <div style={s.exitoMsg}>✅ {mensaje}</div>}
        {error && <div style={s.errorMsg}>❌ {error}</div>}

        <div style={s.tabs}>
          {([
            { key: "rutas", label: `🚌 Rutas (${rutas.length})` },
            { key: "estudiantes", label: `👨‍🎓 Servicios Activos (${vinculaciones.filter(v => v.estado === "ACTIVO").length})` },
            { key: "vincular", label: `🔗 Vincular Estudiante` },
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
          {/* Navegación por año escolar */}
          <div style={s.navegacionAnioContainer}>
            <div style={s.navegacionAnio}>
              <button onClick={() => navegarAnio("primero")} style={s.btnNav} disabled={aniosEscolares.length === 0}>⏮ Primero</button>
              <button onClick={() => navegarAnio("anterior")} style={s.btnNav} disabled={aniosEscolares.length === 0 || anioEscolarIndex === 0}>◀ Anterior</button>
              <span style={s.navInfo}>
                {cargandoAnios ? "Cargando..." : (
                  aniosEscolares.length > 0 
                    ? `${anioEscolarIndex + 1} de ${aniosEscolares.length} - Año: ${aniosEscolares[anioEscolarIndex]}`
                    : "No hay años escolares"
                )}
              </span>
              <button onClick={() => navegarAnio("siguiente")} style={s.btnNav} disabled={aniosEscolares.length === 0 || anioEscolarIndex === aniosEscolares.length - 1}>Siguiente ▶</button>
              <button onClick={() => navegarAnio("ultimo")} style={s.btnNav} disabled={aniosEscolares.length === 0}>Último ⏭</button>
            </div>
          </div>

          <div style={s.statsContainer}>
            <div style={s.statCard}><strong>Total:</strong> {estadisticas.total}</div>
            <div style={s.statCardActivo}><strong>Activos:</strong> {estadisticas.activos}</div>
            <div style={s.statCardSuspendido}><strong>Suspendidos:</strong> {estadisticas.suspendidos}</div>
            <div style={s.statCardCancelado}><strong>Cancelados:</strong> {estadisticas.cancelados}</div>
            <div style={s.statCardMonto}><strong>Monto total:</strong> RD${estadisticas.montoTotal?.toFixed(2)}</div>
          </div>

          <div style={s.filtrosContainer}>
            <div>
              <label style={s.label}>Estado:</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={s.inputSmall}>
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="SUSPENDIDO">Suspendidos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Tipo:</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={s.inputSmall}>
                <option value="TODOS">Todos</option>
                <option value="COMPLETO">Transporte Completo</option>
                <option value="MEDIO_RECOGER">½ Transporte (Recoger)</option>
                <option value="MEDIO_LLEVAR">½ Transporte (Llevar)</option>
              </select>
            </div>
            <button onClick={cargarVinculaciones} style={s.btnFiltrar}>🔍 Filtrar</button>
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
                        <td style={s.td}>RD${Number(v.montoTotal).toFixed(2)}</td>
                        <td style={s.td}>{new Date(v.fechaInicio).toLocaleDateString("es-DO")}</td>
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
                    {vinculaciones.filter(v => v.tipo === "MEDIO_RECOGER").map((v) => (
                      <tr key={v.id}>
                        <td style={s.td}>
                          {v.estudiante?.nombre} {v.estudiante?.apellido}<br />
                          <small style={{ color: "#888" }}>{v.estudiante?.codigo}</small>
                        </td>
                        <td style={s.td}>
                          {v.tutor?.nombre} {v.tutor?.apellido}
                        </td>
                        <td style={s.td}>RD${Number(v.montoTotal).toFixed(2)}</td>
                        <td style={s.td}>{new Date(v.fechaInicio).toLocaleDateString("es-DO")}</td>
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
                    {vinculaciones.filter(v => v.tipo === "MEDIO_LLEVAR").map((v) => (
                      <tr key={v.id}>
                        <td style={s.td}>
                          {v.estudiante?.nombre} {v.estudiante?.apellido}<br />
                          <small style={{ color: "#888" }}>{v.estudiante?.codigo}</small>
                        </td>
                        <td style={s.td}>
                          {v.tutor?.nombre} {v.tutor?.apellido}
                        </td>
                        <td style={s.td}>RD${Number(v.montoTotal).toFixed(2)}</td>
                        <td style={s.td}>{new Date(v.fechaInicio).toLocaleDateString("es-DO")}</td>
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

        {/* PESTAÑA VINCULAR - Formulario de activación de servicio */}
        {tab === "vincular" && (
          <div style={s.vincularPanel}>
            <div style={s.vincularCard}>
              <h3 style={s.vincularTitulo}>📋 Activar Servicio de Transporte</h3>
              
              {/* Búsqueda de estudiante */}
              <div style={s.formGroup}>
                <label style={s.label}>Buscar Estudiante *</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={busquedaEstudiante}
                    onChange={(e) => setBusquedaEstudiante(e.target.value)}
                    placeholder="Código, nombre o apellido"
                    style={{ ...s.input, flex: 1 }}
                  />
                  <button type="button" onClick={buscarEstudiante} style={s.btnSecundario} disabled={cargandoEstudiante}>
                    {cargandoEstudiante ? "Buscando..." : "🔍 Buscar"}
                  </button>
                </div>
              </div>

              {/* Información del estudiante encontrado */}
              {estudianteBuscado && (
                <>
                  <div style={s.infoEstudiante}>
                    <strong>📌 Estudiante:</strong> {estudianteBuscado.codigo} - {estudianteBuscado.apellido}, {estudianteBuscado.nombre}
                    <br />
                    <strong>📚 Grado:</strong> {estudianteBuscado.grado}
                  </div>

                  {tutorInfo && (
                    <div style={s.infoTutor}>
                      <strong>👨‍👩‍👧 Tutor:</strong> {tutorInfo.codigo} - {tutorInfo.nombre} {tutorInfo.apellido}
                    </div>
                  )}

                  {/* Formulario de servicio */}
                  <div style={s.formGrid}>
                    <div>
                      <label style={s.label}>Tipo de Servicio *</label>
                      <select
                        value={formServicio.tipo}
                        onChange={(e) => handleTipoChange(e.target.value)}
                        style={s.input}
                        required
                      >
                        <option value="COMPLETO">TRANSPORTE COMPLETO</option>
                        <option value="MEDIO_RECOGER">1/2 TRANSPORTE (RECOGER)</option>
                        <option value="MEDIO_LLEVAR">1/2 TRANSPORTE (LLEVAR)</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Valor Anual (RD$)</label>
                      <input
                        type="number"
                        value={formServicio.valorAnual}
                        onChange={(e) => setFormServicio({ ...formServicio, valorAnual: parseFloat(e.target.value) })}
                        style={s.input}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label style={s.label}>Duración (meses) *</label>
                      <input
                        type="number"
                        value={formServicio.duracion}
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
                          <option key={ruta.id} value={ruta.id}>
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
                      value={formServicio.observaciones}
                      onChange={(e) => setFormServicio({ ...formServicio, observaciones: e.target.value })}
                      style={s.textarea}
                      rows={3}
                      placeholder="Comentarios adicionales..."
                    />
                  </div>

                  <button onClick={guardarServicioTransporte} style={s.btnVincular}>
                    🔗 Vincular Estudiante
                  </button>
                </>
              )}

              {!estudianteBuscado && (
                <div style={s.infoBox}>
                 ℹ️ Busque un estudiante por su código, nombre o apellido para activar el servicio de transporte.
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Modal de Ruta */}
      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h2 style={s.modalTitulo}>{selectedRuta ? "Editar Ruta" : "Nueva Ruta"}</h2>
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
            <h3>Cambiar estado de transporte</h3>
            <p><strong>Estudiante:</strong> {selectedVinculacion.estudiante?.nombre} {selectedVinculacion.estudiante?.apellido}</p>
            <p><strong>Tipo:</strong> {getTipoLabel(selectedVinculacion.tipo)}</p>
            <div style={s.formGroup}>
              <label style={s.label}>Nuevo estado</label>
              <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} style={s.input}>
                <option value="ACTIVO">Activo</option>
                <option value="SUSPENDIDO">Suspendido</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            {nuevoEstado === "CANCELADO" && (
              <div style={s.formGroup}>
                <label style={s.label}>Cancelar a partir de</label>
                <input type="date" value={fechaCancelacion} onChange={(e) => setFechaCancelacion(e.target.value)} style={s.input} required />
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
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#2C1810" },
  loadingSmall: { textAlign: "center", padding: "40px", color: "#888" },
  sinAcceso: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  enlace: { color: "#2C1810", fontWeight: "bold", textDecoration: "none" },
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "Arial, sans-serif" },
  nav: { background: "linear-gradient(135deg, #2C1810, #4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBack: { color: "#fff", textDecoration: "none", fontSize: "14px" },
  navTitle: { fontWeight: "bold", fontSize: "16px" },
  navUser: { fontSize: "14px" },
  contenido: { maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo: { fontSize: "22px", fontWeight: "bold", color: "#2C1810", margin: "0 0 4px" },
  subtitulo: { fontSize: "13px", color: "#666", margin: 0 },
  btnPrimary: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  btnSecundario: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" },
  exitoMsg: { background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" },
  errorMsg: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "2px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#666" },
  tabActivo: { borderColor: "#2C1810", color: "#2C1810", background: "#EBF3FB" },
  vacio: { background: "#fff", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#666" },
  rutasGrid: { display: "grid", gridTemplateColumns: "1fr", gap: "20px" },
  rutaCard: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  rutaInactiva: { opacity: 0.7, background: "#f9f9f9" },
  rutaHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" },
  rutaNombre: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: 0 },
  badgeInactivo: { background: "#c53030", color: "#fff", fontSize: "10px", padding: "2px 8px", borderRadius: "20px", marginLeft: "10px" },
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
  badgeActivo: { background: "#c6f6d5", color: "#276749", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeSuspendido: { background: "#fefcbf", color: "#744210", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  badgeCancelado: { background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" },
  tablaWrap: { overflowX: "auto" as any, background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  tabla: { width: "100%", borderCollapse: "collapse" as any },
  thead: { background: "#f0f4f8" },
  th: { padding: "10px 12px", color: "#2C1810", fontSize: "11px", fontWeight: "bold", textAlign: "left" as any, borderBottom: "2px solid #ddd" },
  td: { padding: "10px 12px", fontSize: "12px", borderBottom: "1px solid #f0f0f0" },
  label: { display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" },
  input: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" },
  inputSmall: { padding: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", minWidth: "120px" },
  textarea: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", fontFamily: "inherit" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  formGroup: { marginBottom: "16px" },
  puntosForm: { marginBottom: "12px" },
  puntosInputs: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  btnAgregarPunto: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" },
  puntosAgregados: { marginBottom: "16px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" },
  puntoAgregado: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "13px" },
  eliminarPuntoBtn: { background: "none", border: "none", color: "#C53030", cursor: "pointer", fontSize: "16px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "500px", width: "90%", maxHeight: "90vh", overflow: "auto" },
  modalTitulo: { fontSize: "20px", fontWeight: "bold", color: "#2C1810", marginBottom: "20px" },
  modalButtons: { display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" },
  btnCancelar: { background: "#ccc", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer" },
  btnGuardar: { background: "#2C1810", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer" },
  vincularPanel: { background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  vincularCard: { display: "flex", flexDirection: "column" as any, gap: "16px" },
  vincularTitulo: { fontSize: "18px", fontWeight: "bold", color: "#2C1810", margin: "0 0 8px" },
  infoEstudiante: { background: "#EBF3FB", padding: "12px", borderRadius: "8px", fontSize: "14px" },
  infoTutor: { background: "#f0f4f8", padding: "12px", borderRadius: "8px", fontSize: "14px" },
  infoBox: { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: "8px", padding: "16px", fontSize: "13px", color: "#744210", textAlign: "center" as any },
  btnVincular: { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", border: "none", borderRadius: "8px", padding: "14px 24px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "16px" },
  navegacionAnioContainer: { background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  navegacionAnio: { display: "flex", gap: "12px", alignItems: "center", justifyContent: "center" },
  btnNav: { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  navInfo: { fontSize: "14px", fontWeight: "bold", color: "#2C1810", minWidth: "200px", textAlign: "center" },
  subtituloTabla: { fontSize: "16px", fontWeight: "bold", color: "#2C1810", margin: "20px 0 12px 0", paddingBottom: "6px", borderBottom: "2px solid #1F5C99", },
};
