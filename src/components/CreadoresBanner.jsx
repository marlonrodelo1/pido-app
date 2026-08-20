import { useState, useEffect } from 'react'
import { Video, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fmtEur, mejorPremioEuros } from './CreadoresEscalera'

// Banner de descubrimiento de Pidoo Creadores en la Home.
//
// POR QUÉ EXISTE: la tarjeta de "graba un vídeo" solo aparece DESPUÉS de recibir
// un pedido. Quien no ha pedido nunca —o hace tiempo— no se entera de que el
// programa existe. Esto es lo único que lo cuenta antes.
//
// TRES REGLAS PARA QUE NO SEA RUIDO:
//  1. Solo si el programa lo tiene abierto alguno de los restaurantes que ese
//     cliente puede usar AHORA MISMO — visible en su lista Y abierto. No basta
//     con que exista alguno en la plataforma: en el marketplace de un socio solo
//     salen los suyos, y filtrando por Farmacia no hay ni uno de comida. Y no
//     basta con que esté en la lista: los cerrados siguen ahí, en gris, y a un
//     restaurante cerrado no se le puede pedir, así que no se le puede grabar un
//     vídeo. Prometer premios que no se pueden conseguir se paga caro: se toca,
//     no pasa nada, y la próxima vez ya no se mira.
//  2. Desaparece solo en cuanto el cliente registra su primer vídeo: ya se enteró.
//  3. Se puede cerrar, y se queda cerrado. Un banner que no se puede quitar es un
//     banner que la gente aprende a ignorar.

const CERRADO_KEY = 'pidoo_creadores_banner_cerrado'

// Marca de agua. Recorte de `public/hero/hero-comida.jpg` (que solo usaba la
// landing) a 420 px y WebP: 15 kB en vez de 332. Va tenue y enmascarada, así que
// la calidad no importa; el peso sí, porque esto carga en la Home.
const FONDO = '/creadores-fondo.webp'

