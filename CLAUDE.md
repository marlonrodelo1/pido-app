# pido-app - Documentacion Completa

## Resumen
App de cliente para la plataforma PIDOO. Permite buscar restaurantes, hacer pedidos, pagar con tarjeta/efectivo, seguir el reparto en tiempo real y gestionar el perfil.

**Stack:** React 19 + Vite + Capacitor (Android/iOS) + Supabase 2.39 + Stripe
**Theme:** Dark mode, color primario `#FF6B2C` (naranja), tipografia DM Sans
**App ID Android:** com.pido.app
**Web:** https://pidoo.es (Dokploy auto-deploy)
**CSP img-src:** `https:` (permite cualquier imagen HTTPS, incluyendo Unsplash usado en datos de prueba)

---

## Flujo de pantallas

```
Splash animado (2.5s, siempre)
  → WelcomeCarousel (solo primera vez, localStorage 'pido_welcomed')
    → Login
      → Onboarding (solo primera vez, localStorage 'pido_onboarded')
        → App principal (Home, Mapa, MisPedidos, Favoritos, Perfil)
```

**localStorage keys importantes:**
- `pido_welcomed` — si el carousel de bienvenida ya se mostro
- `pido_onboarded` — si el onboarding ya se completo
- `pido_cart` — carrito persistido entre sesiones
- `pido_categoria` — categoria seleccionada en Home

---

## Estructura de archivos

```
pido-app/
├── src/
│   ├── App.jsx              # Router principal + AuthProvider + CartProvider + AnimatedSplash
│   ├── main.jsx             # Entry point (sin innerHTML, usa createElement para evitar XSS)
│   ├── index.css            # Variables CSS globales (--c-primary, --c-surface, --c-muted, etc)
│   ├── App.css              # Animaciones globales
│   ├── pages/
│   │   ├── Home.jsx            # Listado restaurantes con filtros por categoria
│   │   ├── RestDetalle.jsx     # Detalle restaurante + menu + agregar al carrito
│   │   ├── Carrito.jsx         # Carrito + checkout + pago tarjeta/efectivo
│   │   ├── Tracking.jsx        # Seguimiento pedido en tiempo real
│   │   ├── MisPedidos.jsx      # Historial de pedidos del cliente
│   │   ├── Favoritos.jsx       # Restaurantes favoritos
│   │   ├── Mapa.jsx            # Mapa de restaurantes cercanos
│   │   ├── Notificaciones.jsx  # Centro de notificaciones
│   │   ├── Perfil.jsx          # Datos de usuario, direccion, tarjetas guardadas
│   │   ├── Login.jsx           # Auth email/password (rate limiting + bloqueo 60s tras 5 fallos)
│   │   ├── Onboarding.jsx      # Completar perfil tras primer login
│   │   ├── SerSocio.jsx        # Formulario solicitud ser repartidor
│   │   ├── TiendaSocio.jsx     # Tienda interna para socios
│   │   ├── ResetPassword.jsx   # Restablecer contraseña
│   │   └── PaginaLegal.jsx     # Terminos y condiciones, privacidad
│   ├── components/
│   │   ├── AnimatedSplash.jsx  # Splash animado (2.5s, bounce + glow naranja, siempre al iniciar)
│   │   ├── BottomNav.jsx       # Navegacion inferior (Home, Mapa, MisPedidos, Favoritos, Perfil)
│   │   ├── AddressInput.jsx    # Input direccion con geocoding (Nominatim)
│   │   ├── EntregaBadge.jsx    # Badge modo entrega (delivery/recogida)
│   │   ├── PWAInstallPrompt.jsx # Banner instalacion PWA
│   │   └── Stars.jsx           # Componente valoracion con estrellas
│   ├── context/
│   │   ├── AuthContext.jsx     # Auth + perfil usuario + refresco proactivo de sesion
│   │   └── CartContext.jsx     # Estado del carrito + calculo envio + propina + modo entrega
│   └── lib/
│       ├── supabase.js         # Cliente Supabase (anon key + URL desde VITE_*)
│       ├── stripe.js           # crearPagoStripe, listarTarjetas, pagarConTarjetaGuardada
│       ├── webPush.js          # sendPush — notificaciones push via enviar_push Edge Function
│       ├── pushNotifications.js # Registro FCM token en tabla push_subscriptions
│       ├── geolocation.js      # getCurrentPosition wrapper
│       ├── horario.js          # estaAbierto() — calcula si un restaurante esta abierto ahora
│       ├── alarm.js            # Alarma sonora para nuevos pedidos
│       └── theme.js            # Variables de tema
├── nginx.conf              # Produccion: CSP, HSTS, gzip, cache, SPA routing
├── Dockerfile              # Multi-stage: node build + nginx serve
└── package.json
```

