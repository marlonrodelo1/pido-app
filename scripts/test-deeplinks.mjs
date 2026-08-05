/* Casos del parser de deep links. Sin dependencias: `npm run test:deeplinks`.
 * src/lib/deepLinks.js es un módulo puro justamente para poder correrlo así. */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDeepLink, slugValido, slugDeRutaApp, detectarPlataforma,
  urlIntentAndroid, urlEsquemaApp, GPLAY,
} from '../src/lib/deepLinks.js'

/* ── Lo que SÍ debe abrir un restaurante dentro de la app ─────────────── */

test('esquema propio con slug abre la ficha en el shell', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://r/maxpizza'),
    { tipo: 'interna', ruta: '/app/r/maxpizza' })
})

test('el host del esquema propio no viene normalizado: R/ también vale', () => {
  // new URL() no baja a minúsculas el host de un esquema no estándar.
  assert.deepEqual(parseDeepLink('com.pidoo.app://R/MaxPizza'),
    { tipo: 'interna', ruta: '/app/r/maxpizza' })
})

test('la pagina puente https tambien abre la ficha', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/rincon-de-fran'),
    { tipo: 'interna', ruta: '/app/r/rincon-de-fran' })
})

test('www.pidoo.es se acepta igual', () => {
  assert.deepEqual(parseDeepLink('https://www.pidoo.es/abrir/mamma-mia'),
    { tipo: 'interna', ruta: '/app/r/mamma-mia' })
})

test('la query se conserva (esquema propio)', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://r/maxpizza?utm_source=flyer&utm_medium=qr'),
    { tipo: 'interna', ruta: '/app/r/maxpizza?utm_source=flyer&utm_medium=qr' })
})

test('la query se conserva (https)', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/dar-kebab?token=abc123'),
    { tipo: 'interna', ruta: '/app/r/dar-kebab?token=abc123' })
})

test('?code= en la pagina puente es un parametro de campana, no un login', () => {
  // Este es el orden que importa: /abrir/ se resuelve ANTES de mirar
  // credenciales, o un enlace de promo se clasificaria como OAuth.
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/maxpizza?code=PROMO10'),
    { tipo: 'interna', ruta: '/app/r/maxpizza?code=PROMO10' })
})

/* ── Lo que NO se debe tragar: el login ───────────────────────────────── */

test('callback OAuth por esquema propio con tokens en el hash', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://login#access_token=aaa&refresh_token=bbb'),
    { tipo: 'oauth' })
})

test('callback OAuth por esquema propio con code en la query', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://login?code=xyz'), { tipo: 'oauth' })
})

test('login cancelado (sin tokens) sigue siendo del OAuth, no navega', () => {
  // Si esto cayera en el caso generico, cancelar el login desde la tienda de
  // un socio sacaria al usuario de /s/<slug> a la home.
  assert.deepEqual(parseDeepLink('com.pidoo.app://login?error=access_denied'), { tipo: 'oauth' })
})

test('callback https de Supabase (el que reclama el manifest)', () => {
  assert.deepEqual(
    parseDeepLink('https://rmrbxrabngdmpgpfmjbo.supabase.co/auth/v1/callback?code=abc'),
    { tipo: 'oauth' })
})

test('esquema iOS heredado (median) con credenciales va al login', () => {
  assert.deepEqual(parseDeepLink('co.median.ios.bnlkxpx://login?code=abc'), { tipo: 'oauth' })
})

test('esquema iOS heredado SIN credenciales no hace nada', () => {
  assert.deepEqual(parseDeepLink('co.median.ios.bnlkxpx://algo'), { tipo: 'ninguna' })
})

/* ── Lo que debe salir al navegador ───────────────────────────────────── */

test('la ficha publica del restaurante NO se la queda la app', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/maxpizza'),
    { tipo: 'externa', url: 'https://pidoo.es/maxpizza' })
})

test('paginas legales al navegador', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/terminos'),
    { tipo: 'externa', url: 'https://pidoo.es/terminos' })
})

test('la tienda de un socio al navegador', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/s/agora-express'),
    { tipo: 'externa', url: 'https://pidoo.es/s/agora-express' })
})

test('un dominio ajeno al navegador', () => {
  assert.deepEqual(parseDeepLink('https://google.com/algo'),
    { tipo: 'externa', url: 'https://google.com/algo' })
})

/* ── Lo que va a la home en vez de rebotar (evita el bucle) ───────────── */

test('/abrir sin slug va a la home, no al navegador', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir'), { tipo: 'interna', ruta: '/app' })
})

test('/abrir/ con barra final va a la home', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/'), { tipo: 'interna', ruta: '/app' })
})

test('/abrir con slug invalido va a la home', () => {
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/max_pizza'), { tipo: 'interna', ruta: '/app' })
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/Max%20Pizza'), { tipo: 'interna', ruta: '/app' })
})

test('el ../ se normaliza antes de llegar aqui: ya no es /abrir/', () => {
  // new URL() colapsa el path, asi que esto no es un enlace de /abrir con un
  // slug raro: es otra ruta cualquiera de pidoo.es y va al navegador.
  assert.deepEqual(parseDeepLink('https://pidoo.es/abrir/../../etc'),
    { tipo: 'externa', url: 'https://pidoo.es/abrir/../../etc' })
})

