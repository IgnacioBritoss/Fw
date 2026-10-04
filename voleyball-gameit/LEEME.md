# Voleyball para game.it

Un juego nuevo para el portal de [emitejadaa/game.it](https://github.com/emitejadaa/game.it), armado sobre Clashball:
los jugadores se mueven con la misma física de HaxBall y la pelota vuela en 3D, rápida y bombeada, por encima de la red.
Tiene las reglas del vóley: 3 toques por equipo, saca el que hace el punto (si un equipo recupera el saque, rota quién
saca), afuera, antenas, ganar por 2 y tiempo con punto de oro. Se juega contra bots, de a 2 en el mismo teclado y online.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `voleyball.patch` | El parche completo, un solo commit para aplicar sobre `main` de game.it. |
| `prueba-voleyball.html` | Una sola página para probarlo ya contra bots, sin instalar nada (no tiene online). |
| `PULL_REQUEST.md` | El texto para el pull request, con la plantilla del repo completa. |
| `capturas/` | Capturas de computadora, celular, un remate y una sala online con chat. |

## Probarlo contra bots sin instalar nada

Abrí `prueba-voleyball.html` en el navegador (doble clic) y elegí **JUGAR VS CPU**. Ahí podés elegir el modo (Clásico,
Playa o Turbo), de 1v1 a 4v4 o Práctica, la dificultad de los bots, la cancha, los puntos y el tiempo. También está
**2 JUGADORES** en el mismo teclado. El online no está en esta página porque necesita el servidor de game.it.

## Probarlo completo en tu compu (portal y online)

Hace falta [Node.js 20 o más nuevo](https://nodejs.org/).

```bash
git clone https://github.com/emitejadaa/game.it
cd game.it
git am /ruta/a/voleyball.patch
npm install
cd server && npm install && cd ..
npm run dev       # el portal en http://localhost:5173/#play/voleyball
npm run server    # en otra terminal: el servidor online en ws://localhost:8787
```

Para el online abrí dos pestañas en `http://localhost:5173/#play/voleyball`. En una: **ONLINE → CREAR SALA**, unite a un
equipo y sumá bots con **+ bot**. En la otra: **ONLINE**, poné el código de 5 letras y **UNIRSE**. El anfitrión toca
**EMPEZAR**. Con **Enter** se abre el chat, que además relata cada punto ("🏐 3-2 · ¡REMATE! Lola · nadie llegó").

Antes de mandarlo, el repo tiene su propia revisión: `npm run check -- voleyball` y `npm run build` (las dos pasan).

## Mandárselo a tu amigo

**Opción A: el parche.** Le pasás `voleyball.patch` y él, en su repo, corre:

```bash
git am voleyball.patch
git push
```

**Opción B: pull request**, que es lo que pide su `CONTRIBUTING.md`:

1. En https://github.com/emitejadaa/game.it tocá **Fork**.
2. Cloná tu fork, aplicá el parche en una rama y subila:
   ```bash
   git clone https://github.com/<tu-usuario>/game.it
   cd game.it
   git checkout -b juego/voleyball
   git am /ruta/a/voleyball.patch
   git push -u origin juego/voleyball
   ```
3. En tu fork aparece **Compare & pull request**. Destino `emitejadaa/game.it`, rama `main`. Pegá el texto de
   `PULL_REQUEST.md`, arrastrá las capturas de `capturas/`, dejá tildado **Allow edits by maintainers** y creá el pull
   request. La revisión automática del repo ("Revisar juegos") corre sola.

Cuando lo publique en Render, el servidor online también lo levanta solo: el parche ya registra el juego en
`server/index.js`.

## Cómo se juega

- **Moverse:** flechas o WASD (también anda con un joystick de consola). En el celular, el joystick de la pantalla.
- **Pase (sin apretar nada):** parate debajo de la pelota; rebota en vos y sube. El 1.er toque va hacia el armador, el
  2.º sube cerca de la red para rematar y el 3.º la devuelve por arriba. La sombra en la arena muestra dónde está.
- **Pegar (X, Espacio o el botón PEGAR):** saltás y le pegás fuerte apenas te llega, hacia el lado contrario a donde la
  tocás, como la patada de Clashball. Cerca de la red y con la pelota alta es un **remate**. Las flechas al pegar eligen
  la profundidad: hacia la red, profundo; hacia atrás, corto (en el remate eso es una **finta**). Si la pelota viene del
  rival por arriba de la red y saltás ahí, la **bloqueás**.
- **Saque:** el que saca espera detrás de su línea con la pelota. Apuntá con arriba/abajo; hacia la red sale potente al
  fondo y hacia atrás, corto. Si tarda 8 segundos, saca solo.
- Los puntitos arriba de la pelota y el cartel "TOQUES ●●○" muestran cuántos toques usó el equipo.

## Qué se probó

- El parche aplica limpio sobre `main` de game.it (commit `09224cb`) y pasan `npm run check` y `npm run build`.
- Cientos de partidos bot contra bot sin pantalla: casi todos los puntos son remates, hay bloqueos, aces y pocos
  errores; Difícil le gana a Normal y Normal a Fácil; ningún lado de la cancha tiene ventaja.
- Reglas: ganar por 2, tiempo y punto de oro, 4 toques, antenas, la red, práctica con máquina de saque y el que saca
  yéndose en pleno saque.
- El estado que manda el servidor reproduce el partido exacto en el cliente (es lo que hace que el online se sienta local).
- En el navegador (Chromium): computadora, celular vertical y horizontal, dentro del portal y online con dos clientes
  (sala, bots, mezclar, chat, pausa y detener).

## De paso, en Clashball

En Clashball, el botón **MEZCLAR** de la sala online borra los bots: en `server/games/clashball.js`, `shuffle` primero
manda a todos al equipo 0 y `moveTo` saca de la sala a los bots que quedan sin equipo. En Voleyball lo hice sin borrarlos;
si tu amigo quiere, el mismo cambio sirve para Clashball.
