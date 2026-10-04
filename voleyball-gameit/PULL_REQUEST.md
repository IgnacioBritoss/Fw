Título sugerido: **Nuevo juego: Voleyball (vóley con la movilidad de Clashball, bots y online)**

## Qué juego es

**Voleyball**, id `voleyball` (`public/games/voleyball/`, servidor en `server/games/voleyball.js`). Vóley 2D en tiempo real
armado sobre Clashball: los jugadores se mueven con la misma física de HaxBall y la pelota vuela en 3D, rápida y
bombeada, por encima de la red. Reglas de vóley: punto por jugada, saca el que hace el punto (si recupera el saque, rota
quién saca), 3 toques por equipo (el bloqueo no cuenta), afuera y por fuera de las antenas es punto contra el último que
la tocó, ganar por 2 opcional y tiempo con punto de oro.

## Cómo se juega

- **Computadora:** flechas o WASD para moverse; X o Espacio para saltar y pegar; Esc pausa. Joystick de consola también.
  2 jugadores en el mismo teclado: J1 con WASD + Espacio/C, J2 con flechas + Enter/./Ctrl derecho.
- **Celular:** joystick a la izquierda y botón PEGAR a la derecha; en vertical la cancha se gira con tu equipo abajo.
- **Toques:** sin apretar, la pelota rebota en el jugador y sube (recepción hacia el armador, armado cerca de la red,
  tercer toque por arriba). Apretando se salta y se pega hacia el lado contrario a donde se la toca (como la patada de
  Clashball); las flechas al pegar eligen la profundidad. En el aire, cerca de la red y con la pelota alta es un remate
  (o una finta); si la pelota viene del rival por arriba de la red, un bloqueo. El saque se apunta con las flechas.
- **Modos:** vs CPU de 1v1 a 4v4 con bots en Fácil, Normal y Difícil; Práctica (una máquina te saca siempre); 2 jugadores
  en el mismo teclado; online con salas públicas o con código, juego rápido, espectadores, bots, chat que relata cada
  punto, pausa y revancha. Variantes Clásico, Playa (pelota que flota) y Turbo; canchas Chica, Clásica y Grande.
- El motor (`shared/match.js`, `shared/physics.js`, `shared/courts.js`) y los bots (`shared/ai.js`) son los mismos en el
  navegador y en el servidor. Online igual que Clashball: el servidor simula a 60 ticks/s y manda el estado 30 veces por
  segundo; el cliente predice su jugador y corrige.

## Checklist

- [x] Todo está en `public/games/voleyball/` y en `server/games/voleyball.js` (registrado en `server/index.js`).
- [x] `game.json` completo: `id` igual a la carpeta, título y descripción en español e inglés, `platforms`, `categories`.
- [x] El juego usa el SDK: `GameIt.ready()`, `GameIt.gameplay(true/false)` y pausa con `onPause`/`onResume`.
- [x] Textos en español e inglés según `GameIt.prefs.lang`.
- [x] Lo probé en computadora y en celular (vertical y horizontal) sin errores en la consola (Chromium, con el modo celular).
- [x] No tapa la barra del portal (los 56 px de arriba) ni hace scroll.
- [x] Código, imágenes y sonidos propios (los sonidos se sintetizan con Web Audio, sin archivos). Sin marcas ni
      personajes ajenos.
- [x] `npm run check -- voleyball` y `npm run build` pasan.
- [ ] Dejé tildado "Allow edits by maintainers".

## Capturas

<!-- Arrastrá acá las de la carpeta capturas/: juego-pc.png, remate.png, celular.png y online.png -->
