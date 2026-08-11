// Tests del reconocimiento de enlaces de Pidoo Creadores.
//   npm run test:creadores
//
// Mismo patrón que test-deeplinks.mjs: `node --test`, cero dependencias nuevas.
// El módulo es puro a propósito para poder probarse sin montar React.

import test from 'node:test'
import assert from 'node:assert/strict'
import { analizarUrlVideo, normalizarUrl } from '../src/lib/videoUrl.js'

// ── TikTok: lo que copia el botón Compartir ─────────────────────────────────

test('tiktok: enlace largo con @usuario', () => {
  const r = analizarUrlVideo('https://www.tiktok.com/@come.y.calla/video/7412345678901234567')
  assert.equal(r.ok, true)
  assert.equal(r.red, 'tiktok')
  assert.equal(r.videoId, '7412345678901234567')
  assert.equal(r.usuario, 'come.y.calla')
  assert.equal(r.corto, false)
})

test('tiktok: la querystring de Compartir no cambia el id', () => {
  const a = analizarUrlVideo('https://www.tiktok.com/@ana/video/7412345678901234567?is_from_webapp=1&sender_device=pc')
  const b = analizarUrlVideo('https://tiktok.com/@ana/video/7412345678901234567')
  assert.equal(a.videoId, b.videoId)
  // Y sobre todo: la MISMA url normalizada, o el antifraude del servidor las
  // trataría como dos vídeos distintos.
  assert.equal(a.urlNormalizada, b.urlNormalizada)
})

test('tiktok: sin protocolo (lo que pega Android a veces)', () => {
  const r = analizarUrlVideo('www.tiktok.com/@ana/video/7412345678901234567')
  assert.equal(r.ok, true)
  assert.equal(r.videoId, '7412345678901234567')
})

test('tiktok: enlace dentro de un texto compartido', () => {
  const r = analizarUrlVideo('Mira mi vídeo https://www.tiktok.com/@ana/video/7412345678901234567 ¿qué te parece?')
  assert.equal(r.ok, true)
  assert.equal(r.videoId, '7412345678901234567')
})

test('tiktok: /photo/ (carrusel) también cuenta', () => {
  const r = analizarUrlVideo('https://www.tiktok.com/@ana/photo/7412345678901234567')
  assert.equal(r.ok, true)
  assert.equal(r.videoId, '7412345678901234567')
})

test('tiktok: m.tiktok.com/v/<id>.html', () => {
  const r = analizarUrlVideo('https://m.tiktok.com/v/7412345678901234567.html')
  assert.equal(r.ok, true)
  assert.equal(r.videoId, '7412345678901234567')
})

// ── Enlaces cortos: se aceptan, pero SIN id ─────────────────────────────────
// Esto es la decisión de diseño más importante del módulo. Son redirecciones:
// el id solo se sabe siguiéndolas, y aquí no hay red. Rechazarlos sería
// rechazar justo lo que copia el botón Compartir.

for (const url of [
  'https://vm.tiktok.com/ZMabcdefg/',
  'https://vt.tiktok.com/ZSabcdefg/',
  'https://www.tiktok.com/t/ZTabcdefg/',
]) {
  test(`tiktok corto se acepta sin id: ${url}`, () => {
    const r = analizarUrlVideo(url)
    assert.equal(r.ok, true)
    assert.equal(r.red, 'tiktok')
    assert.equal(r.videoId, null)
    assert.equal(r.corto, true)
  })
}

// ── Instagram ───────────────────────────────────────────────────────────────

test('instagram: reel directo', () => {
  const r = analizarUrlVideo('https://www.instagram.com/reel/CxYzAbC1234/')
  assert.equal(r.ok, true)
  assert.equal(r.red, 'instagram')
  assert.equal(r.videoId, 'CxYzAbC1234')
})

test('instagram: /reels/ en plural', () => {
  assert.equal(analizarUrlVideo('https://www.instagram.com/reels/CxYzAbC1234/').videoId, 'CxYzAbC1234')
})

test('instagram: /p/ (publicación de vídeo)', () => {
  assert.equal(analizarUrlVideo('https://instagram.com/p/CxYzAbC1234/').videoId, 'CxYzAbC1234')
})

test('instagram: con el usuario delante, el id NO es el usuario', () => {
  const r = analizarUrlVideo('https://www.instagram.com/mamma.mia.tf/reel/CxYzAbC1234/')
  assert.equal(r.videoId, 'CxYzAbC1234')
  assert.equal(r.usuario, 'mamma.mia.tf')
})

test('instagram: enlace share/ se acepta sin id', () => {
  const r = analizarUrlVideo('https://www.instagram.com/share/reel/BAbCdEfGh')
  assert.equal(r.ok, true)
  assert.equal(r.red, 'instagram')
  assert.equal(r.videoId, null)
  assert.equal(r.corto, true)
})

// ── Lo que NO vale, con su motivo ───────────────────────────────────────────

test('perfil de instagram sin vídeo: se rechaza con instrucciones', () => {
  const r = analizarUrlVideo('https://www.instagram.com/mamma.mia.tf/')
  assert.equal(r.ok, false)
  assert.match(r.motivo, /Compartir/)
})

test('perfil de tiktok sin vídeo: se rechaza', () => {
  const r = analizarUrlVideo('https://www.tiktok.com/@ana')
  assert.equal(r.ok, false)
  assert.match(r.motivo, /Compartir/)
})

test('youtube: se dice claramente que solo valen dos redes', () => {
  const r = analizarUrlVideo('https://youtu.be/dQw4w9WgXcQ')
  assert.equal(r.ok, false)
  assert.match(r.motivo, /TikTok e Instagram/)
})

test('vacío y basura', () => {
  assert.equal(analizarUrlVideo('').ok, false)
  assert.equal(analizarUrlVideo('   ').ok, false)
  assert.equal(analizarUrlVideo(null).ok, false)
  assert.equal(analizarUrlVideo(undefined).ok, false)
  assert.equal(analizarUrlVideo(12345).ok, false)
  assert.equal(analizarUrlVideo('hola qué tal').ok, false)
})

test('enlace absurdamente largo se rechaza', () => {
  assert.equal(analizarUrlVideo('https://tiktok.com/@a/video/1' + 'x'.repeat(600)).ok, false)
})

// ── Normalización: tiene que coincidir con creadores_normalizar_url() ───────

test('normalizarUrl quita protocolo, www, query, fragmento y barra final', () => {
  assert.equal(
    normalizarUrl('HTTPS://WWW.TikTok.com/@Ana/video/7412345678901234567/?x=1#frag'),
    'tiktok.com/@ana/video/7412345678901234567'
  )
})

test('normalizarUrl: http y https colapsan igual', () => {
  assert.equal(
    normalizarUrl('http://tiktok.com/@ana/video/123456'),
    normalizarUrl('https://www.tiktok.com/@ana/video/123456/')
  )
})

test('normalizarUrl con basura no revienta', () => {
  assert.equal(normalizarUrl(null), '')
  assert.equal(normalizarUrl(undefined), '')
  assert.equal(normalizarUrl(42), '')
})
