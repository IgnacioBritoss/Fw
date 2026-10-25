// ============================================================================
//  AssistantContext — Abrir y cerrar el asistente desde cualquier lado
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE: el asistente lo dibuja ChatBot, que vive al lado de las
//  rutas, y el botón que lo abre está en la franja de arriba, que la dibuja
//  Layout, adentro de cada ruta. Son dos ramas distintas del árbol: ninguna
//  puede pasarle una prop a la otra.
//
//  Antes no hacía falta porque el botón era el redondel flotante, y ese lo
//  dibujaba el propio ChatBot. Al mudar el botón a la franja hay que compartir
//  una sola cosa —si está abierto o no—, y eso es exactamente para lo que sirve
//  un contexto.
// ============================================================================
import { createContext, useContext, useMemo, useState } from "react";

const AssistantContext = createContext(null);

/**
 * Guarda si la ventanita de Wili está abierta, para toda la aplicación.
 *
 * Está acá arriba y no adentro del asistente porque hay botones en otras
 * pantallas que lo abren: si el estado viviera en el componente, esos botones
 * no tendrían forma de llegar a él.
 */
export function AsistenteProvider({ children }) {
  const [abierto, setAbierto] = useState(false);

  const valor = useMemo(() => ({
    abierto,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    alternar: () => setAbierto((v) => !v),
  }), [abierto]);

  return <AssistantContext.Provider value={valor}>{children}</AssistantContext.Provider>;
}

/**
 * Fuera del proveedor —una prueba que monta una pantalla suelta— devuelve un
 * asistente que está siempre cerrado y no hace nada. Es preferible un botón que
 * no abre nada a una pantalla que se rompe.
 */
const SIN_PROVEEDOR = { abierto: false, abrir: () => {}, cerrar: () => {}, alternar: () => {} };

/** El asistente, desde cualquier pantalla. Sin proveedor devuelve algo inerte
 *  en vez de romper: así una pantalla suelta en una prueba no se cae. */
export function useAsistente() {
  return useContext(AssistantContext) || SIN_PROVEEDOR;
}