test('esquema propio desconocido va a la home', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://loquesea'), { tipo: 'interna', ruta: '/app' })
})

test('esquema propio pelado va a la home', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://'), { tipo: 'interna', ruta: '/app' })
})

test('r/ sin slug va a la home', () => {
  assert.deepEqual(parseDeepLink('com.pidoo.app://r/'), { tipo: 'interna', ruta: '/app' })
})

/* ── Entradas rotas ───────────────────────────────────────────────────── */

test('basura, null y vacio no revientan', () => {
  for (const v of ['', 'no-soy-una-url', null, undefined, 42, {}]) {
    assert.deepEqual(parseDeepLink(v), { tipo: 'ninguna' }, 'fallo con ' + String(v))
  }
})

/* ── Validación de slug ───────────────────────────────────────────────── */

test('slugValido acepta lo que produce el panel y rechaza el resto', () => {
  for (const ok of ['maxpizza', 'rincon-de-fran', 'a', 'come-y-calla', 'drink2home']) {
    assert.equal(slugValido(ok), true, 'deberia aceptar ' + ok)
  }
  for (const ko of ['Max Pizza', 'max;pizza', 'max#pizza', 'max/pizza', 'MAXPIZZA',
                    'max_pizza', 'maxpizzá', '', null, undefined, 'x'.repeat(65)]) {
    assert.equal(slugValido(ko), false, 'deberia rechazar ' + String(ko))
  }
})

test('slugDeRutaApp es el inverso de la ruta interna', () => {
  assert.equal(slugDeRutaApp('/app/r/maxpizza'), 'maxpizza')
  assert.equal(slugDeRutaApp('/app/r/maxpizza/'), 'maxpizza')
  assert.equal(slugDeRutaApp('/app'), null)
  assert.equal(slugDeRutaApp('/app/r/'), null)
  assert.equal(slugDeRutaApp('/s/agora-express'), null)   // tienda de socio, no toca
  assert.equal(slugDeRutaApp('/maxpizza'), null)
  assert.equal(slugDeRutaApp('/app/r/max%20pizza'), null) // decodifica y rechaza
  assert.equal(slugDeRutaApp('/app/r/%E0%A4%A'), null)    // decode roto, no revienta
})

/* ── Enlaces salientes ────────────────────────────────────────────────── */

test('el intent de Android lleva paquete, esquema y fallback a Play', () => {
  const intent = urlIntentAndroid('maxpizza')
  assert.equal(intent,
    'intent://r/maxpizza#Intent;scheme=com.pidoo.app;package=com.pidoo.app'
    + ';S.browser_fallback_url=' + encodeURIComponent(GPLAY) + ';end')
  // El fallback va codificado: sus ':' y '/' no pueden leerse como sintaxis
  // del intent.
  assert.ok(!intent.split('S.browser_fallback_url=')[1].includes(';end;'))
})

test('un slug invalido no construye enlace (no se inyecta en el intent)', () => {
  for (const ko of ['max;package=com.otra.app', 'max#Intent', 'MAX', '', null]) {
    assert.equal(urlIntentAndroid(ko), null, 'deberia rechazar ' + String(ko))
    assert.equal(urlEsquemaApp(ko), null, 'deberia rechazar ' + String(ko))
  }
})

/* ── Deteccion de plataforma (decide la insignia y el modo de lanzar) ──── */

test('detectarPlataforma distingue android, ios y escritorio', () => {
  assert.equal(detectarPlataforma('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/148', 5), 'android')
  assert.equal(detectarPlataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605', 5), 'ios')
  assert.equal(detectarPlataforma('Mozilla/5.0 (iPad; CPU OS 17_0) Safari/605', 5), 'ios')
  assert.equal(detectarPlataforma('Mozilla/5.0 (Windows NT 10.0) Chrome/148', 0), 'escritorio')
  assert.equal(detectarPlataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605', 0), 'escritorio')
})

test('el iPad moderno se hace pasar por Mac: lo delata el tactil', () => {
  const uaIpadOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
  assert.equal(detectarPlataforma(uaIpadOS, 5), 'ios')          // iPad de verdad
  assert.equal(detectarPlataforma(uaIpadOS, 0), 'escritorio')   // Mac de verdad
})

test('sin navegador (SSR/node) no revienta y cae a escritorio', () => {
  assert.equal(detectarPlataforma('', 0), 'escritorio')
  assert.equal(detectarPlataforma(null, 0), 'escritorio')
  assert.equal(detectarPlataforma(undefined, undefined), 'escritorio')
})

test('el esquema de iOS apunta a la misma ruta que entiende el parser', () => {
  const url = urlEsquemaApp('mamma-mia')
  assert.equal(url, 'com.pidoo.app://r/mamma-mia')
  assert.deepEqual(parseDeepLink(url), { tipo: 'interna', ruta: '/app/r/mamma-mia' })
})