---

## Contextos

### AuthContext.jsx
- `user` — usuario autenticado de Supabase (id, email)
- `perfil` — datos de tabla `usuarios` (nombre, apellido, telefono, direccion, latitud, longitud)
- `loading` — true mientras se resuelve la sesion inicial
- `updatePerfil(cambios)` — actualiza `usuarios` en BD + estado local
- `traducirError(msg)` — convierte errores de Supabase auth a espanol
- **Refresco proactivo:** cada 60s verifica si el JWT expira en < 5 min y lo renueva

### CartContext.jsx
- `carrito` — array de items `{producto_id, nombre, tamano, extras, precio_unitario, cantidad, establecimiento_id}`
- `addItem(item)` / `removeItem(index)` / `clearCart()`
- `subtotal`, `envio`, `total`, `totalItems`, `propina`
- `metodoPago` — `'tarjeta'` o `'efectivo'`
- `modoEntrega` — `'delivery'` o `'recogida'`
- `calcularEnvio(lat, lng, canal)` — llama a Edge Function `calcular_envio`
- **Persistencia:** carrito se guarda en `localStorage` en cada cambio

**IMPORTANTE sobre items del carrito:**
- `tamano` es un **string nombre** (ej: "Grande"), NO un `tamano_id`
- `extras` es un **array de nombres** (ej: ["Sin cebolla", "Extra queso"]), NO IDs
- Estos strings son los que se insertan en `pedido_items` al crear el pedido

---

## Flujo de pago con tarjeta (Carrito.jsx)

```
iniciarPago()
  1. isPaying.current = true  (ref anti-doble-click)
  2. insertarPedidoEnBD('pendiente_pago')  ← crea pedido en BD
  3a. Si tarjeta guardada → pagarConTarjetaGuardada()
  3b. Si tarjeta nueva → crearPagoStripe() → setPasoTarjeta(true) → FormularioPago
  4. onSuccess(paymentIntentId) → confirmarPago() → estado='nuevo'
  5. finalizarPedido() → clearCart + sendPush al restaurante
```

**Anti-doble-pago:** `isPaying = useRef(false)` — bloquea llamadas concurrentes a `iniciarPago()`.

---

## stripe.js — Llamadas a Edge Function

```js
// IMPORTANTE: usa JWT del usuario autenticado, NO la anon key
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token || SUPABASE_ANON_KEY
```

Funciones exportadas:
- `crearPagoStripe({amount, pedidoCodigo, customerEmail, userId})` — crea PaymentIntent
- `listarTarjetas(userId)` — lista tarjetas guardadas en Stripe del usuario
- `pagarConTarjetaGuardada({paymentMethodId, amount, pedidoCodigo, customerEmail, userId})` — cobra con tarjeta guardada

---

## Login.jsx — Seguridad

- **Throttle:** 5000ms entre intentos de login
- **Bloqueo temporal:** 5 fallos consecutivos → bloqueado 60 segundos
- **Validacion de contrasena en registro:** `/^(?=.*[A-Z])(?=.*\d).{8,}$/` — minimo 8 chars, 1 mayuscula, 1 numero
- **Hint visible:** "Minimo 8 caracteres · 1 mayuscula · 1 numero" debajo del campo en modo registro

---

## RestDetalle.jsx — Patron importante

**Usar `+` en lugar de template literals en `.or()` de Supabase:**
```js
// CORRECTO
.or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())

// INCORRECTO (puede causar inyeccion)
.or(`fecha_fin.is.null,fecha_fin.gt.${new Date().toISOString()}`)
```

---

## Edge Functions de Supabase

Todas tienen `verify_jwt=false` en Supabase pero implementan **verificacion JWT propia** en el codigo.

