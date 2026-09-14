# Skills instaladas

Las skills son instrucciones empaquetadas que usa Claude Code cuando trabaja
sobre este repositorio. **No son código de la aplicación**: nada de lo que hay
acá adentro se importa desde `src/` ni termina en lo que se publica. Por eso
`eslint.config.js` las ignora.

## scroll-craft

De [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft),
MIT (© 2026 Nate Herk, ver `scroll-craft/LICENSE`).

Trae dos cosas que este proyecto usa:

1. **La gramática `data-sc-*`**, que es la que habla `src/anim/scrollcraft.js`:
   `data-sc-in`, `data-sc-stagger`, `data-sc-depth`, `data-sc-tilt`,
   `data-sc-spotlight`, `data-sc-count`.
2. **El piso de buen gusto para el movimiento** (`references/taste.md`), que es
   de dónde salen las reglas que sigue `src/styles/motion.css`: solo `transform`
   y `opacity`, nunca `ease-in` en la interfaz, transiciones abajo de 300ms,
   nunca desde `scale(0)`, escalonados de 30 a 80ms, y menos movimiento —no
   cero— con `prefers-reduced-motion`.

**Su motor (`engine/scrollcraft.js`) no se usa tal cual, y está bien que así
sea.** Está escrito para páginas sueltas de HTML: monta una vez, se engancha a
lo que encuentra en ese momento y no se desmonta nunca. En una aplicación de una
sola página como esta, donde el contenido entero se reemplaza en cada ruta, eso
deja escuchadores colgados y no ve nada de lo que se dibuja después.
`src/anim/scrollcraft.js` habla la misma gramática, mira los cambios del
documento y se puede apagar. El motor original queda acá como referencia.
