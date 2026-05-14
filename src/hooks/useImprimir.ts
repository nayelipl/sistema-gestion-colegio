import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export function useImprimir() {
  const componentRef = useRef(null);

  const handleImprimir = useReactToPrint({
    documentTitle: "documento",
    onAfterPrint: () => console.log("Impresión completada"),
    contentRef: componentRef,
  });

  return { componentRef, handleImprimir };
}