export default function CreadoresBanner({ onAbrir, establecimientos = null }) {
  // `loading` importa: la sesión tarda un instante en restaurarse y hasta
  // entonces `user` es null. Sin esperarla, a quien YA participa le aparecía el
  // banner y se le esfumaba medio segundo después — un parpadeo que además le
  // ofrece algo que ya tiene.
  const { user, loading: cargandoSesion } = useAuth()
  const [mostrar, setMostrar] = useState(false)
  // El premio más alto, en euros, entre los restaurantes que este cliente VE.
  // 0 = no hay ninguno expresable en euros -> el banner va sin cifra.
  const [maxEuros, setMaxEuros] = useState(0)

  // Los ids que el cliente puede usar AHORA. Se calcula aparte para que el efecto
  // no se dispare en cada render por recibir un array nuevo con el mismo
  // contenido (la Home los remapea al refrescar por realtime).
  //
  // `activo === true` y no "está en la lista": desde el 1 ago 2026 los cerrados
  // NO desaparecen de la Home, se pintan en gris. Sin este filtro, con el único
  // restaurante de Creadores cerrado el banner seguiría prometiendo premios que
  // hoy no se pueden ganar — para participar hace falta un pedido entregado.
  // Se compara contra `true` a propósito: si algún día un listado olvida traer
  // la columna, el banner desaparece (molesto) en vez de mentir (caro).
  const idsDisponibles = (establecimientos || [])
    .filter(e => e?.activo === true)
    .map(e => e.id).filter(Boolean).sort().join(',')

  useEffect(() => {
    let vivo = true
    async function mirar() {
      setMostrar(false)
      if (cargandoSesion) return
      try { if (localStorage.getItem(CERRADO_KEY) === '1') return } catch (_) {}
      if (!idsDisponibles) return

      const { data } = await supabase.rpc('creadores_programas_abiertos')
      if (!vivo) return
      const visibles = new Set(idsDisponibles.split(","))
      const suyos = (Array.isArray(data) ? data : []).filter(r => visibles.has(r.establecimiento_id))
      if (!suyos.length) return

      // La cifra del titular sale de AQUÍ, no del código: es el premio más alto
      // que este cliente puede conseguir de verdad hoy. Si un restaurante cambia
      // su escalera, el banner se entera solo. Y si el mejor premio no se puede
      // expresar en euros (un porcentaje), se queda a 0 y el texto va sin cifra:
      // prometer un número que no existe es lo que quema la confianza.
      const tope = Math.max(0, ...suyos.map(r => mejorPremioEuros(r.escalera)))

      // Si ya participa, no hay nada que descubrirle.
      //
      // El `.eq('usuario_id')` NO sobra por mucho que la RLS ya filtre: la
      // policy del cliente le deja ver solo las suyas, pero la del SUPERADMIN
      // le deja ver las de todo el mundo y la del dueño las de su local. Sin
      // filtrar aquí, a esas dos cuentas el contador les salía con las ajenas
      // dentro y el banner se autoocultaba — a un superadmin con cero vídeos
      // propios no le aparecía nunca, y eso hace pensar que Creadores está
      // roto cuando funciona. Se pide explícitamente lo que se quiere contar
      // en vez de confiar en que los permisos coincidan con la intención.
      if (user) {
        const { count } = await supabase
          .from('participaciones_creador')
          .select('id', { count: 'exact', head: true })
          .eq('usuario_id', user.id)
        if (!vivo || (count || 0) > 0) return
      }
      setMaxEuros(tope)
      setMostrar(true)
    }
    mirar()
    return () => { vivo = false }
  }, [user, cargandoSesion, idsDisponibles])

  if (!mostrar) return null

  function cerrar(e) {
    e.stopPropagation()
    try { localStorage.setItem(CERRADO_KEY, '1') } catch (_) {}
    setMostrar(false)
  }

  return (
    <div
      className="home-fade shell-narrow"
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onAbrir?.() }}
      style={{
        animationDelay: '0.12s',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', marginBottom: 28, cursor: 'pointer',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
        border: '1px solid #E4671F',
      }}
    >
      {/* La foto entra por el borde derecho y se disuelve antes de llegar al
          texto, con la máscara casi plana hasta el 55 %.
          ESTO SE MIDIÓ contra los píxeles reales de la foto, no se estimó. El
          color viejo (#A85018) sobre el extremo oscuro de este degradado
          (#F7CFB2) daba 3,8:1 y YA NO LLEGABA al mínimo legible de 4,5 ANTES de
          que existiera esta foto; con la foto encima caía a 2,4. De ahí los dos
          textos más oscuros Y esta máscara casi plana hasta el 62 %: en el punto
          más a la derecha que el texto puede alcanzar quedan 4,7:1.
          Si alguien sube la opacidad, ensancha los 118 px o cambia la foto por
          una más oscura, hay que volver a medirlo — a ojo esto no se ve venir. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 118,
          backgroundImage: `url(${FONDO})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.34, pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.10) 62%, #000 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.10) 62%, #000 100%)',
        }}
      />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center',
      }}>
        <Video size={20} color="#A85018" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#8C420C', lineHeight: 1.25 }}>
          {maxEuros > 0
            ? `Hasta ${fmtEur(maxEuros)} € de descuento por un vídeo`
            : 'Descuentos por tus vídeos'}
        </div>
        {/* Las visualizaciones NO son un detalle que se pueda omitir: sin ellas
            el titular promete que basta con grabar, y no basta. Quien graba y se
            queda en 80 visualizaciones no gana nada. */}
        <div style={{ fontSize: 12, color: '#7A4C28', marginTop: 3, lineHeight: 1.35 }}>
          Cuantas más visualizaciones, mayor el descuento
        </div>
      </div>

      <button
        onClick={cerrar}
        aria-label="Cerrar aviso"
        style={{
          position: 'relative', zIndex: 1,
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: 'none',
          background: 'rgba(255,255,255,0.75)', cursor: 'pointer',
          display: 'grid', placeItems: 'center',
        }}
      >
        <X size={14} color="#A85018" />
      </button>
    </div>
  )
}
