# PIDO APP — Documentación Completa (App del Cliente)

> Última actualización: 2026-04-08
> Versión Android: versionCode 28 · versionName 1.27
> applicationId: `es.pidoo.app`

---

## 1. ¿QUÉ ES PIDO APP?

App móvil y PWA para el **cliente final** del ecosistema Pidoo. Permite:
- Buscar restaurantes, farmacias y tiendas cercanos por geolocalización
- Ver la carta, añadir al carrito, pagar (tarjeta Stripe o efectivo)
- Seguir el pedido en tiempo real con mapa y posición del rider
- Gestionar múltiples direcciones de entrega
- Ver y aplicar promociones/descuentos de los restaurantes
- Recibir notificaciones push del estado del pedido
- Funciona como APK nativo Android Y como PWA instalable

---

## 2. TECH STACK

| Capa | Tecnología |
|---|---|
| Framework | React 18 + Vite |
| Mobile | Capacitor 6 (iOS + Android) |
| Backend | Supabase (PostgreSQL + Realtime + Edge Functions + Storage + Auth) |
| Pagos | Stripe (Payment Intents, tarjetas guardadas) |
| Mapas | Google Maps JavaScript API (modo oscuro, markers, InfoWindows) |
| Geolocalización | Capacitor Geolocation (nativo) + Web Geolocation API (fallback) |
| Push nativo | Firebase Cloud Messaging + @capacitor/push-notifications |
| Push web | Web Push API (VAPID) |
| Geocoding inverso | Nominatim (OpenStreetMap, gratis, sin API key) |
| Autocompletado dir. | Google Places Autocomplete API |
| Fuente | DM Sans (Google Fonts) |
| Estilos | CSS-in-JS (inline styles) + media queries globales |
| Color principal | `#FF6B2C` (naranja Pidoo) |
| Fondo | `#0D0D0D` (negro casi puro) |

---

## 3. ARQUITECTURA

```
pido-app/
├── src/
│   ├── App.jsx              # Shell principal, routing, ErrorBoundary, TiendaDetector
│   ├── main.jsx             # Entry point, registro del Service Worker
│   ├── index.css            # Reset CSS mínimo
│   ├── context/
│   │   ├── AuthContext.jsx  # Sesión, perfil usuario, updatePerfil
│   │   └── CartContext.jsx  # Carrito, propina, modo entrega, calcular envío
│   ├── pages/
│   │   ├── Login.jsx           # Login + Registro + Reset password (envío email)
│   │   ├── ResetPassword.jsx   # Formulario nueva contraseña (ruta /reset-password)
│   │   ├── Onboarding.jsx      # Selector vertical (Comida/Farmacia/Market)
│   │   ├── Home.jsx            # Pantalla principal con restaurantes
│   │   ├── RestDetalle.jsx     # Detalle restaurante + carta + promociones
│   │   ├── Carrito.jsx         # Modal carrito + checkout + pago Stripe
│   │   ├── Tracking.jsx        # Seguimiento pedido en tiempo real + mapa
│   │   ├── Favoritos.jsx       # Restaurantes guardados como favoritos
│   │   ├── Mapa.jsx            # Mapa Google con restaurantes y riders
│   │   ├── MisPedidos.jsx      # Historial de pedidos + repetir
│   │   ├── Notificaciones.jsx  # Centro de notificaciones
│   │   ├── Perfil.jsx          # Perfil usuario + Mis direcciones + config
│   │   ├── SerSocio.jsx        # Landing captación riders
│   │   ├── TiendaSocio.jsx     # Tienda pública del socio (pidoo.es/{slug})
│   │   └── PaginaLegal.jsx     # Términos, privacidad, cookies
│   ├── components/
│   │   ├── AnimatedSplash.jsx  # Splash animado (logo bounce + glow + texto fade)
│   │   ├── BottomNav.jsx       # Barra navegación inferior (safe-area flush al fondo)
│   │   ├── AddressInput.jsx    # Google Places Autocomplete
│   │   ├── EntregaBadge.jsx    # Badge delivery/recogida
│   │   ├── Stars.jsx           # Componente estrellas rating
│   │   └── PWAInstallPrompt.jsx # Popup instalación PWA (compacto, con logo real)
│   └── lib/
│       ├── supabase.js         # Cliente Supabase
│       ├── stripe.js           # Helpers pago Stripe
│       ├── geolocation.js      # getCurrentPosition (Capacitor + web fallback)
│       ├── horario.js          # estaAbierto() — lógica horarios restaurante
│       ├── pushNotifications.js # Registro FCM nativo
│       ├── webPush.js          # Registro push web (VAPID)
│       ├── alarm.js            # Sonido notificación
│       └── theme.js            # Helpers tema oscuro
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   ├── icon.png                # Icono app (192×192, 512×512, 1024×1024)
│   └── icons/                  # Iconos PWA múltiples tamaños
├── android/                    # Proyecto Android nativo (Capacitor)
│   └── app/
│       ├── build.gradle        # versionCode 28 / versionName 1.27
│       └── pidoo-apk.jks       # Keystore release (NO en git)
├── index.html                  # viewport-fit=cover, apple-mobile-web-app-capable
├── vite.config.js
└── package.json
```

