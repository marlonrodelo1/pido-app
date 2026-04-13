# pido-app — Documentación Completa (App del Cliente)

> Versión Android: versionCode 28 · versionName 1.27 · applicationId: `es.pidoo.app`
> Web: https://pidoo.es · Auto-deploy en Dokploy al push a `main`

---

## 1. ¿QUÉ ES?

App móvil y PWA para el **cliente final** del ecosistema Pidoo. Permite:
- Buscar restaurantes, farmacias y tiendas cercanos por geolocalización
- Ver la carta, añadir al carrito, pagar (tarjeta Stripe o efectivo)
- Seguir el pedido en tiempo real (estado vía `shipday_status`)
- Gestionar múltiples direcciones de entrega
- Recibir notificaciones push del estado del pedido
- Funciona como APK nativo Android Y como PWA instalable

**Canal único:** todos los pedidos son canal `pido`. No existe canal "pidogo".

---

## 2. TECH STACK

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite |
| Mobile | Capacitor 6 (iOS + Android) |
| Backend | Supabase (PostgreSQL + Realtime + Edge Functions + Auth) |
| Pagos | Stripe (Payment Intents, tarjetas guardadas) |
| Mapas | Google Maps JavaScript API |
| Reparto | Shipday (plataforma externa de repartidores, auto-dispatch) |
| Push nativo | Firebase Cloud Messaging + @capacitor/push-notifications |
| Push web | Web Push API (VAPID) |
| Geocoding | Nominatim (OpenStreetMap) |
| Supabase proyecto | `rmrbxrabngdmpgpfmjbo` |
| Color principal | `#FF6B2C` (naranja) · Fondo `#0D0D0D` · Font: DM Sans |

---

## 3. ESTRUCTURA DE ARCHIVOS

```
src/
├── App.jsx              # Shell + routing + AuthProvider + CartProvider + AnimatedSplash
├── main.jsx             # Entry point (document.createElement — nunca innerHTML, XSS prevention)
├── index.css            # Variables CSS globales (--c-primary, --c-surface, --c-muted, etc)
├── App.css              # Animaciones globales
├── pages/
│   ├── Login.jsx           # Auth email/pass + Google OAuth + throttle 2s + bloqueo 60s tras 5 fallos
│   ├── ResetPassword.jsx   # Nueva contraseña (ruta /reset-password, sin auth)
│   ├── Onboarding.jsx      # Selector vertical Comida/Farmacia/Market (1 sola vez, localStorage)
│   ├── Home.jsx            # Listado restaurantes + geolocalizacion auto + guardar dirección
│   ├── RestDetalle.jsx     # Detalle restaurante + carta + extras/tamaños + promociones
│   ├── Carrito.jsx         # Carrito + checkout + Stripe + validación dirección + radio entrega
│   ├── Tracking.jsx        # Seguimiento pedido en tiempo real (shipday_status + Google Maps)
│   ├── Favoritos.jsx       # Restaurantes guardados
│   ├── Mapa.jsx            # Mapa Google con restaurantes
│   ├── MisPedidos.jsx      # Historial + repetir pedido
│   ├── Notificaciones.jsx  # Centro notificaciones + badge Realtime
│   ├── Perfil.jsx          # Datos + Mis direcciones + métodos de pago
│   └── PaginaLegal.jsx     # Términos y privacidad
├── components/
│   ├── AnimatedSplash.jsx  # Splash 1x por sesión (sessionStorage), bounce + glow naranja
│   ├── BottomNav.jsx       # Nav inferior con safe-area flush al fondo
│   ├── AddressInput.jsx    # Google Places Autocomplete
│   ├── EntregaBadge.jsx    # Badge delivery/recogida
│   ├── PWAInstallPrompt.jsx # Banner instalación PWA (6-7s delay)
│   └── Stars.jsx           # Valoración con estrellas
├── context/
│   ├── AuthContext.jsx     # Auth + perfil usuario + refresco proactivo JWT cada 60s
│   └── CartContext.jsx     # Estado carrito + envío + propina + persistencia localStorage
└── lib/
    ├── supabase.js         # Cliente Supabase (anon key + URL desde VITE_*)
    ├── stripe.js           # crearPagoStripe, listarTarjetas, pagarConTarjetaGuardada
    ├── webPush.js          # sendPush via enviar_push Edge Function
    ├── pushNotifications.js # Registro FCM en push_subscriptions
    ├── geolocation.js      # getCurrentPosition (Capacitor + web fallback)
    ├── horario.js          # estaAbierto() — calcula si restaurante está abierto
    ├── alarm.js            # Sonido notificación
    └── theme.js            # Variables de tema
```

