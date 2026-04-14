import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin that replaces __FIREBASE_*__ placeholders in public/sw.js at build time
function firebaseSwPlugin() {
  return {
    name: 'firebase-sw-placeholder',
    // Run after the build has copied public/ files into dist/
    closeBundle() {
      const swPath = path.resolve('dist', 'sw.js')
      if (!fs.existsSync(swPath)) return

      // loadEnv reads .env* files; process.env has Docker/CI env vars
      const fileEnv = loadEnv('production', process.cwd(), 'VITE_')
      const getVar = (name) => process.env[name] || fileEnv[name] || ''

      const replacements = {
        '__FIREBASE_API_KEY__': getVar('VITE_FIREBASE_API_KEY'),
        '__FIREBASE_AUTH_DOMAIN__': getVar('VITE_FIREBASE_AUTH_DOMAIN'),
        '__FIREBASE_PROJECT_ID__': getVar('VITE_FIREBASE_PROJECT_ID'),
        '__FIREBASE_STORAGE_BUCKET__': getVar('VITE_FIREBASE_STORAGE_BUCKET'),
        '__FIREBASE_MESSAGING_SENDER_ID__': getVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
        '__FIREBASE_APP_ID__': getVar('VITE_FIREBASE_APP_ID'),
      }

      let content = fs.readFileSync(swPath, 'utf-8')
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replaceAll(placeholder, value)
      }
      fs.writeFileSync(swPath, content, 'utf-8')
      console.log('[firebase-sw-plugin] Replaced Firebase placeholders in dist/sw.js')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), firebaseSwPlugin()],
})
