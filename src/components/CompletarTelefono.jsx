import { useState } from 'react'
import { Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { normalizarTelefono, telefonoValido, MSG_TELEFONO_INVALIDO } from '../lib/telefono'

// Toda cuenta de cliente necesita un teléfono válido: el restaurante y el
// repartidor lo usan para avisar del pedido. El alta con email ya lo pide, pero
// quien entra con Google o con Apple nunca lo escribe (149 de las 179 cuentas sin
// teléfono de ago-sep 2026), así que se pide aquí nada más entrar, y también a
// las cuentas viejas que no lo tienen o lo tienen mal escrito.
//
// Se puede dejar para luego ("Ahora no", vuelve a salir en la siguiente sesión):
// un muro sin salida tras Sign in with Apple, que además tapa "Eliminar mi
// cuenta", es motivo de rechazo en App Store (guidelines 5.1.1 y 4.8; la 1.47 ya
// se rechazó por la 4.8). La obligación de verdad está en el carrito: sin
// teléfono válido no se puede pedir.
const claveAplazado = (uid) => `pidoo_tel_aplazado_${uid}`

export default function CompletarTelefono() {
  const { user, perfil, updatePerfil, logout } = useAuth()
  const [tel, setTel] = useState(() => perfil?.telefono || '')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aplazado, setAplazado] = useState(() => {
    try { return !!user?.id && sessionStorage.getItem(claveAplazado(user.id)) === '1' } catch { return false }
  })

  // Sin perfil cargado no se decide nada (si la lectura falla, no se molesta).
  if (!user || !perfil || aplazado || telefonoValido(perfil.telefono)) return null
  try { if (sessionStorage.getItem(claveAplazado(user.id)) === '1') return null } catch { /* sin storage */ }

  async function guardar() {
    if (guardando) return
    const normal = normalizarTelefono(tel)
    if (!normal) { setError(tel.trim() ? MSG_TELEFONO_INVALIDO : 'Escribe tu teléfono para continuar'); return }
    setGuardando(true); setError(null)
    try {
      await updatePerfil({ telefono: normal })
    } catch {
      setError('No se ha podido guardar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  function ahoraNo() {
    try { sessionStorage.setItem(claveAplazado(user.id), '1') } catch { /* sin storage */ }
    setAplazado(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10050,
      background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: '#FFFFFF', borderRadius: 20, padding: 22,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)', color: '#1A1815',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'rgba(228,103,31,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        }}>
          <Phone size={20} strokeWidth={2} color="#E4671F" />
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 6 }}>Añade tu teléfono</div>
        <div style={{ fontSize: 13, color: '#6B6356', lineHeight: 1.45, marginBottom: 16 }}>
          El restaurante y el repartidor lo necesitan para avisarte de tu pedido. Sin él no se puede pedir.
        </div>
        <input
          value={tel}
          onChange={e => { setTel(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') guardar() }}
          type="tel"
          autoComplete="tel"
          placeholder="Tu número de móvil"
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
            border: `1px solid ${error ? '#B5564A' : '#E8E1D3'}`, background: '#FBF8F2',
            fontSize: 16, color: '#1A1815', fontFamily: 'inherit', outline: 'none',
          }}
        />
        {error && <div style={{ fontSize: 12, color: '#B5564A', marginTop: 6, lineHeight: 1.4 }}>{error}</div>}
        <div style={{ fontSize: 11, color: '#6B6356', marginTop: 6 }}>Si es extranjero, con su prefijo (+44…).</div>
        <button onClick={guardar} disabled={guardando} style={{
          width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 12, border: 'none',
          background: guardando ? '#E8E1D3' : '#E4671F', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: guardando ? 'default' : 'pointer', fontFamily: 'inherit',
        }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={ahoraNo} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid #E8E1D3',
            background: '#fff', color: '#1A1815', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Ahora no
          </button>
          <button onClick={() => logout()} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
            background: 'transparent', color: '#6B6356', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
