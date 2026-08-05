/* ──────────────────────────────────────────────────────────────────────────
 * AbrirEnApp — página puente /abrir/<slug>.
 *
 * Destino del botón del banner de descarga y de cualquier enlace compartido.
 * Lleva a ESE restaurante dentro de la app si está instalada, y a la tienda
 * de apps si no lo está.
 *
 * Es la ÚNICA ruta que debe reclamarse en App Links / Universal Links: la
 * ficha del restaurante vive en /:slug, que es comodín en la raíz, y
 * reclamarla se llevaría la web entera dentro de la app.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { slugValido, urlIntentAndroid, urlEsquemaApp, detectarPlataforma, APPSTORE, GPLAY } from '../lib/deepLinks'

const C = {
  bg: '#F7F3EC', paper: '#FFFFFF', ink: '#1A1815',
  stone: '#6B6356', border: '#E8E1D3', primary: '#C5562C',
}

/* iOS deja la página "visible" mientras enseña el diálogo "Este sitio está
 * intentando abrir otra aplicación · Permitir / No permitir", y no se va de
 * ahí hasta que el usuario contesta. Con 2 s el rescate salta mientras el
 * usuario todavía está leyendo y manda a instalar a quien YA tiene la app. */
const RESCATE_MS = 8000

export default function AbrirEnApp() {
  const { slug: slugCrudo } = useParams()
  const slug = typeof slugCrudo === 'string' ? slugCrudo.toLowerCase() : ''
  const valido = slugValido(slug)

  const [estado, setEstado] = useState(valido ? 'cargando' : 'notfound')
  const [rest, setRest] = useState(null)
  const yaLanzado = useRef(false)
  // useState con inicializador perezoso, no useRef: se calcula una sola vez y
  // se puede leer durante el render sin romper las reglas de los refs.
  const [plataforma] = useState(detectarPlataforma)
  const esMovil = plataforma === 'android' || plataforma === 'ios'

  // Mandar a instalar una app donde ese restaurante no existe es peor que no
  // hacer nada: se comprueba contra la BD antes de lanzar nada.
  useEffect(() => {
    if (!valido) return
    let cancelado = false
    supabase.from('establecimientos')
      .select('id, nombre, logo_url, slug')
      .eq('slug', slug).eq('estado', 'activo').maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        if (data) { setRest(data); setEstado('found') } else { setEstado('notfound') }
      })
      // Sin esto, una caída de red deja la página en "Cargando..." para
      // siempre. Ante la duda no se lanza nada: mejor la tienda que mandar a
      // instalar a ciegas.
      .catch(() => { if (!cancelado) setEstado('notfound') })
    return () => { cancelado = true }
  }, [slug, valido])

  // Cancelación del rescate a la App Store (iOS), guardada para poder
  // cortarla también si el usuario se va de la página antes de los 8 s.
  const cancelarRescate = useRef(null)

  function lanzar() {
    if (plataforma === 'android') {
      // Chrome abre la app si está y, si no, va SOLO a Play. Sin
      // temporizadores: lo resuelve el navegador.
      const intent = urlIntentAndroid(slug, GPLAY)
      if (intent) window.location.href = intent
      return
    }
    if (plataforma !== 'ios') return

    const esquema = urlEsquemaApp(slug)
    if (!esquema) return
    cancelarRescate.current?.()

    const t = setTimeout(() => { window.location.href = APPSTORE }, RESCATE_MS)
    const alOcultarse = () => { if (document.hidden) cancelar() }
    function cancelar() {
      clearTimeout(t)
      window.removeEventListener('blur', cancelar)
      window.removeEventListener('pagehide', cancelar)
      document.removeEventListener('visibilitychange', alOcultarse)
      cancelarRescate.current = null
    }
    cancelarRescate.current = cancelar

    // El diálogo de iOS roba el foco pero NO oculta la página: escuchando
    // solo 'visibilitychange' el rescate salta igual y manda a la tienda a
    // quien YA tiene la app instalada.
    window.addEventListener('blur', cancelar)
    window.addEventListener('pagehide', cancelar)
    document.addEventListener('visibilitychange', alOcultarse)
    window.location.href = esquema
  }

  // Intento automático en cuanto se sabe que el restaurante existe. El ref
  // evita el doble disparo de StrictMode en desarrollo.
  useEffect(() => {
    if (estado !== 'found' || !esMovil || yaLanzado.current) return
    yaLanzado.current = true
    lanzar()
  }, [estado, esMovil])

  useEffect(() => () => { cancelarRescate.current?.() }, [])

  if (estado === 'cargando') {
    return <div style={{ ...pagina, color: C.stone, fontSize: 13 }}>Cargando...</div>
  }
  if (estado === 'notfound' || !rest) return <Navigate to="/" replace />

  return (
    <div style={pagina}>
      <div style={tarjeta}>
        {rest.logo_url
          ? <img src={rest.logo_url} alt="" style={logo} />
          : <img src="/apple-touch-icon.png" alt="Pidoo" style={logo} />}

        <div style={{ fontSize: 19, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {rest.nombre}
        </div>

        <p style={{ fontSize: 13.5, color: C.stone, lineHeight: 1.5, margin: 0 }}>
          {esMovil
            ? 'Te estamos llevando a este restaurante dentro de la app de Pidoo.'
            : 'Descarga Pidoo en tu movil para pedir de este restaurante, o sigue aqui en la web.'}
        </p>

        {esMovil && (
          <>
            <button onClick={lanzar} style={boton}>Abrir en la app</button>
            {/* iOS pregunta "Este sitio está intentando abrir otra aplicación"
                y no se mueve de aquí hasta que el usuario conteste. */}
            {plataforma === 'ios' && (
              <div style={{ fontSize: 12, color: C.stone, lineHeight: 1.45 }}>
                Si te pregunta, toca <strong style={{ color: C.ink }}>Permitir</strong>.
              </div>
            )}
            <div style={{ fontSize: 12, color: C.stone }}>Si no la tienes instalada:</div>
          </>
        )}

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={APPSTORE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label="Descargar en la App Store">
            <img src="/badges/appstore_official.png" alt="Descargar en la App Store" style={badge} />
          </a>
          <a href={GPLAY} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label="Disponible en Google Play">
            <img src="/badges/gplay_official_v2.png" alt="Disponible en Google Play" style={badge} />
          </a>
        </div>

        <Link to={'/' + rest.slug} style={enlaceWeb}>Seguir en la web</Link>
      </div>
    </div>
  )
}

const pagina = {
  minHeight: '100vh',
  background: C.bg,
  fontFamily: "'DM Sans', sans-serif",
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  // El padding lateral es lo que impide que la tarjeta toque los bordes en
  // un iPhone estrecho; el ancho se limita abajo con maxWidth + width:100%.
  padding: '32px 20px',
}

const tarjeta = {
  width: '100%', maxWidth: 380,
  background: C.paper,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  padding: '28px 22px',
  boxShadow: '0 1px 3px rgba(26,24,21,0.05)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 12, textAlign: 'center',
}

const logo = {
  width: 64, height: 64, borderRadius: 16,
  objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0,
}

const boton = {
  width: '100%',
  padding: '14px 20px', borderRadius: 14, border: 'none',
  background: C.primary, color: '#fff',
  fontSize: 15, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', marginTop: 2,
}

// height:auto + maxWidth:100% para que dos badges quepan en 375 px sin
// desbordar: si no caben, flexWrap los baja de linea en vez de estirar la
// pagina a lo ancho.
const badge = { height: 38, width: 'auto', maxWidth: '100%', display: 'block' }

const enlaceWeb = {
  fontSize: 13, fontWeight: 700, color: C.stone,
  textDecoration: 'underline', textUnderlineOffset: 3,
}
