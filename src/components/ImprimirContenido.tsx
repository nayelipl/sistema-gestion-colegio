import React from "react";
import { formatFechaLarga, formatFechaLocal } from "@/lib/formatear-fecha";

type ImprimirContenidoProps = {
  titulo: string;
  datos: any;
  tipo: "matricula" | "recibo-cargos" | "recibo-otros" | "reporte"  | "desembolso-caja-chica" | "cuadre-caja-chica";
};

const toNumber = (valor: any): number => {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') return parseFloat(valor) || 0;
  return 0;
};

export const ImprimirContenido = React.forwardRef<HTMLDivElement, ImprimirContenidoProps>(
  ({ titulo, datos, tipo }, ref) => {
    if (!datos) {
      return (
        <div ref={ref}>
          <p>No hay datos para imprimir</p>
        </div>
      );
    }

    const estilos = {
      contenedor: { fontFamily: "Arial, sans-serif", padding: "20px", maxWidth: "1200px", margin: "0 auto" },
      encabezado: { textAlign: "center" as const, marginBottom: "30px" },
      titulo: { fontSize: "18px", fontWeight: "bold", marginBottom: "8px" },
      subtitulo: { fontSize: "14px", color: "#666" },
      seccion: { marginBottom: "20px" },
      tabla: { width: "100%", borderCollapse: "collapse" as const, marginTop: "10px" },
      th: { border: "1px solid #ddd", padding: "8px", background: "#f2f2f2", textAlign: "left" as const },
      td: { border: "1px solid #ddd", padding: "8px" },
      total: { fontWeight: "bold", marginTop: "20px", textAlign: "right" as const },
      pie: { marginTop: "30px", textAlign: "center" as const, fontSize: "11px", color: "#888" },
      infoGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" },
      infoItem: { fontSize: "13px" },
      cuadreResumen: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px", padding: "16px", background: "#f0f4f8", borderRadius: "8px" },
      anuladoBadge: {
      background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "8px", textAlign: "center" as const, color: "#c53030", fontWeight: "bold", },
      firmas: { display: "flex", justifyContent: "space-between", marginTop: "50px" },
    };


    const renderMatricula = () => {
      return (
        <>
          <div style={estilos.seccion}>
            <p><strong>Inscripción No.:</strong> {datos.inscripcionNo}</p>
            <p><strong>Fecha:</strong> {datos.fechaFormateada || formatFechaLarga(datos.fecha)}</p>
            <p><strong>Estudiante:</strong> {datos.estudianteNombre} {datos.estudianteApellido} ({datos.estudianteCodigo})</p>
            <p><strong>Curso:</strong> {datos.cursoGrado}</p>
            <p><strong>Sección:</strong> {datos.seccionNombre}</p>
            <p><strong>Año Escolar:</strong> {datos.anioEscolar}</p>
            <p><strong>Valor Cobrado:</strong> RD${(datos.valorCobrado || 0).toFixed(2)}</p>
            {datos.observaciones && <p><strong>Observaciones:</strong> {datos.observaciones}</p>}
          </div>
        </>
      );
    };

    const formatMonto = (monto: number): string => `RD$${monto.toFixed(2)}`;

    const renderReciboCargos = () => {
      const subTotal = toNumber(datos.subTotal);
      const recargoTotal = toNumber(datos.recargoTotal);
      const total = toNumber(datos.total);
      const estaAnulado = datos.anulado === true;
      
      return (
        <>
          {estaAnulado && (
            <div style={{
              ...estilos.anuladoBadge,
              marginBottom: "16px"
            }}>
              🚫 RECIBO ANULADO {datos.motivoAnulacion && ` - Motivo: ${datos.motivoAnulacion}`}
            </div>
          )}
          <div style={estilos.seccion}>
            <p><strong>Recibo No.:</strong> <span style={estaAnulado ? { textDecoration: "line-through", color: "#999" } : {}}>{datos.reciboNo || "—"}</span></p>
            <p><strong>Fecha:</strong> {datos.fecha ? formatFechaLarga(datos.fecha) : "—"}</p>
            <p><strong>Tutor:</strong> {datos.tutor?.nombre} {datos.tutor?.apellido}</p>
            <p><strong>Cuenta:</strong> {datos.tutor?.cuentaNo}</p>
            {datos.anuladoPor && <p><strong>Anulado por:</strong> {datos.anuladoPor}</p>}
            {datos.anuladoEn && <p><strong>Fecha anulación:</strong> {formatFechaLarga(datos.anuladoEn)}</p>}
          </div>
          <h3>Detalle de Cargos</h3>
          <table style={estilos.tabla}>
            <thead><tr><th style={estilos.th}>Cargo No.</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Monto</th></tr></thead>
            <tbody>
              {datos.pagos?.map((pago: any, idx: number) => (
                <tr key={idx}>
                  <td style={estilos.td}>{pago.cargo?.cargoNo || "—"}</td>
                  <td style={estilos.td}>{pago.cargo?.tipo || "—"}</td>
                  <td style={estilos.td}>RD${toNumber(pago.montoPagado).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={estilos.total}>
            <p><strong>Sub-Total:</strong> RD${subTotal.toFixed(2)}</p>
            <p><strong>Recargo:</strong> RD${recargoTotal.toFixed(2)}</p>
            <p><strong>Total:</strong> RD${total.toFixed(2)}</p>
          </div>
        </>
      );
    };

    const renderReciboOtros = () => (
    <>
        <div style={estilos.seccion}>
        <p><strong>Recibo No.:</strong> {datos.reciboNo || "—"}</p>
        <p><strong>Fecha:</strong> {datos.fecha ? formatFechaLarga(datos.fecha) : "—"}</p>
        <p><strong>Concepto:</strong> {datos.concepto || "—"}</p>
        <p><strong>Al portador:</strong> {datos.alPortador || "—"}</p>
        <p><strong>Descripción:</strong> {datos.descripcion || "—"}</p>
        </div>
        <div style={estilos.total}>
        <p><strong>Monto:</strong> RD${toNumber(datos.total).toFixed(2)}</p>
        <p><strong>Método de Pago:</strong> {datos.metodoPago || "—"}</p>
        </div>
    </>
    );

    const renderReporte = () => {
      const recibos = datos.recibos || [];
      const conceptosMap = datos.conceptosMap || {};
      const conceptosOrden = ["Inscripción", "Colegiatura", "Transporte", "Uniforme", "Derecho a Graduación", "Excursión Escolar", "Otros Ingresos"];
      
      // Calcular totales de métodos de pago
      let totalEfectivo = 0;
      let totalTarjeta = 0;
      let totalCheque = 0;
      let totalTransferencia = 0;
      
      recibos.forEach((r: any) => {
        if (r.metodoPago === "EFECTIVO") totalEfectivo += r.monto;
        else if (r.metodoPago === "TARJETA") totalTarjeta += r.monto;
        else if (r.metodoPago === "CHEQUE") totalCheque += r.monto;
        else if (r.metodoPago === "TRANSFERENCIA") totalTransferencia += r.monto;
      });
      
      const sumaMetodos = totalEfectivo + totalTarjeta + totalCheque + totalTransferencia + (datos.creditoMonto || 0);
      const diferencia = sumaMetodos - (datos.totalMonto || 0);
      const esCuadrado = Math.abs(diferencia) < 0.01;
      
      return (
        <>
          <div style={estilos.infoGrid}>
            <div><strong>Reporte No.:</strong> {datos.reporteNo || "—"}</div>
            <div><strong>Fecha:</strong> {formatFechaLarga(datos.fecha)}</div>
            <div><strong>Realizado por:</strong> {datos.realizadoPor || "Todos"}</div>
            <div><strong>Período:</strong> {formatFechaLarga(datos.fechaDesde)} - {formatFechaLarga(datos.fechaHasta)}</div>
            <div><strong>Saldo Inicial:</strong> {formatMonto(datos.saldoInicial)}</div>
            <div><strong>Saldo Final:</strong> {formatMonto(datos.saldoFinal)}</div>
            <div><strong>Crédito/Ajuste:</strong> {formatMonto(datos.creditoMonto)}</div>
            <div><strong>Total Recibos:</strong> {formatMonto(datos.totalMonto)}</div>
          </div>

          <h3>Resumen de Ingresos por Concepto</h3>
          <table style={estilos.tabla}>
            <thead>
              <tr><th>Concepto</th><th>Efectivo</th><th>Tarjeta</th><th>Cheque</th><th>Transferencia</th><th>Cantidad</th><th>Total</th></tr>
            </thead>
            <tbody>
              {conceptosOrden.map(nombre => {
                const c = conceptosMap[nombre] || { efectivo: 0, tarjeta: 0, cheque: 0, transferencia: 0, total: 0, cantidad: 0 };
                return (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td className="right">{formatMonto(c.efectivo)}</td>
                    <td className="right">{formatMonto(c.tarjeta)}</td>
                    <td className="right">{formatMonto(c.cheque)}</td>
                    <td className="right">{formatMonto(c.transferencia)}</td>
                    <td className="center">{c.cantidad}</td>
                    <td className="right"><strong>{formatMonto(c.total)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>TOTAL</strong></td>
                <td className="right"><strong>{formatMonto(totalEfectivo)}</strong></td>
                <td className="right"><strong>{formatMonto(totalTarjeta)}</strong></td>
                <td className="right"><strong>{formatMonto(totalCheque)}</strong></td>
                <td className="right"><strong>{formatMonto(totalTransferencia)}</strong></td>
                <td className="center"><strong>{recibos.length}</strong></td>
                <td className="right"><strong>{formatMonto(datos.totalMonto)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <h3>Cuadre Final</h3>
          <div style={estilos.cuadreResumen}>
            <div><strong>Suma Métodos de Pago:</strong> {formatMonto(sumaMetodos)}</div>
            <div><strong>Total Recibos:</strong> {formatMonto(datos.totalMonto)}</div>
            <div><strong style={{ color: esCuadrado ? "#276749" : diferencia > 0 ? "#ed8936" : "#c53030" }}>
              Diferencia: {esCuadrado ? "✓ CUADRADO" : diferencia > 0 ? `SOBRANTE: ${formatMonto(diferencia)}` : `FALTANTE: ${formatMonto(Math.abs(diferencia))}`}
            </strong></div>
          </div>

          <h3>Recibos</h3>
          <table style={estilos.tabla}>
            <thead><tr><th>No.</th><th>Fecha</th><th>Tutor</th><th>Concepto</th><th>Monto</th><th>Método</th></tr></thead>
            <tbody>
              {recibos.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.reciboNo}</td>
                  <td>{formatFechaLarga(r.fecha)}</td>
                  <td>{r.tutor}</td>
                  <td>{r.concepto}</td>
                  <td className="right">{formatMonto(r.monto)}</td>
                  <td>{r.metodoPago}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}><strong>Cantidad de cobros:</strong> {recibos.length}</td><td className="right"><strong>{formatMonto(datos.totalMonto)}</strong></td><td></td></tr>
            </tfoot>
          </table>

          <div style={estilos.firmas}>
            <div><hr /><p>Cajero</p></div>
            <div><hr /><p>Contador</p></div>
          </div>
        </>
      );
    };

    const renderDesembolsoCajaChica = () => {
        const estaAnulado = datos.estado === "ANULADA";
        
        return (
            <>
            <div style={estilos.seccion}>
                {estaAnulado && (
                <div style={{
                    ...estilos.anuladoBadge,
                    marginBottom: "16px",
                    padding: "8px",
                    background: "#fff5f5",
                    border: "1px solid #fed7d7",
                    borderRadius: "8px",
                    textAlign: "center" as const,
                    color: "#c53030",
                    fontWeight: "bold"
                }}>
                    🚫 RECIBO ANULADO
                    {datos.motivoAnulacion && <span> - Motivo: {datos.motivoAnulacion}</span>}
                </div>
                )}
                <p><strong>Desembolso No.:</strong> <span style={estaAnulado ? { textDecoration: "line-through", color: "#999" } : {}}>{datos.desembolsoNo}</span></p>
                <p><strong>Fecha:</strong> {formatFechaLarga(datos.fecha)}</p>
                <p><strong>Pagado a:</strong> {datos.pagadoA}</p>
                <p><strong>Monto:</strong> RD${toNumber(datos.monto).toFixed(2)}</p>
                <p><strong>Con cargo a:</strong> {datos.conCargoA}</p>
                <p><strong>Por concepto de:</strong> {datos.porConceptoDe}</p>
                <p><strong>Aprobado por:</strong> {datos.aprobadoPor}</p>
                <p><strong>Recibido por:</strong> {datos.recibidoPor}</p>
                {datos.cedula && <p><strong>Cédula:</strong> {datos.cedula}</p>}
                {datos.anuladoPor && <p><strong>Anulado por:</strong> {datos.anuladoPor}</p>}
                {datos.anuladoEn && <p><strong>Fecha anulación:</strong> {formatFechaLarga(datos.anuladoEn)}</p>}
            </div>
            </>
        );
        };

    const renderCuadreCajaChica = () => (
    <>
        <div style={estilos.infoGrid}>
        <div><strong>Cuadre No.:</strong> {datos.cuadreNo}</div>
        <div><strong>Fecha:</strong> {formatFechaLarga(datos.fecha)}</div>
        <div><strong>Período:</strong> {formatFechaLarga(datos.fechaDesde)} - {formatFechaLarga(datos.fechaHasta)}</div>
        <div><strong>Realizado por:</strong> {datos.realizadoPor}</div>
        </div>
        <div style={estilos.cuadreResumen}>
        <div><strong>Saldo Inicial:</strong> RD${toNumber(datos.saldoInicial).toFixed(2)}</div>
        <div><strong>Total Desembolsos:</strong> RD${toNumber(datos.totalDesembolsos).toFixed(2)}</div>
        <div><strong>Saldo Actual:</strong> RD${toNumber(datos.saldoActual).toFixed(2)}</div>
        <div><strong>Diferencia:</strong> RD${toNumber(datos.diferencia).toFixed(2)} ({datos.diferenciaTexto})</div>
        </div>
        <h3>Desembolsos</h3>
        <table style={estilos.tabla}>
        <thead><tr><th>No.</th><th>Fecha</th><th>Pagado a</th><th>Monto</th><th>Concepto</th></tr></thead>
        <tbody>
            {datos.desembolsos?.map((d: any, i: number) => (
            <tr key={i}>
                <td>{d.desembolsoNo}</td>
                <td>{formatFechaLarga(d.fecha)}</td>
                <td>{d.pagadoA}</td>
                <td>RD${toNumber(d.monto).toFixed(2)}</td>
                <td>{d.porConceptoDe}</td>
            </tr>
            ))}
        </tbody>
        </table>
    </>
    );

    return (
      <div ref={ref} style={estilos.contenedor}>
        <div style={estilos.encabezado}>
          <h2 style={estilos.titulo}>{titulo}</h2>
          <p style={estilos.subtitulo}>Documento generado por el sistema de gestión escolar</p>
        </div>
        {tipo === "matricula" && renderMatricula()}
        {tipo === "recibo-cargos" && renderReciboCargos()}
        {tipo === "recibo-otros" && renderReciboOtros()}
        {tipo === "reporte" && renderReporte()}
        {tipo === "desembolso-caja-chica" && renderDesembolsoCajaChica()}
        {tipo === "cuadre-caja-chica" && renderCuadreCajaChica()}
        <div style={estilos.pie}>
          <p>Fecha de impresión: {formatFechaLocal(new Date)}</p>
        </div>
      </div>
    );
  }
);

ImprimirContenido.displayName = "ImprimirContenido";
