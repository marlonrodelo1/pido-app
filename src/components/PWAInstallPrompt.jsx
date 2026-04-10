import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-react'

const INSTALLED_KEY = 'pwa_installed'

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) }
function isSafari() { return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) }
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true }

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    if (isStandalone()) return
    if (localStorage.getItem(INSTALLED_KEY)) return
    const ios = isIOS() && isSafari()
    if (ios) {
      setPlatform('ios')
      const t = setTimeout(() => setVisible(true), 7000)
      return () => clearTimeout(t)
    } else {
      const handler = (e) => {
        e.preventDefault(); setDeferredPrompt(e); setPlatform('android')
        setTimeout(() => setVisible(true), 6000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() { setVisible(false) }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null); setVisible(false)
    if (outcome === 'accepted') localStorage.setItem(INSTALLED_KEY, '1')
  }

  function handleIOSDismiss() { setVisible(false) }

  if (!visible) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(20,20,20,0.95)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 28px',
        border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -8px 32px rgba(255,107,44,0.06)',
        animation: 'slideUp 0.35s ease',
        position: 'relative',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />

        {/* Cierre */}
        <button onClick={dismiss} style={{
          position: 'absolute', top: 16, right: 16,
          width: 30, height: 30, borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} strokeWidth={2.5} color="var(--c-muted)" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <img src="/icon.png" alt="Pidoo" style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            boxShadow: '0 4px 16px rgba(255,107,44,0.25)',
          }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>Instala Pidoo</div>
            <div style={{ fontSize: 11, color: '#767575' }}>Acceso rápido desde tu pantalla</div>
          </div>
        </div>

        {platform === 'android' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={dismiss} style={{
              flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#767575',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Ahora no
            </button>
            <button onClick={handleInstall} style={{
              flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
              background: 'var(--c-btn-gradient)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Instalar
            </button>
          </div>
        )}

        {platform === 'ios' && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 10,
              padding: '12px 14px', marginBottom: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-primary)', width: 20, textAlign: 'center' }}>1</span>
                <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
                  Toca <span style={{ color: '#007AFF', fontWeight: 700 }}>⬆</span> en Safari
                </span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-primary)', width: 20, textAlign: 'center' }}>2</span>
                <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
                  "Agregar a pantalla de inicio" <span style={{ color: 'var(--c-text)' }}>⊞</span>
                </span>
              </div>
            </div>
            <button onClick={handleIOSDismiss} style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#767575',
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
