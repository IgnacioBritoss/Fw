# Defensa Sprint 5 y 6

Los comentarios de esta lista arrancan todos con un guion, así que
buscar `// -` en VS Code (Ctrl + Shift + F) los muestra todos juntos.
Adentro del CSS son `/* - ...`, en JSX `{/* - ...` y en el HTML `<!-- - ...`.

Cada número es la línea del **código**; el comentario está justo arriba.

## Sprint 5

### Sesiones con token y rutas protegidas según el rol

**Principal:** FreeWheel / src/auth/strategies/jwt.strategy.ts — líneas 30, 33, 41, 52, 57, 67, 72

Quién llama a esto:

- Fw / src/pages/Auth/Login.jsx — línea 81
- Fw / src/context/AuthContext.jsx — líneas 75, 140
- Fw / src/services/api.js — líneas 76, 128
- Fw / src/App.jsx — línea 54
- Fw / src/components/PrivateRoute.jsx — línea 19
- FreeWheel / src/auth/auth.controller.ts — línea 113
- FreeWheel / src/auth/auth.service.ts — líneas 279, 915
- FreeWheel / src/common/decorators/roles.decorator.ts — línea 7
- FreeWheel / src/common/guards/roles.guard.ts — líneas 13, 39
- FreeWheel / src/admin/admin.controller.ts — línea 30

### Mails automáticos en cada paso de la cuenta y de la reserva

**Principal:** FreeWheel / src/email/email.service.ts — líneas 23, 63, 98, 123, 163, 211, 244, 308, 339, 375, 417, 463, 506, 549, 576, 608, 716, 802, 928, 970, 1011, 1081, 1132, 1202, 1336

Quién llama a esto:

- FreeWheel / src/bookings/bookings.service.ts — líneas 293, 1174

### La app en cinco idiomas

**Principal:** Fw / src/i18n/core.js — líneas 21, 29, 38, 40, 52, 54, 64, 76

Quién llama a esto:

- Fw / src/i18n/index.jsx — líneas 37, 47
- Fw / src/components/LangPicker.jsx — línea 103

### Precios en la moneda que elija el usuario

**Principal:** Fw / src/services/moneda.js — líneas 47, 90, 109, 115, 127, 132, 137, 164, 171

Quién llama a esto:

- Fw / src/context/CurrencyContext.jsx — líneas 41, 54
- Fw / src/components/CurrencyPicker.jsx — línea 88

### Modo oscuro en toda la app

**Principal:** Fw / src/services/theme.js — líneas 47, 50, 120, 123, 222, 228, 230, 625, 639

Quién llama a esto:

- Fw / src/App.jsx — línea 78
- Fw / src/pages/Settings/Settings.jsx — línea 93
- Fw / src/components/Layout.jsx — línea 749

### Diseño adaptado al celular

**Principal:** Fw / src/hooks/useIsMobile.js — líneas 13, 15, 17, 24, 29, 32, 36

Quién llama a esto:

- Fw / src/components/Layout.jsx — línea 526
- Fw / src/styles/theme.css — línea 442
- Fw / index.html — línea 8

## Sprint 6

### Modo lectura para personas con dislexia

**Principal:** Fw / src/services/theme.js — líneas 334, 528, 534, 553, 581, 616

Quién llama a esto:

- Fw / src/pages/Settings/Settings.jsx — línea 95

### Colores para personas con daltonismo

**Principal:** Fw / src/services/theme.js — líneas 376, 381, 387, 431, 433, 607

Quién llama a esto:

- Fw / src/pages/Settings/Settings.jsx — línea 97

### Límites contra bots y cupos diarios

**Principal:** FreeWheel / src/common/rate-limit/sensitive-rate-limit.guard.ts — líneas 50, 52, 60, 68, 78, 85, 90, 109, 119

Quién llama a esto:

- FreeWheel / src/common/rate-limit/sensitive-rate-limit.decorator.ts — línea 29
- FreeWheel / src/common/rate-limit/rate-limit.service.ts — línea 99
- FreeWheel / src/app.module.ts — líneas 41, 51
- FreeWheel / src/common/rate-limit/client-ip-throttler.guard.ts — línea 14
- FreeWheel / src/ai/ai.controller.ts — línea 99
- FreeWheel / src/media/media.controller.ts — línea 31
- FreeWheel / src/antifraude/limites.ts — línea 89
- FreeWheel / src/antifraude/antifraude.service.ts — línea 101
- FreeWheel / src/listings/listings.service.ts — línea 125

### Pruebas automáticas y corrección de errores

**Principal:** FreeWheel / src/common/utils/cuil.util.spec.ts — líneas 13, 15, 17, 23, 25

Quién llama a esto:

- FreeWheel / src/common/utils/cuil.util.ts — línea 25
- Fw / src/pages/Admin/Admin.jsx — línea 184
