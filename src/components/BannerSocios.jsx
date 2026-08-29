import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'

const FONDO = '/socios-bolsas.webp'

// Banner de captación de socios, debajo de la cabecera de la app.
//
// QUÉ ES: quien está mirando el marketplace es el mejor candidato a querer el
// suyo. El banner le ofrece montarlo y le lleva a socio.pidoo.es a registrarse.
//
// LO ENCIENDE Y LO APAGA MARLON desde el super-admin, sin tocar código ni sacar
// versión nueva: todo sale de `configuracion_plataforma`, incluidos los textos y
// la URL. Por eso los valores de abajo son solo el respaldo para cuando la
// consulta falla (sin conexión, RLS, etc.): NO son la fuente de la verdad.
//
// ⚠️ Las claves TIENEN que estar con `publica = true` en esa tabla. La policy
// `config_read_publicas` es `(publica OR is_superadmin())`: si la clave nace
// privada, el cliente no la ve, el banner se queda apagado para todo el mundo y
// desde el super-admin parecerá encendido. Es el fallo silencioso a vigilar.
//
// NO SE PUEDE CERRAR (decisión de Marlon, 29 ago): no lleva X. Quien lo quiera
// quitar de en medio, lo apaga desde el super-admin y desaparece para todos.

const DEFECTO = {
  titulo: 'Monta tu marketplace con estos restaurantes',
  texto: 'Gana comisiones por venta y por reparto',
  url: 'https://socio.pidoo.es',
}

export default function BannerSocios() {
  const [cfg, setCfg] = useState(null)
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    let vivo = true
    supabase
      .from('configuracion_plataforma')
      .select('clave, valor')
      .in('clave', ['banner_socios_activo', 'banner_socios_titulo', 'banner_socios_texto', 'banner_socios_url'])
      .then(({ data, error }) => {
        if (!vivo || error || !data) return
        const c = Object.fromEntries(data.map(r => [r.clave, r.valor]))
        // Apagado por defecto: si la clave no existe o no dice 'on', no se pinta.
        // Preferimos que un banner nuevo no aparezca solo antes que aparecer
        // donde nadie lo ha encendido.
        if ((c.banner_socios_activo || '').trim().toLowerCase() !== 'on') return
        setCfg({
          titulo: c.banner_socios_titulo?.trim() || DEFECTO.titulo,
          texto: c.banner_socios_texto?.trim() || DEFECTO.texto,
          url: c.banner_socios_url?.trim() || DEFECTO.url,
        })
        setMostrar(true)
      })

    return () => { vivo = false }
  }, [])

  if (!mostrar || !cfg) return null

  async function abrir() {
    // En la app nativa se abre con Browser.open (navegador dentro de la app, con
    // su botón de volver). Un window.open en nativo saca al cliente de Pidoo y
    // muchos no encuentran el camino de vuelta. Es el mismo patrón del login de
    // Google (Login.jsx) y de los deep links.
    try {
      if (Capacitor.isNativePlatform()) await Browser.open({ url: cfg.url })
      else window.open(cfg.url, '_blank', 'noopener')
    } catch (_) {
      window.open(cfg.url, '_blank', 'noopener')
    }
  }

  // El margen exterior va DENTRO del componente a propósito: si lo pusiera el
  // que lo monta, al ocultarse el banner (apagado o cerrado por el cliente) se
  // quedaría el hueco en blanco bajo la cabecera. Aquí, si no hay banner no hay
  // nada. El `shell-max` es lo que lo alinea con la cabecera en escritorio.
  return (
    <div className="shell-max" style={{ padding: '14px 20px 0' }}>
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') abrir() }}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 12px', cursor: 'pointer',
        borderRadius: 14,
        // Verde salvia: es lo que hace que resalte sobre el crema de la app, y
        // NO naranja a propósito — el banner de Creadores ya lo es y los dos
        // pueden salir en la misma pantalla; con el mismo color parecerían el
        // mismo aviso repetido.
        background: 'linear-gradient(135deg, #EDF1E8 0%, #DCE5D2 100%)',
        border: '1px solid #8B9D7A',
      }}
    >
      {/* La foto entra por el borde derecho y se disuelve antes de llegar al
          texto — mismo truco que el banner de Creadores. La máscara es lo que
          mantiene legible el texto: sin ella, sobre la foto el verde oscuro
          pierde contraste. Si se sube la opacidad o se ensancha, hay que volver
          a mirarlo con la foto real delante, no a ojo. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 190,
          backgroundImage: `url(${FONDO})`,
          backgroundSize: 'cover', backgroundPosition: 'center right',
          opacity: 0.8, pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 38%, #000 88%)',
          maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 38%, #000 88%)',
        }}
      />

      {/* Sin caja de icono: la foto ya hace de imagen y quitarla es lo que más
          baja el banner (los 40 px del icono marcaban el alto mínimo). */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#2E4025', lineHeight: 1.2 }}>
          {cfg.titulo}
        </div>
        <div style={{ fontSize: 11.5, color: '#4A5D3A', marginTop: 2, lineHeight: 1.3 }}>
          {cfg.texto}
        </div>
      </div>

      {/* Botón de IR, no de cerrar. Antes había una X y era justo la señal
          contraria a la que queremos: invitaba a quitárselo de encima en vez de
          a entrar. Va relleno y con flecha para que se lea como "pulsa aquí".
          No abre nada por su cuenta: el banner entero ya es el enlace, y dos
          manejadores para el mismo destino es una fuente de fallos tonta. */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative', zIndex: 1,
          width: 32, height: 32, flexShrink: 0, borderRadius: '50%',
          background: '#5C7048',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 1px 3px rgba(46,64,37,0.28)',
        }}
      >
        <ChevronRight size={17} strokeWidth={2.8} color="#fff" />
      </div>
    </div>
    </div>
  )
}
