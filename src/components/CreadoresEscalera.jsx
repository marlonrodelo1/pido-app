import { useState, useEffect } from 'react'
import { Video, Gift, Sparkles, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

// La escalera de premios de un restaurante, tal y como la ve el CLIENTE.
//
// Existe porque hasta ahora el cliente no sabía qué podía ganar hasta DESPUÉS
// de que le entregaran un pedido, y aun así solo veía el primer escalón. Sin
// esto, "graba un vídeo y gana descuentos" es una promesa sin cifras.
//
// Los datos vienen SIEMPRE del servidor (`creadores_escalera_publica` /
// `creadores_programa_publico` / `creadores_programas_abiertos`), que no
// devuelve `coste_estimado`: lo que el premio le cuesta al restaurante no es
// asunto del cliente. Por eso también el restaurante puede cambiar sus premios
// y esta pantalla se entera sola, sin actualizar la app.

const C = {
  paper: '#FBF8F2', cream2: '#EFE9DD',
  ink: '#1A1815', stone: '#5A5348',
  burnt: '#E4671F', burntText: '#A85018',
  border: '#E8E1D3',
}

const fmtNum = (n) => Number(n || 0).toLocaleString('es-ES')

// Tipos de premio cuyo `valor` viene en EUROS. En 'porcentaje' NO: ahí `valor`
// es el tanto por ciento y depende del pedido, así que no se puede anunciar
// como una cifra fija.
const PREMIOS_EN_EUROS = new Set(['descuento_fijo', 'producto_gratis', 'envio_gratis'])

// 15 -> "15" · 2,5 -> "2,50". Sin decimales cuando es redondo: "hasta 15,00 €"
// se lee a precio de folleto, "hasta 15 €" se lee a premio.
export const fmtEur = (n) => Number(n) % 1 === 0
  ? Number(n).toLocaleString('es-ES', { maximumFractionDigits: 0 })
  : Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// El premio más alto de una escalera, en euros. 0 = ninguno se puede expresar
// así, y entonces quien llame a esto NO debe enseñar cifra.
//
// VIVE AQUÍ, y no en cada pantalla, a propósito: la misma cifra sale en el
// banner de la Home y en la ficha del restaurante, y dos copias de esta regla
// acabarían diciendo cosas distintas en dos sitios de la misma app. Ya pasó con
// el texto y el importe de los premios, que se separaron sin que nadie lo viera.
export function mejorPremioEuros(escalera = []) {
  let tope = 0
  for (const e of (escalera || [])) {
    if (!PREMIOS_EN_EUROS.has(e?.tipo_premio)) continue
    const v = Number(e.valor)
    if (Number.isFinite(v) && v > tope) tope = v
  }
  return tope
}

export default function CreadoresEscalera({ escalera = [], titulo, nota, compacto = false }) {
  if (!escalera.length) return null

  return (
    <div>
      {titulo && (
        <div style={{ fontSize: compacto ? 13 : 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
          {titulo}
        </div>
      )}

      {escalera.map((e, i) => (
        <div key={e.nivel ?? i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: compacto ? '8px 0' : '10px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
        }}>
          <div style={{
            width: compacto ? 30 : 34, height: compacto ? 30 : 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
            display: 'grid', placeItems: 'center',
          }}>
            <Gift size={compacto ? 14 : 16} color={C.burntText} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compacto ? 13 : 13.5, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
              {e.descripcion}
            </div>
            <div style={{ fontSize: compacto ? 11 : 11.5, color: C.stone, marginTop: 2 }}>
              al llegar a {fmtNum(e.views_necesarias)} visualizaciones
            </div>
          </div>
        </div>
      ))}

      {nota && (
        <div style={{ fontSize: 11.5, color: C.stone, marginTop: 10, lineHeight: 1.5 }}>
          {nota}
        </div>
      )}
    </div>
  )
}

// La pestaña "Cómo ganar" entera: los tres pasos + dónde se puede ganar hoy.
//
// Vive aquí y no dentro de `CreadoresSection` para que se pueda montar sola:
// es contenido puramente informativo, no necesita la sesión del cliente (el
// RPC es público), y así se puede enseñar y revisar sin entrar con una cuenta.
export function CreadoresComoGanar({ programas = null }) {
  // `programas` solo se pasa para enseñar la pantalla con datos de ejemplo. En
  // la app real va vacío y los datos los trae el RPC.
  const [abiertos, setAbiertos] = useState(programas)   // null = cargando

  useEffect(() => {
    if (programas) return
    let vivo = true
    supabase.rpc('creadores_programas_abiertos').then(({ data }) => {
      if (vivo) setAbiertos(Array.isArray(data) ? data : [])
    })
    return () => { vivo = false }
  }, [programas])

  return (
    <div>
      <CreadoresComoFunciona />

      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginTop: 18, marginBottom: 2 }}>
        Dónde puedes ganar ahora
      </div>
      <p style={{ fontSize: 12.5, color: C.stone, marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
        Cada restaurante decide sus propios premios.
      </p>

      {abiertos === null && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: C.stone, fontSize: 13 }}>Cargando…</div>
      )}

      {abiertos?.length === 0 && (
        <div style={{
          background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: '30px 20px', textAlign: 'center',
        }}>
          <Sparkles size={28} color="#8A8174" style={{ marginBottom: 9 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
            Todavía no hay ningún restaurante con premios
          </div>
          <div style={{ fontSize: 12.5, color: C.stone, marginTop: 5, lineHeight: 1.5 }}>
            En cuanto alguno lo active, sus premios aparecerán aquí.
          </div>
        </div>
      )}

      {abiertos?.map(r => (
        <FilaRestaurante key={r.establecimiento_id} r={r} soloUno={abiertos.length === 1} />
      ))}

      <div style={{
        marginTop: 12, padding: '10px 12px', borderRadius: 10,
        background: C.cream2, color: C.stone, fontSize: 11.5, lineHeight: 1.5,
      }}>
        {/* Desde el 18 ago hay DOS caminos: el de siempre (con un pedido) y el
            del QR de la mesa (sin pedido, con el visto bueno del restaurante).
            Y el premio, venga de donde venga, solo se gasta a domicilio. */}
        Puedes registrar un vídeo de un pedido ya entregado —tienes 14 días desde que te
        llegó, un pedido un vídeo— o desde el código QR de la mesa si comes en el local,
        y en ese caso lo revisa el restaurante.
        <br /><br />
        <strong>El descuento que ganes solo se aplica en pedidos a domicilio</strong>, del
        mismo restaurante que te lo dio. Se te pone solo al pagar, sin códigos.
      </div>
    </div>
  )
}

// Un restaurante = UNA fila que se despliega.
//
// Con la escalera siempre abierta, diez restaurantes son una pared de sesenta
// líneas y el cliente no encuentra el suyo. Cerrada, la fila tiene que decir
// por sí sola si merece la pena abrirla: por eso lleva el premio de entrada,
// que es el que casi todo el mundo alcanza.
//
// Si solo hay un restaurante se abre solo: obligar a un clic para ver lo único
// que hay sería absurdo.
function FilaRestaurante({ r, soloUno }) {
  const [abierta, setAbierta] = useState(!!soloUno)
  const escalera = r.escalera || []
  const primero = escalera[0]

  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setAbierta(v => !v)}
        aria-expanded={abierta}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: 13, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}>
        {r.logo_url && (
          <img src={r.logo_url} alt="" loading="lazy" style={{
            width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: C.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {r.nombre}
          </div>
          <div style={{ fontSize: 11.5, color: C.stone, marginTop: 2 }}>
            {primero
              ? `Desde ${fmtNum(primero.views_necesarias)} visualizaciones`
              : 'Premios disponibles'}
            {escalera.length > 1 && ` · ${escalera.length} premios`}
          </div>
        </div>
        <ChevronDown size={17} color={C.stone} style={{
          flexShrink: 0, transition: 'transform 0.18s',
          transform: abierta ? 'rotate(180deg)' : 'none',
        }} />
      </button>

      {abierta && (
        <div style={{ padding: '0 13px 12px' }}>
          <CreadoresEscalera escalera={escalera} compacto />
        </div>
      )}
    </div>
  )
}

// Los tres pasos, para quien nunca ha oído hablar de esto. Se usa en la
// pantalla de Creadores del perfil y en la ficha del restaurante.
export function CreadoresComoFunciona({ compacto = false }) {
  const pasos = [
    'Haz tu pedido como siempre.',
    'Cuando te llegue, graba un vídeo en TikTok o Instagram y pega el enlace en la app.',
    'Según las visualizaciones que consiga, tu descuento aparece solo en tu siguiente pedido.',
  ]
  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: compacto ? 12 : 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Video size={15} color={C.burntText} />
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Cómo funciona</div>
      </div>
      {pasos.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, marginBottom: i === pasos.length - 1 ? 0 : 7 }}>
          <div style={{
            width: 19, height: 19, borderRadius: 999, flexShrink: 0, background: C.cream2,
            display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: C.burntText,
          }}>{i + 1}</div>
          <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.45 }}>{p}</div>
        </div>
      ))}
    </div>
  )
}
