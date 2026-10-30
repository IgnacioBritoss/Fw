## Qué juego es

**Julay’s Donas** (`public/games/julays-donas/`): atendés el local de donas de Julay, que se fue de viaje a buscar la receta de
la dona perfecta y te dejó a cargo. Hacés todo vos: tomás el pedido, armás la masa, freís cada lado en su punto y decorás. Cada
día llegan clientes nuevos y el último es el más exigente (cada 7 días viene la misma Julay a probar). Con las propinas mejorás
la cocina y decorás el local, y armás tu personaje en el vestidor. Todo dibujado con canvas 2D, sin imágenes.

## Cómo se juega

Con mouse o tocando la pantalla (en celular, acostado). Las teclas 1 a 4 cambian de estación y Esc pausa.

- **Mostrador:** cuando un cliente llega a la caja, «Tomar pedido». La comanda queda colgada arriba y dice qué es cada cosa
  (masa, forma, relleno, baño, hilos, topping, piezas).
- **Masa:** elegís la masa, la estirás arrastrando el palote y cortás con el cortador de la forma pedida.
- **Fritura:** tocás la dona para meterla al aceite, para darla vuelta cuando la aguja entra en la zona verde y para sacarla.
  Se sigue cocinando aunque estés en otra estación.
- **Decorado:** relleno y baño manteniendo apretado hasta la raya, hilos en zigzag, toppings pasando por toda la dona y piezas
  tocando donde van. Después, «Entregar».

Cada cliente pone nota a la espera, la masa, la fritura y el decorado. Hay **tres dificultades** (fácil, medio y difícil),
**mejoras de cocina** que cambian el juego (segunda mesa de masa para tener dos masas estiradas, freidora de seis lugares,
termómetro, manga que frena en la raya…), **decoración** con colores a elección, un **vestidor** (mujer u hombre, ojos,
peinados, ropa con estampados, delantal con una plaquita con tu nombre…), una **película animada** que cuenta la historia y
música tranquila. La partida se guarda al terminar cada día (`gameit:julays-donas:partida`). Es solo para un jugador, sin
online.

## Checklist

- [x] Todo está en `public/games/julays-donas/` (más su sección en el README y sus pruebas en `tests/julays-donas.test.mjs`).
- [x] `game.json` completo: `id` igual a la carpeta, título y descripción en español e inglés, `platforms`, `categories`.
- [x] El juego usa el SDK: `GameIt.ready()`, `GameIt.gameplay(true/false)` y pausa con `onPause`/`onResume`; «Salir del
      juego» en la pausa llama a `GameIt.exit()`.
- [x] Textos en español e inglés según `GameIt.prefs.lang` (también los carteles dibujados del local).
- [x] Lo probé en computadora y en celular acostado, sin errores en la consola. En vertical pide girar el celular (o
      «Jugar igual»).
- [x] No tapa la barra del portal (las esquinas de arriba quedan libres y las pantallas dejan los 56 px) ni hace scroll.
- [x] Código, dibujos, sonidos y música propios (todo sintetizado o dibujado con código). Sin marcas ni personajes ajenos.
- [x] `npm run check -- julays-donas` y `npm run build` pasan, y `npm test` también (811 pruebas, 6 nuevas del juego).
- [x] Respeta el volumen (efectos y música por separado), «reducir movimiento» (sin el fundido entre estaciones) y el idioma.
- [ ] Dejé tildado "Allow edits by maintainers".

Además de las pruebas, un bot jugó días enteros con clics de verdad (en las tres dificultades y con todas las mejoras) para
ajustar el ritmo; anda a 60 fps porque lo que no cambia (fondo, mostrador, retratos y donas ya hechas) se dibuja una vez y se
guarda.

## Capturas

![El juego en el menú](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/menu.jpg)

| | |
|---|---|
| ![Mostrador](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/mostrador.jpg) | ![Decorado con la comanda](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/decorado.jpg) |
| ![Masa con dos mesas](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/masa.jpg) | ![Freidora grande con termómetro](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/fritura.jpg) |
| ![Vestidor](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/vestidor.jpg) | ![Mejoras de cocina](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/tienda.jpg) |
| ![La película del principio](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/pelicula.jpg) | ![En el celular](https://raw.githubusercontent.com/IgnacioBritoss/Fw/7a6df2e3e54c72f41d0c3539a1336a8fb2052914/julays-donas-gameit/celular.jpg) |

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01VRU32TvSy1do7AcAzADaXU