---

## 4. FLUJO DE ARRANQUE

```
index.html
  └─ main.jsx
       └─ App.jsx → ErrorBoundary
            ├─ AnimatedSplash (1x por sesión)
            ├─ /reset-password  → ResetPassword (sin auth)
            ├─ /terminos|/privacidad → PaginaLegal (sin auth)
            └─ AuthProvider + CartProvider → AppContent
                 ├─ loading → pantalla oscura
                 ├─ !user → Login
                 ├─ !onboarded → Onboarding
                 └─ Shell principal (header + secciones + BottomNav)
```

**localStorage keys:**
- `pido_welcomed` — carousel bienvenida ya mostrado
- `pido_onboarded` — onboarding completado
- `pido_cart` — carrito persistido
- `pido_categoria` — categoría seleccionada en Home

---

## 5. CONTEXTOS

### AuthContext
```
user          — objeto Supabase Auth
perfil        — fila tabla `usuarios`
loading       — true mientras verifica sesión inicial
login / registro / logout / updatePerfil / fetchPerfil / resetPassword
```
- Refresco proactivo: cada 60s verifica si JWT expira en < 5min y lo renueva
- Si perfil no existe tras login → reintenta 3 veces con 800ms de espera
- Si rol no es `cliente` → cierra sesión automáticamente
- Tras login registra push notifications (web VAPID + FCM nativo)

### CartContext
```
carrito[]       — [{establecimiento_id, producto_id, nombre, precio_unitario, cantidad, tamano, extras}]
addItem / removeItem / clearCart
propina         — 0, 1, 2 o 3€
metodoPago      — 'tarjeta' | 'efectivo'
modoEntrega     — 'delivery' | 'recogida'
subtotal / envio / total / totalItems
calcularEnvio(lat, lng)
```
- `tamano` = **string nombre** (ej: "Grande"), NO un ID
- `extras` = **array de nombres** (ej: ["Sin cebolla"]), NO IDs
- Carrito persiste en `localStorage` en cada cambio
- `useRef(carritoRef)` para acceder al carrito en callbacks async sin stale closures

---

## 6. FLUJO DE PEDIDO

```
iniciarPago()
  1. isPaying.current = true  ← ref anti-doble-click
  2. insertarPedidoEnBD('pendiente_pago')  [canal='pido']
  3a. tarjeta guardada → pagarConTarjetaGuardada()
  3b. tarjeta nueva → crearPagoStripe() → setPasoTarjeta(true) → FormularioPago
  4. onSuccess(paymentIntentId) → confirmarPago() → estado='nuevo'
  5. finalizarPedido() → clearCart + sendPush al restaurante

Restaurante acepta → estado='aceptado' → se dispara create-shipday-order
Shipday asigna repartidor automáticamente (auto-dispatch)
shipday-webhook actualiza shipday_status + timestamps (recogido_at, entregado_at)
Cliente hace tracking vía pedidos.shipday_status en tiempo real
```

**Validación dirección delivery:** requiere `perfil.latitud + perfil.longitud + perfil.direccion` (los tres).
**Fuera de radio:** estado `fueraDeRadio` separado, sugiere recogida.

---

## 7. TRACKING (Tracking.jsx)

El seguimiento del pedido lee `pedidos.shipday_status` en tiempo real via Realtime subscription sobre la tabla `pedidos`. No hay subscripción a posición de rider en tiempo real desde nuestra BD — el estado viene del webhook de Shipday que actualiza el campo `shipday_status`.

**Estados de pedido:**
`pendiente_pago → nuevo → aceptado → en_preparacion → listo → en_camino → entregado`
Salida: `cancelado`, `fallido`, `rechazado`

---

## 8. STRIPE (stripe.js)

```js
// SIEMPRE usa JWT del usuario, NO la anon key
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token || SUPABASE_ANON_KEY
```

