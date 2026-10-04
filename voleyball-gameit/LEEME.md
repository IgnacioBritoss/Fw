# Voleyball para game.it

Un juego nuevo para el portal de [emitejadaa/game.it](https://github.com/emitejadaa/game.it): vóley **de costado, como
los servidores de vóley de HaxBall**, armado sobre Clashball. Los jugadores flotan y se mueven con la misma física de
HaxBall, la pelota cae con gravedad y solo se le pega con **Espacio** (la patada de HaxBall). El punto se define en el
piso: si la pelota toca el piso de un lado, punto del otro equipo. Tiene las reglas del vóley: 3 toques por equipo, saca
el que hace el punto (si un equipo recupera el saque, rota quién saca), ganar por 2 y tiempo con punto de oro. Se juega
contra bots, de a 2 en el mismo teclado y online.

> Esta versión reemplaza a la anterior (la que se veía desde arriba). Si ya le pasaste el parche viejo a tu amigo, usá
> este: es un solo commit sobre `main` que trae todo.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `voleyball.patch` | El parche completo, un solo commit para aplicar sobre `main` de game.it. |
| `prueba-voleyball.html` | Una sola página para probarlo ya contra bots, sin instalar nada (no tiene online). |
| `PULL_REQUEST.md` | El texto para el pull request, con la plantilla del repo completa. |
| `capturas/` | Capturas de computadora, un remate, celular (vertical y horizontal) y una sala online con chat. |

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

- **Se ve de costado**, como en HaxBall: el piso abajo, la red al medio y los jugadores flotan. Nadie pasa al otro lado
  de la red (arriba de la red hay una barrera invisible, la línea punteada).
- **Moverse:** flechas o WASD, para todos lados (también anda con un joystick de consola). En el celular, el joystick de
  la pantalla.
- **Pegarle:** solo con **Espacio** o **X** (en el celular, el botón PEGAR). La pelota te atraviesa; el golpe sale desde
  tu jugador hacia la pelota: si estás abajo, sube; si estás al costado, sale para el otro lado; si estás arriba, la
  bajás (**remate**). Apretando, el golpe queda armado (borde blanco) y sale apenas la tenés al alcance; para volver a
  pegar hay que soltar. Yendo hacia la pelota le pegás más fuerte.
- **El punto:** cuando la pelota toca el piso, punto del otro equipo. Rebota en las paredes de los costados y en la red, y
  arriba no hay techo: si la mandan muy alto sale del mapa y una flecha en el borde de arriba la sigue para que todos
  sepan por dónde baja. La sombra en la arena también muestra dónde está.
- **Toques:** hasta 3 por equipo (el saque cuenta como el primero). Si el rival remata cerca de la red y le pegás ahí, es
  un **bloqueo** y no cuenta como toque. Los puntitos arriba de la pelota y el cartel "TOQUES ●●○" muestran cuántos van.
- **Saque:** la pelota espera quieta en el fondo de tu cancha; acomodate y pegale. Unos puntitos muestran por dónde va a
  salir según dónde estés. Si tardás 7 segundos, sale sola.

## Qué se probó

- El parche aplica limpio sobre `main` de game.it (commit `09224cb`) y pasan `npm run check` y `npm run build`.
- Reglas, una por una: punto en el piso, rebote en paredes y red (también con la pelota rápida), sin techo, 4 toques,
  golpe hacia donde está la pelota, la pelota atraviesa a los jugadores, hay que soltar para volver a pegar, bloqueo,
  saque que no pasa la red, práctica con máquina de saque, el que saca se va, ganar por 2 y punto de oro.
- Cientos de partidos bot contra bot sin pantalla: la mayoría de los puntos son remates, hay bloqueos y errores; Difícil
  le gana a Normal y Normal a Fácil (de 1v1 a 3v3); ningún lado de la cancha tiene ventaja.
- El estado que manda el servidor reproduce el partido en el cliente (es lo que hace que el online se sienta local).
- En el navegador (Chromium): computadora, celular vertical (la cámara sigue la pelota) y horizontal (controles a los
  costados), dentro del portal y online con dos clientes (sala, bots, mezclar, chat que relata, pausa y detener).

## De paso, en Clashball

En Clashball, el botón **MEZCLAR** de la sala online borra los bots: en `server/games/clashball.js`, `shuffle` primero
manda a todos al equipo 0 y `moveTo` saca de la sala a los bots que quedan sin equipo. En Voleyball lo hice sin borrarlos;
si tu amigo quiere, el mismo cambio sirve para Clashball.