### Flujo de arranque
```
index.html
  └─ main.jsx (registra SW)
       └─ App.jsx
            └─ ErrorBoundary
                 └─ TiendaDetector
                      ├─ AnimatedSplash (1x por sesión, sessionStorage)
                      ├─ Si URL es /reset-password  → ResetPassword (sin auth)
                      ├─ Si URL es /{slug}          → TiendaSocio (sin auth)
                      ├─ Si URL tiene #type=signup  → pantalla "Cuenta confirmada"
                      ├─ Si URL es /terminos|/privacidad → PaginaLegal (sin auth)
                      └─ AuthProvider + CartProvider
                           └─ AppContent
                                ├─ loading → pantalla oscura (splash ya cubrió)
                                ├─ !user → Login
                                ├─ !onboarded → Onboarding
                                └─ Shell principal (header + secciones + BottomNav)
```

---

## 4. CONTEXTOS

### AuthContext
Provee en toda la app:
```
user          — objeto Supabase Auth (id, email, etc.)
perfil        — fila de tabla `usuarios` (nombre, direccion, latitud, longitud, etc.)
loading       — true mientras verifica sesión inicial
authError     — error de rol incorrecto
login(email, password)
registro(email, password, nombre, telefono)
logout()
updatePerfil(campos)   — actualiza `usuarios` + refresca estado `perfil`
fetchPerfil(userId)    — carga perfil desde BD + registra push notifications
resetPassword(email)   — envía email con redirectTo: https://pidoo.es/reset-password
```

**Comportamiento especial:**
- Si el perfil no existe tras login (race condition con trigger), reintenta hasta 3 veces con 800ms de espera
- Si es Google OAuth y falta el perfil, lo crea manualmente con los metadatos
- Si el rol no es `cliente`, cierra sesión automáticamente (pido-app es solo para clientes)
- Tras login exitoso registra push notifications (web VAPID + FCM nativo)

### CartContext
Persiste el carrito en `localStorage` (`pido_cart`). Provee:
```
carrito[]          — items [{establecimiento_id, producto_id, nombre, precio_unitario, cantidad, tamano, extras}]
addItem(item)      — añade item (pregunta si es de otro restaurante)
removeItem(index)  — elimina por índice
clearCart()        — vacía carrito + resetea propina/modo
propina            — 0, 1, 2 o 3 €
setPropina(n)
metodoPago         — 'tarjeta' | 'efectivo'
setMetodoPago(m)
modoEntrega        — 'delivery' | 'recogida'
setModoEntrega(m)
totalItems         — cantidad total de artículos
subtotal           — suma (precio × cantidad)
envio              — coste envío calculado (0 si recogida)
total              — subtotal + envio + propina
envioLoading       — true mientras llama a calcular_envio
envioError         — true si Edge Function falló (usa 2,50€ estimado)
distanciaKm        — distancia calculada en km
calcularEnvio(lat, lng, canal, socioId?)
```