Funciones:
- `crearPagoStripe({amount, pedidoCodigo, customerEmail, userId})`
- `listarTarjetas(userId)`
- `pagarConTarjetaGuardada({paymentMethodId, amount, pedidoCodigo, customerEmail, userId})`

---

## 9. EDGE FUNCTIONS

| Función | Descripción | Auth |
|---|---|---|
| `calcular_envio` | Haversine → coste envío + radio cobertura | JWT usuario |
| `generar_codigo_pedido` | Código PD-XXXXX secuencial | verify_jwt=false |
| `crear_pago_stripe` | PaymentIntent + rate limiting + validación precio | JWT usuario |
| `enviar_push` | Push FCM (acepta JWT usuario O service role key) | Ambos |
| `create-shipday-order` | Crea orden en Shipday al aceptar pedido (lo llama panel-restaurante) | Service role |
| `shipday-webhook` | Recibe actualizaciones de Shipday → actualiza shipday_status | Público |
| `crear_reembolso_stripe` | Reembolso para pedidos cancelados | JWT usuario |
| `calcular_comisiones` | Comisiones plataforma al entregar | JWT usuario |

**crear_pago_stripe protecciones:**
1. JWT obligatorio
2. Rate limiting: rechaza si hay otro pedido en `pendiente_pago`/`nuevo` en los últimos 30s
3. Valida que `amount` del cliente coincide con `pedido.total` de BD (diff máx 0.01€)

---

## 10. REALTIME SUBSCRIPTIONS

```
pedidos (UPDATE)        WHERE id = {pedidoActivo.id}    → estado + shipday_status tracking
notificaciones (INSERT) WHERE usuario_id = {user.id}    → badge notificaciones
```

---

## 11. BASE DE DATOS (tablas principales)

- `usuarios` — clientes (nombre, apellido, telefono, direccion, latitud, longitud, favoritos UUID[], rol, stripe_customer_id)
- `direcciones_usuario` — múltiples dirs por cliente (etiqueta, principal, lat, lng)
- `establecimientos` — restaurantes (nombre, tipo, horario JSONB, activo, lat, lng, radio_cobertura_km)
- `pedidos` — (estado, shipday_status, shipday_order_id, usuario_id, establecimiento_id, canal='pido', metodo_pago, modo_entrega, subtotal, coste_envio, propina, total, stripe_payment_id, recogido_at, entregado_at)
- `pedido_items` — (tamano = nombre string, extras = array nombres)
- `productos` — menu (nombre, precio, disponible, imagen_url, categoria_id)
- `push_subscriptions` — tokens FCM por usuario/restaurante
- `notificaciones` — notificaciones in-app (leida flag)
- `promociones` — promos activas (descuento_porcentaje, descuento_fijo, 2x1)

---

## 12. PATRONES DE CÓDIGO

```js
// Supabase .or() — usar + en lugar de template literals
.or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())  // ✅
.or(`fecha_fin.is.null,fecha_fin.gt.${new Date().toISOString()}`)  // ❌

// main.jsx — nunca innerHTML (XSS)
document.createElement('div')  // ✅
element.innerHTML = '...'       // ❌
```

- **Inline styles** con CSS vars (`var(--c-primary)`, `var(--c-text)`, `var(--c-muted)`)
- **`<style>` tags inline** para keyframes — ver `Onboarding.jsx` y `AnimatedSplash.jsx`
- **Lazy + Suspense** para todas las páginas excepto `Login` y `AnimatedSplash`

---

## 13. PWA Y SAFE AREA

```css
BottomNav wrapper:  position:fixed; bottom:0
BottomNav inner:    padding-bottom: calc(8px + env(safe-area-inset-bottom))
Carrito flotante:   bottom: calc(82px + env(safe-area-inset-bottom))
Contenido App:      padding-bottom: calc(74px + env(safe-area-inset-bottom, 0px))
```

---

## 14. BUILD ANDROID

```bash
npm run build
npx cap sync android
npx cap open android   # Android Studio → Generate Signed APK/AAB
```

- **applicationId:** `es.pidoo.app` · versionCode 28 · versionName 1.27
- **Keystore:** `android/app/pidoo-apk.jks` (NO en git)

---

## 15. VARIABLES DE ENTORNO

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```
