// Reemplaza los placeholders __FIREBASE_*__ en dist/sw.js con las envs reales.
// Se ejecuta DESPUÉS de `vite build` (ver package.json -> postbuild).
// No modificamos public/sw.js para mantener el repo limpio.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const swPath = resolve(__dirname, '../dist/sw.js')

if (!existsSync(swPath)) {
  console.warn('[build-sw] dist/sw.js no existe todavía, saltando.')
  process.exit(0)
}

const replacements = {
  __FIREBASE_API_KEY__: process.env.VITE_FIREBASE_API_KEY || '',
  __FIREBASE_AUTH_DOMAIN__: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  __FIREBASE_PROJECT_ID__: process.env.VITE_FIREBASE_PROJECT_ID || '',
  __FIREBASE_STORAGE_BUCKET__: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  __FIREBASE_MESSAGING_SENDER_ID__: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  __FIREBASE_APP_ID__: process.env.VITE_FIREBASE_APP_ID || '',
}

const missing = Object.entries(replacements).filter(([, v]) => !v).map(([k]) => k)
if (missing.length > 0) {
  console.warn('[build-sw] ⚠️  Faltan variables de entorno, el SW no recibirá push en background:')
  for (const k of missing) console.warn('   - ' + k.replace(/^__/, 'VITE_').replace(/__$/, ''))
}

let src = readFileSync(swPath, 'utf8')
for (const [token, value] of Object.entries(replacements)) {
  src = src.replaceAll(`"${token}"`, JSON.stringify(value))
}

writeFileSync(swPath, src, 'utf8')
console.log('[build-sw] ✓ dist/sw.js actualizado con config Firebase real')