---

## 5. PANTALLAS Y FUNCIONALIDADES

### Login.jsx
- Login con email + contraseña (Supabase Auth)
- Registro con nombre, teléfono, email, contraseña
- Reset de contraseña por email → redirige a `https://pidoo.es/reset-password`
- Login con Google (OAuth, popup nativo en Capacitor)
- Throttle 2s en submit para evitar spam
- Manejo de errores traducidos al español
- Validación de formulario en cliente

### ResetPassword.jsx _(ruta: /reset-password)_
- Accesible sin autenticación (detectada en TiendaDetector antes del AuthProvider)
- Lee el token de recuperación de la URL (hash params de Supabase)
- Doble estrategia para capturar el token:
  1. `supabase.auth.getSession()` al montar (si Supabase ya procesó el hash)
  2. `onAuthStateChange` escuchando `PASSWORD_RECOVERY` (si llega después del mount)
- Formulario: "Nueva contraseña" + "Confirmar contraseña" (con toggle visibilidad)
- Llama a `supabase.auth.updateUser({ password })`
- Al éxito: cierra sesión temporal, muestra confirmación, redirige a `/` tras 3s
- **redirectTo configurado en Supabase dashboard:** `https://pidoo.es/reset-password` debe estar en la lista de Redirect URLs permitidas

### Onboarding.jsx
- Se muestra una sola vez (persiste en `localStorage: pido_onboarded`)
- Selector de vertical con 3 tarjetas animadas:
  - 🍕 **Comida** — restaurantes, cafeterías
  - 💊 **Farmacia** — medicamentos, higiene
  - 🛒 **Marketplace** — minimarkets, tiendas
- Cada tarjeta entra con animación diferente (slide desde left/bottom/right)
- Pide permisos nativos de geolocalización y notificaciones al entrar
- La vertical seleccionada filtra toda la app. Se puede cambiar desde el header

### AnimatedSplash.jsx _(componente, no página)_
- Pantalla completa fondo `#0D0D0D` con logo `/icon.png` bounce, glow naranja pulsante, texto "pidoo" fade-in, tagline
- Se muestra 1 vez por sesión del navegador (`sessionStorage: pido_splash_shown`)
- Timing nativo (Capacitor): 1.0s exit / 1.4s complete — Web: 2.2s exit / 2.6s complete
- CSS keyframes: `splashLogoIn`, `splashGlow`, `splashTextIn`, `splashOut`

### Home.jsx
- Carga establecimientos filtrados por `categoria_padre`
- **Muestra TODOS los restaurantes**, incluidos los fuera del radio de entrega
- Restaurantes fuera de radio: badge rojo "Fuera de zona" + separador "Más restaurantes"
- El bloqueo de pedido se hace en Carrito.jsx (no en Home)
- **Geolocalización automática al entrar:**
  - Llama a `getCurrentPosition()` al montar
  - Si el usuario no tiene dirección guardada (`!perfil.latitud || !perfil.longitud || !perfil.direccion`):
    - Hace reverse geocoding con Nominatim para obtener texto de dirección
    - Guarda en `usuarios`: latitud, longitud, direccion
    - Inserta en `direcciones_usuario` como `principal=true` (solo si no tiene ninguna)
  - Si ya tiene dirección guardada → solo actualiza `userLocation` local para el mapa
- Header muestra `perfil.direccion` o "Configura tu dirección" si está vacío
- Buscador, categorías, slider destacados, grid restaurantes, promociones, favoritos

### RestDetalle.jsx
- Header con banner, logo, nombre, rating, dirección, tipo de entrega
- **Sección de promociones** (scroll horizontal): icono, badge descuento, mínimo compra
- **Carta** organizada por categorías (tabs horizontales)
- **Lista de productos**: layout `[Foto] [Nombre + Desc + Precio] [+ botón]` — foto a la izquierda, descripción con clamp 2 líneas
- **Modal de producto**: tamaño, extras (checkbox/radio), cantidad, nota, precio en tiempo real

