// ============================================================================
//  CurrencyContext — Una sola moneda para toda la app
// ----------------------------------------------------------------------------
//  Antes cada pantalla escribía el precio a mano: `$` pegado a
//  `toLocaleString()`, treinta veces repartidas en doce archivos. Además de
//  quedar distinto según el lugar, no había ningún punto donde cambiar la
//  moneda: había que tocar los treinta.
//
//  Acá está ese punto. `precio(pesos)` devuelve el texto listo para mostrar, ya
//  convertido y escrito como corresponde en la moneda elegida.
// ============================================================================
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  MONEDAS, MONEDA_POR_DEFECTO, TASAS_DE_RESPALDO,
  formatearPrecio, guardarMoneda, monedaGuardada, traerTasas,
} from "../services/moneda";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [moneda, setMonedaEstado] = useState(monedaGuardada);
  const [tasas, setTasas] = useState(TASAS_DE_RESPALDO);

  /*
    Las cotizaciones se piden UNA vez al abrir la app, no cada vez que se cambia
    de moneda: la respuesta trae todas juntas. Si el pedido falla, `traerTasas`
    ya devuelve la tabla de respaldo, así que acá no hay nada que atajar y los
    precios nunca quedan en blanco.
  */
  useEffect(() => {
    let vivo = true;
    traerTasas().then((t) => { if (vivo) setTasas(t); });
    return () => { vivo = false; };
  }, []);

  const valor = useMemo(() => ({
    moneda,
    monedas: MONEDAS,
    setMoneda: (code) => { setMonedaEstado(code); guardarMoneda(code); },
    /** Un precio en pesos → el texto que se muestra. */
    precio: (pesos) => formatearPrecio(pesos, moneda, tasas),
    /** ¿Se está mostrando en la moneda real de la operación? */
    esMonedaReal: moneda === MONEDA_POR_DEFECTO,
  }), [moneda, tasas]);

  return <CurrencyContext.Provider value={valor}>{children}</CurrencyContext.Provider>;
}

/**
 * Fuera del proveedor —una prueba que monta un componente suelto— se devuelve
 * pesos: es preferible un precio en la moneda de siempre que una pantalla rota.
 */
const SIN_PROVEEDOR = {
  moneda: MONEDA_POR_DEFECTO,
  monedas: MONEDAS,
  setMoneda: () => {},
  precio: (pesos) => formatearPrecio(pesos, MONEDA_POR_DEFECTO, TASAS_DE_RESPALDO),
  esMonedaReal: true,
};

export function useCurrency() {
  return useContext(CurrencyContext) || SIN_PROVEEDOR;
}