| Funcion | Descripcion | Auth |
|---|---|---|
| `crear_pago_stripe` | PaymentIntent Stripe + rate limiting + validacion precio | JWT usuario |
| `calcular_envio` | Coste envio por distancia (Haversine) + validacion radio | JWT usuario |
| `calcular_comisiones` | Comisiones plataforma/socio al entregar pedido | JWT usuario |
| `crear_reembolso_stripe` | Reembolso Stripe para pedidos cancelados/fallidos | JWT usuario |
| `asignar_repartidor` | Asigna rider mas cercano disponible | JWT usuario |
| `reasignar_pedidos_huerfanos` | Reasigna pedidos sin rider | JWT usuario |
| `enviar_push` | Push FCM — acepta JWT usuario O service role key | Ambos |
| `generar_codigo_pedido` | Codigos PD-XXXXX secuenciales | verify_jwt=false |

### crear_pago_stripe — Protecciones de seguridad
1. **JWT obligatorio:** rechaza si no es un usuario autenticado valido
2. **Rate limiting:** rechaza (429) si el usuario tiene otro pedido en `pendiente_pago`/`nuevo` creado en los ultimos 30s (excluye el pedido actual por `pedido_codigo`)
3. **Validacion de precio:** compara `amount` del cliente con `pedido.total` de la BD; rechaza si difieren > 0.01 EUR; usa siempre el valor del servidor para cobrar

### enviar_push — Bypass service role
```typescript
// Acepta llamadas inter-funcion con service role key
const token = authHeader.replace('Bearer ', '')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
if (token !== serviceRoleKey) {
  // verificar JWT normal
}
```
Los campos esperados son `target_type` / `target_id` (snake_case, NO camelCase).

---

## Base de datos (tablas principales)

- `usuarios` — clientes (nombre, apellido, telefono, direccion, latitud, longitud, stripe_customer_id)
- `establecimientos` — restaurantes (nombre, tipo, horario JSONB, activo, latitud, longitud, radio_cobertura_km)
- `pedidos` — pedidos (estado, usuario_id, establecimiento_id, socio_id, canal, metodo_pago, modo_entrega, subtotal, coste_envio, propina, total, stripe_payment_id, stripe_refund_id)
- `pedido_items` — items del pedido (`tamano` = nombre string, `extras` = array de nombres)
- `productos` — menu del restaurante (nombre, precio, disponible, imagen_url, categoria_id)
- `push_subscriptions` — tokens FCM por usuario/socio/restaurante
- `notificaciones` — notificaciones in-app del cliente (leida flag)
- `promociones` — promos activas (descuento_porcentaje, descuento_fijo, 2x1, producto_gratis)
- `comisiones` — comisiones calculadas al entregar cada pedido
- `movimientos_cuenta` — movimientos financieros (entrada_tarjeta, entrada_efectivo, reembolso)

### Estados de pedido (flujo normal):
`pendiente_pago` → `nuevo` → `aceptado` → `en_preparacion` → `listo` → `en_camino` → `entregado`

Estados de salida: `cancelado`, `fallido`, `rechazado`

---

## Build y Deploy

### Web (Dokploy):
- Push a `main` → auto-deploy via webhook
- Dockerfile multi-stage: `node:20-alpine` build + `nginx:alpine` serve
- URL: https://pidoo.es
- `nginx.conf`: CSP con `img-src 'self' data: blob: https:`, HSTS, gzip, SPA routing (`try_files $uri /index.html`)

### Android (Capacitor):
```bash
npm run build
npx cap sync android
# Android Studio → Generate Signed Bundle/APK
```

### Variables de entorno (.env):
```
VITE_SUPABASE_URL=https://rmrbxrabngdmpgpfmjbo.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_FIREBASE_*=...
```

---

## Patrones de codigo

- **Inline styles** con CSS vars (`var(--c-primary)`, `var(--c-text)`, `var(--c-muted)`) — no hay clases CSS externas
- **`<style>` tags inline** para keyframes de animacion — ver `Onboarding.jsx` y `AnimatedSplash.jsx`
- **Lazy + Suspense** para todas las paginas excepto `Login` y `AnimatedSplash` (primero en renderizar)
- **main.jsx:** usa `document.createElement` para mensajes de error — nunca `innerHTML` (XSS prevention)
- **CartContext:** `useRef(carritoRef)` para acceder al carrito actual dentro de callbacks async sin stale closures