### Carrito.jsx
Modal bottom-sheet + barra flotante "Ver carrito". **Validación de dirección para delivery:**
- Requiere `perfil.latitud + perfil.longitud + perfil.direccion` (los tres)
- `sinDireccion` se inicializa desde el perfil real al montar (no `false` por defecto)
- Se recalcula en useEffect cuando cambia `perfil.latitud`, `perfil.longitud` o `perfil.direccion`
- Doble guarda: en `iniciarPago()` y en `crearPedido()` como red de seguridad
- Si no hay dirección → muestra formulario inline con GPS o búsqueda manual
- **Fuera de radio**: estado `fueraDeRadio` separado de `sinDireccion`, muestra alerta "Fuera de la zona de entrega" y sugiere recogida
- **Barra flotante**: respeta `env(safe-area-inset-bottom)` para no solapar BottomNav en PWA

**Flujo completo:**
- Selector Delivery / Recogida
- Promociones aplicadas automáticamente (mejor promo si supera mínimo)
- Propina: 0 / 1€ / 2€ / 3€
- Método de pago: Tarjeta (guardada o nueva) / Efectivo
- Notas del pedido
- Desglose: subtotal, descuento, envío (con km), propina, total

### Tracking.jsx
- Mapa Google Maps: marcadores restaurante (🏪), cliente (📍), rider (🛵)
- Posición del rider actualizada en tiempo real via Realtime
- Barra de progreso con 5 etapas
- Card del rider con botón llamar y WhatsApp
- Modal de valoración al entregar (1-5 estrellas + texto)

### Favoritos.jsx
- Lista establecimientos de `usuarios.favoritos[]`
- Toggle corazón → actualiza `usuarios.favoritos`

### Mapa.jsx
- Google Maps modo oscuro
- Markers establecimientos + riders activos en tiempo real
- InfoWindow con botón "Ver carta"

### MisPedidos.jsx
- Historial ordenado por fecha desc
- Filtros: Todos / Entregados / Cancelados
- Botón "Seguir" → Tracking activo
- Botón "Repetir pedido" → re-añade items al carrito

### Notificaciones.jsx
- Lista con badge en tiempo real (Realtime INSERT)
- Tipos: `pedido`, `promocion`, `sistema`
- Al abrir → marca todas como leídas

### Perfil.jsx
Secciones:
- **Datos personales**: avatar, nombre, apellido, teléfono, email (solo lectura)
- **Mis direcciones**: lista con badge PRINCIPAL, cambiar principal, eliminar, agregar nueva
  - Agregar: etiqueta (Casa/Trabajo/Otro), GPS o búsqueda manual
  - Cambiar principal: pone `principal=true` y actualiza `usuarios.latitud/longitud`
- **Método de pago**: tarjeta / efectivo (guarda en `usuarios.metodo_pago_preferido`)
- **Promociones**: todas las activas de todos los restaurantes
- **Configuración**: notificaciones, idioma (placeholder)
- **Ayuda**: FAQs expandibles
- **Cerrar sesión**

### SerSocio.jsx
Landing de captación de riders desde el Home.

### TiendaSocio.jsx
Tienda pública en `pidoo.es/{slug}`. Sin auth requerida. Canal `pidogo`.

### PaginaLegal.jsx
Términos, privacidad, cookies. Accesible desde `pidoo.es/terminos` y `pidoo.es/privacidad`.

---

## 6. MODELO DE DATOS RELEVANTE

### `usuarios` — perfil del cliente
```sql
id            UUID (= auth.users.id)
nombre        TEXT
apellido      TEXT
email         TEXT UNIQUE
telefono      TEXT
direccion     TEXT          -- dirección principal (texto, requerido para delivery)
latitud       FLOAT         -- coordenadas dirección principal
longitud      FLOAT
avatar_url    TEXT
favoritos     UUID[]
metodo_pago_preferido TEXT  -- "tarjeta" | "efectivo"
rol           TEXT          -- siempre "cliente" en pido-app
created_at    TIMESTAMPTZ
```

