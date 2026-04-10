import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-react'

const INSTALLED_KEY = 'pwa_installed' // Solo se guarda si el usuario instaló

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null) // 'android' | 'ios'

  useEffect(() => {
    // No mostrar en app nativa Capacitor
    if (Capacitor.isNativePlatform()) return
    // No mostrar si ya está instalada como PWA (modo standalone)
    if (isStandalone()) return
    // No mostrar si el usuario ya instaló en una sesión anterior
    if (localStorage.getItem(INSTALLED_KEY)) return

    const ios = isIOS() && isSafari()

    if (ios) {
      setPlatform('ios')
      // Mostrar instrucciones iOS tras delay
      const t = setTimeout(() => setVisible(true), 7000)
      return () => clearTimeout(t)
    } else {
      // Android/Chrome: esperar el evento beforeinstallprompt
      const handler = (e) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setPlatform('android')
        setTimeout(() => setVisible(true), 6000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // Cerrar sin instalar — no guarda nada, volverá a aparecer la próxima sesión
  function dismiss() {
    setVisible(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
    if (outcome === 'accepted') {
      // Solo ahora guardamos que instaló — no volverá a aparecer
      localStorage.setItem(INSTALLED_KEY, '1')
    }
  }

  // iOS: el usuario dice "entendido" tras ver instrucciones
  // No guardamos nada — volverá a aparecer la próxima sesión hasta que instale
  function handleIOSDismiss() {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: '#1A1A1A',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 28px',
          border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
          animation: 'slideUp 0.35s ease',
          position: 'relative',
        }}
      >
        {/* Cierre */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} strokeWidth={2} color="#F5F5F5" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <img src="/icon.png" alt="Pidoo" style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            boxShadow: '0 2px 10px rgba(255,107,44,0.25)',
          }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F5F5F5' }}>
            Instala Pidoo
          </div>
        </div>

        {platform === 'android' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={dismiss} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Ahora no
              </button>
              <button
                onClick={handleInstall}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: '#FF6B2C', color: '#fff',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Instalar
              </button>
            </div>
          </>
        )}

        {platform === 'ios' && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              padding: '10px 14px', marginBottom: 14,
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-primary)', width: 20, textAlign: 'center' }}>1</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Toca <span style={{ color: '#007AFF', fontWeight: 700 }}>⬆</span> en Safari
                </span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-primary)', width: 20, textAlign: 'center' }}>2</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  "Agregar a pantalla de inicio" <span style={{ color: '#F5F5F5' }}>⊞</span>
                </span>
              </div>
            </div>
            <button onClick={handleIOSDismiss} style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Ahora no
            </button>
          </>
        )}
      </div>
    </div>
  )
}
