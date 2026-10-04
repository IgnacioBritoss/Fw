Título sugerido: **Nuevo juego: Voleyball (vóley de costado como el de HaxBall, con bots y online)**

## Qué juego es

**Voleyball**, id `voleyball` (`public/games/voleyball/`, servidor en `server/games/voleyball.js`). Vóley de costado
como los servidores de vóley de HaxBall, armado sobre Clashball: los jugadores flotan y se mueven con la misma física de
HaxBall y no pasan al otro lado de la red; la pelota cae con gravedad, los atraviesa y solo se le pega con la patada
(Espacio). Es punto cuando la pelota toca el piso. Reglas de vóley: punto por jugada, saca el que hace el punto (si
recupera el saque, rota quién saca), 3 toques por equipo (el saque cuenta como el primero y el bloqueo no cuenta),
ganar por 2 opcional y tiempo con punto de oro.

## Cómo se juega

- **Computadora:** flechas o WASD para moverse; Espacio o X para pegar; Esc pausa. Joystick de consola también.
  2 jugadores en el mismo teclado: J1 con WASD + Espacio/C, J2 con flechas + Enter/./Ctrl derecho.
- **Celular:** joystick a la izquierda y botón PEGAR a la derecha. En vertical la cancha se ve más de cerca y la cámara
  sigue la pelota; en horizontal los controles quedan a los costados.
- **El golpe:** como la patada de HaxBall, sale desde el centro del jugador hacia la pelota: desde abajo sube, desde el
  costado sale para el otro lado y desde arriba es un remate. Apretando queda armado y sale apenas la pelota está al
  alcance; hay que soltar para volver a pegar. Cerca de la red, devolviendo un ataque, es un bloqueo.
- **La pelota:** rebota en las paredes de los costados y en la red; arriba no hay techo (si sale del mapa, una flecha en
  el borde de arriba la sigue). Su sombra en la arena muestra dónde está. En el saque espera quieta y unos puntitos
  muestran por dónde va a salir.
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
- [x] Dejé tildado "Allow edits by maintainers".

## Capturas

| Computadora | Remate |
| --- | --- |
| ![Partido 2 contra 2 en computadora](https://raw.githubusercontent.com/IgnacioBritoss/Fw/bd489ce0420ef7acd7604bf78eb8b14c5fe4ab97/voleyball-gameit/capturas/juego-pc.png) | ![Remate con el cartel del punto](https://raw.githubusercontent.com/IgnacioBritoss/Fw/bd489ce0420ef7acd7604bf78eb8b14c5fe4ab97/voleyball-gameit/capturas/remate.png) |

| Celular vertical | Celular horizontal |
| --- | --- |
| ![Celular vertical, modo Playa](https://raw.githubusercontent.com/IgnacioBritoss/Fw/bd489ce0420ef7acd7604bf78eb8b14c5fe4ab97/voleyball-gameit/capturas/celular.png) | ![Celular horizontal, controles a los costados](https://raw.githubusercontent.com/IgnacioBritoss/Fw/bd489ce0420ef7acd7604bf78eb8b14c5fe4ab97/voleyball-gameit/capturas/celular-horizontal.png) |

Online, con el chat que relata cada punto:

![Partido online con chat](https://raw.githubusercontent.com/IgnacioBritoss/Fw/bd489ce0420ef7acd7604bf78eb8b14c5fe4ab97/voleyball-gameit/capturas/online.png)