### `direcciones_usuario` — múltiples direcciones del cliente
```sql
id          UUID
usuario_id  UUID REFERENCES usuarios(id) ON DELETE CASCADE
etiqueta    TEXT          -- "Casa", "Trabajo", "Otro", "Mi ubicacion"
direccion   TEXT
latitud     FLOAT
longitud    FLOAT
principal   BOOLEAN       -- true = se usa para pedidos
created_at  TIMESTAMPTZ
```
- RLS: cada usuario solo ve y modifica las suyas
- Al aceptar geolocalización por primera vez → se inserta automáticamente con `principal=true`
- Al cambiar principal → `true` en una, `false` en el resto + actualiza `usuarios`

### `pedidos`
```sql
id, codigo, usuario_id, establecimiento_id, socio_id, canal, estado,
metodo_pago, modo_entrega, stripe_payment_id,
subtotal, coste_envio, propina, descuento, promo_titulo, total,
direccion_entrega, lat_entrega, lng_entrega, notas,
created_at, aceptado_at, recogido_at, entregado_at
```
Estados: `nuevo → aceptado → preparando → listo → recogido → en_camino → entregado`

_(ver PIDO-PROYECTO-COMPLETO.md para el resto de tablas)_

---

## 7. EDGE FUNCTIONS USADAS

| Función | Qué hace |
|---|---|
| `calcular_envio` | Distancia Haversine → coste envío. Devuelve `{ envio, distancia_km }` o `{ fuera_de_radio }` |
| `generar_codigo_pedido` | Genera código único tipo "PD-AB1234" |
| `crear_pago_stripe` | Crea PaymentIntent. Devuelve `clientSecret`. Crea/reutiliza Customer Stripe |
| `enviar_push` | Notificación push al restaurante tras crear pedido |
| `asignar_repartidor` | Busca socio activo más cercano (PostGIS) |

---

## 8. REALTIME SUBSCRIPTIONS

```
pedidos (UPDATE)       WHERE id = {pedidoActivo.id}      → estado tracking
socios (UPDATE)        WHERE id = {socio_id del pedido}   → posición rider en mapa
notificaciones (INSERT) WHERE usuario_id = {user.id}      → badge notificaciones
```

---

## 9. AUTH — FLUJO RESET DE CONTRASEÑA

1. Usuario pulsa "¿Olvidaste tu contraseña?" en Login
2. Introduce email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://pidoo.es/reset-password' })`
3. Supabase envía email con enlace a `https://pidoo.es/reset-password#access_token=...&type=recovery`
4. `TiendaDetector` detecta ruta `/reset-password` → renderiza `<ResetPassword />` sin auth
5. Componente captura sesión de recovery → muestra formulario nueva contraseña
6. `supabase.auth.updateUser({ password })` → éxito → signOut → redirect a `/`

**Requisito en Supabase dashboard:**
- Authentication → URL Configuration → Redirect URLs → agregar `https://pidoo.es/reset-password`
- Site URL: `https://pidoo.es`

---

## 10. PWA

- `manifest.json` — nombre "Pidoo", tema #FF6B2C, display standalone, portrait
- `sw.js` — Service Worker para caché offline
- `PWAInstallPrompt` — aparece tras 6-7s, diseño compacto con logo real (`/icon.png`):
  - Android/Chrome: captura `beforeinstallprompt`, botones "Ahora no" + "Instalar"
  - iOS/Safari: 2 pasos ultra-compactos (compartir → agregar a inicio)
  - No aparece en modo standalone ni en app nativa
  - Solo guarda `pwa_installed` si el usuario realmente instala (vuelve a aparecer si cierra sin instalar)

### Safe Area — BottomNav
```
BottomNav wrapper:  position:fixed; bottom:0 (sin padding externo)
BottomNav inner:    padding-bottom: calc(8px + env(safe-area-inset-bottom)) — safe-area DENTRO de la barra
Carrito flotante:   bottom: calc(82px + env(safe-area-inset-bottom))
Contenido App:      paddingBottom: calc(74px + env(safe-area-inset-bottom, 0px))
```
La barra se extiende hasta el borde inferior real del dispositivo (sin espacio negro debajo).

---

## 11. BUILD ANDROID

- **applicationId:** `es.pidoo.app`
- **versionCode:** 28 · **versionName:** 1.27
- **minSdkVersion:** 22 · **targetSdkVersion:** 34
- **Keystore:** `android/app/pidoo-apk.jks` (NO en git)

### Proceso de build release
```bash
npm run build
npx cap sync android
npx cap open android   # → Android Studio → Generate Signed APK/AAB
```

### Plugins Capacitor
`@capacitor/geolocation`, `@capacitor/push-notifications`, `@capacitor/splash-screen`,
`@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/browser`, `@capacitor/app`,
`@capacitor/local-notifications`, `@capawesome/capacitor-app-update`

---

## 12. VARIABLES DE ENTORNO

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_VAPID_PUBLIC_KEY=
```

---

## 13. RESPONSIVE

- **Mobile-first** — diseño para 375px en adelante
- **Tablet (≥768px):** grid 2 columnas, padding aumentado
- **Desktop (≥1024px):** grid 3 columnas
- **Landscape (max-height 500px):** banner reducido a 100px
- **Muy pequeño (<360px):** `.small-text`, `.small-heading`

---

## 14. PERFORMANCE

| Métrica | Valor |
|---|---|
| Bundle principal | ~266 KB · gzip: ~85 KB |
| Chunks (code splitting) | 36 chunks |
| Páginas lazy-loaded | 14 (todas excepto Login y BottomNav) |
| Tiempo build Vite | ~900ms |

---

## 15. ESTADO ACTUAL (2026-04-08)

| Módulo | Estado |
|---|---|
| Auth (login, registro, OAuth Google) | ✅ Completado |
| Reset de contraseña (email + página /reset-password) | ✅ Completado |
| Confirmación de email (pantalla + botón a login) | ✅ Completado |
| Splash animado (logo bounce, 1x por sesión) | ✅ Completado |
| Onboarding (selector vertical) | ✅ Completado |
| Home + búsqueda + favoritos + categorías | ✅ Completado |
| Restaurantes fuera de radio visibles con badge | ✅ Completado |
| Geolocalización auto + guardar dirección principal | ✅ Completado |
| Detalle restaurante + carta + extras/tamaños | ✅ Completado |
| Layout productos: foto izq + texto + botón der | ✅ Completado |
| Promociones en RestDetalle + Carrito | ✅ Completado |
| Carrito + checkout Stripe + efectivo | ✅ Completado |
| Bloqueo pedido fuera de radio (alerta + sugerir recogida) | ✅ Completado |
| Validación dirección delivery (lat + lng + texto) | ✅ Completado |
| Cálculo de envío (Edge Function, distancia real) | ✅ Completado |
| Tracking en tiempo real (Realtime + Google Maps real) | ✅ Completado |
| Mapa Google Maps (restaurantes + riders realtime) | ✅ Completado |
| Mis pedidos + historial + repetir pedido | ✅ Completado |
| Notificaciones (push + badge realtime) | ✅ Completado |
| Perfil + Mis direcciones (múltiples) | ✅ Completado |
| PWA (manifest, SW, install prompt compacto con logo) | ✅ Completado |
| BottomNav flush al fondo (safe-area dentro de la barra) | ✅ Completado |
| Carrito flotante respeta safe-area (sin solapar nav) | ✅ Completado |
| Tienda pública del socio (TiendaSocio en pidoo.es/{slug}) | ✅ Completado |
| Landing "Ser socio" | ✅ Completado |
| Code splitting + ErrorBoundary | ✅ Completado |
| Build Android (versionCode 28) | ✅ Activo |
| Build iOS | ⏳ Pendiente (requiere Mac) |
