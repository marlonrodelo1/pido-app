import { useEffect, useRef, useState } from 'react'

// Buscador de direcciones con sugerencias de Google Places (API clásica).
//
// Antes usaba el widget `google.maps.places.Autocomplete`, que pinta su lista
// (`.pac-container`) colgada de <body> y la coloca UNA vez con la posición de
// la casilla en la página, sin contar el scroll interno de los contenedores.
// Dentro del carrito (hoja con scroll propio) la lista salía por debajo de la
// pantalla: el cliente escribía su dirección, no veía nada que pulsar y no
// había forma de guardarla (19 sep 2026). Ahora la lista la pintamos nosotros
// justo debajo de la casilla, dentro del mismo contenedor, y se mueve con él.
//
// Ojo: la "Places API (New)" está BLOQUEADA para esta key. Aquí solo se usan
// AutocompleteService, PlacesService.getDetails y Geocoder (clásicos).

let promesaGoogle = null

function cargarGoogle() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin window'))
  if (window.google?.maps?.places) return Promise.resolve(window.google)
  if (promesaGoogle) return promesaGoogle
  promesaGoogle = new Promise((resolve, reject) => {
    let intentos = 0
    let interval = null
    // Puede haberlo inyectado ya otra pantalla (Mapa usa su propio loader).
    if (!document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      // Sin cobertura al abrir el carrito: quitar la etiqueta fallida para que
      // el siguiente intento la vuelva a pedir (si no, el buscador moría para
      // toda la sesión, y en la app nativa casi nunca se recarga).
      script.onerror = () => { clearInterval(interval); script.remove(); promesaGoogle = null; reject(new Error('No cargó Google Maps')) }
      document.head.appendChild(script)
    }
    interval = setInterval(() => {
      if (window.google?.maps?.places) { clearInterval(interval); resolve(window.google) }
      else if (++intentos > 100) { clearInterval(interval); promesaGoogle = null; reject(new Error('No cargó Google Maps')) }
    }, 200)
  })
  return promesaGoogle
}

// Primer antepasado con scroll propio (la hoja del carrito); null = la ventana.
function contenedorScroll(el) {
  let p = el?.parentElement
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return null
}

// `cerca` ({lat, lng}, opcional): punto hacia el que se sesgan las sugerencias
// (el restaurante). "carretera general norte 160" existe en varios pueblos y en
// otra isla; sin sesgo Google puede poner primero el de Las Palmas.
export default function AddressInput({ value, onChange, onSelect, placeholder, style, cerca }) {
  const inputRef = useRef(null)
  const listaRef = useRef(null)
  const serviciosRef = useRef(null)
  const tokenRef = useRef(null)
  const peticionRef = useRef(0)
  const debounceRef = useRef(null)
  const cierreRef = useRef(null)

  const [sugerencias, setSugerencias] = useState([])
  const [abierta, setAbierta] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [eligiendo, setEligiendo] = useState(false)
  const [marcada, setMarcada] = useState(-1)
  const [aviso, setAviso] = useState(null)

  useEffect(() => () => {
    clearTimeout(debounceRef.current)
    clearTimeout(cierreRef.current)
  }, [])

  async function servicios() {
    if (serviciosRef.current) return serviciosRef.current
    const g = await cargarGoogle()
    serviciosRef.current = {
      g,
      auto: new g.maps.places.AutocompleteService(),
      places: new g.maps.places.PlacesService(document.createElement('div')),
      geocoder: new g.maps.Geocoder(),
    }
    return serviciosRef.current
  }

  // Precarga para que la primera letra ya tenga Google listo.
  useEffect(() => { servicios().catch(() => {}) }, [])

  function buscar(texto) {
    clearTimeout(debounceRef.current)
    const q = texto.trim()
    const id = ++peticionRef.current
    if (q.length < 3) { setSugerencias([]); setBuscando(false); return }
    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { g, auto } = await servicios()
        if (!tokenRef.current) tokenRef.current = new g.maps.places.AutocompleteSessionToken()
        auto.getPlacePredictions({
          input: q,
          types: ['address'],
          componentRestrictions: { country: 'es' },
          sessionToken: tokenRef.current,
          ...(cerca ? { locationBias: { center: cerca, radius: 20000 } } : {}),
        }, (preds, status) => {
          if (id !== peticionRef.current) return
          setBuscando(false)
          const ok = status === g.maps.places.PlacesServiceStatus.OK
          setSugerencias(ok && preds ? preds.slice(0, 5) : [])
          setMarcada(-1)
        })
      } catch (e) {
        if (id !== peticionRef.current) return
        console.error('[AddressInput] sugerencias', e)
        setBuscando(false); setSugerencias([])
        setAviso('No se pudo buscar la dirección. Revisa tu conexión.')
      }
    }, 250)
  }

  function cambiarTexto(texto) {
    onChange(texto)
    setMarcada(-1)
    setAviso(null)
    setAbierta(true)
    buscar(texto)
  }

  function confirmar(direccion, lat, lng) {
    ++peticionRef.current
    tokenRef.current = null
    setSugerencias([]); setAbierta(false); setBuscando(false); setAviso(null)
    onChange(direccion)
    if (onSelect) onSelect({ direccion, lat, lng })
  }

  async function elegir(pred) {
    if (!pred || eligiendo) return
    // Candidato del geocodificador (ya trae coordenadas).
    if (pred._loc) { confirmar(pred.description, pred._loc.lat, pred._loc.lng); return }
    setEligiendo(true); setAviso(null)
    try {
      const { g, places } = await servicios()
      const place = await new Promise((resolve) => {
        places.getDetails({
          placeId: pred.place_id,
          fields: ['formatted_address', 'geometry', 'address_components'],
          sessionToken: tokenRef.current || undefined,
        }, (p, status) => resolve(status === g.maps.places.PlacesServiceStatus.OK ? p : null))
      })
      const loc = place?.geometry?.location
      if (!loc) throw new Error('Sin coordenadas')
      // Si Google no conoce el portal devuelve la calle SIN número ("Carr.
      // General, La Matanza…") y el repartidor no sabría a qué casa ir: en ese
      // caso se guarda el texto de la sugerencia que tocó, que sí lo lleva.
      const conNumero = (place.address_components || []).some(c => c.types?.includes('street_number'))
      const texto = !conNumero && /\d/.test(pred.description || '') ? pred.description : (place.formatted_address || pred.description)
      confirmar(texto, loc.lat(), loc.lng())
    } catch (e) {
      console.error('[AddressInput] detalle', e)
      setAviso('No pudimos ubicar esa dirección. Prueba con otra de la lista.')
    } finally {
      setEligiendo(false)
    }
  }

  // "Ir"/Enter sin tocar la lista. Con varias sugerencias NO se elige ninguna a
  // ciegas (la primera puede ser otro pueblo: "calle la marina 5 santa cruz"
  // da primero Los Realejos): la lista se queda abierta para que toque la suya.
  // Solo sin sugerencias se geocodifica lo escrito, como último recurso.
  async function confirmarEscrito() {
    // Mientras se busca, la lista en pantalla es la del texto ANTERIOR (p. ej.
    // el portal 12 cuando ya escribió 13): no elegir nada de ella.
    if (buscando) { setAbierta(true); return }
    if (marcada >= 0 && sugerencias[marcada]) { elegir(sugerencias[marcada]); return }
    if (sugerencias.length === 1) { elegir(sugerencias[0]); return }
    if (sugerencias.length) { setAbierta(true); return }
    const q = (value || '').trim()
    if (q.length < 3 || eligiendo) return
    setEligiendo(true); setAviso(null)
    try {
      const { geocoder } = await servicios()
      const { results } = await geocoder.geocode({
        address: q,
        componentRestrictions: { country: 'ES' },
        ...(cerca ? { bounds: { north: cerca.lat + 0.2, south: cerca.lat - 0.2, east: cerca.lng + 0.2, west: cerca.lng - 0.2 } } : {}),
      })
      // Solo resultados con calle: un pueblo o un código postal entero no sirve
      // para llevar un pedido.
      const PRECISOS = ['street_address', 'premise', 'subpremise', 'route']
      const candidatos = (results || [])
        .filter(r => r.geometry?.location && (r.types || []).some(t => PRECISOS.includes(t)))
        .slice(0, 5).map(r => {
        // "C. 3, 7, 35610 Puerto del Rosario…" → titular "C. 3, 7" (calle + número).
        const partes = r.formatted_address.split(', ')
        const n = partes.length > 2 && /^\d+\w?$/.test(partes[1]) ? 2 : 1
        // Si Google solo conoce la calle (sin portal), el texto guardado lleva
        // lo que escribió el cliente, que sí tiene el número.
        const conNumero = (r.address_components || []).some(c => c.types?.includes('street_number'))
        return {
          place_id: r.place_id,
          description: !conNumero && /\d/.test(q) ? `${q} (${r.formatted_address})` : r.formatted_address,
          structured_formatting: { main_text: partes.slice(0, n).join(', '), secondary_text: partes.slice(n).join(', ') },
          _loc: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
        }
      })
      if (!candidatos.length) throw new Error('Sin resultados')
      // Nunca se guarda a ciegas: se enseñan para que toque la suya (el primero
      // de "carretera general norte 160" es de Las Palmas, otra isla).
      setSugerencias(candidatos); setMarcada(-1); setAbierta(true)
    } catch (e) {
      console.error('[AddressInput] geocode', e)
      setAviso('No encontramos esa dirección. Escribe calle, número y municipio.')
    } finally {
      setEligiendo(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmarEscrito()
    } else if (e.key === 'ArrowDown' && sugerencias.length) {
      e.preventDefault()
      setMarcada(i => Math.min(sugerencias.length - 1, i + 1))
    } else if (e.key === 'ArrowUp' && sugerencias.length) {
      e.preventDefault()
      setMarcada(i => Math.max(-1, i - 1))
    } else if (e.key === 'Escape') {
      setAbierta(false)
    }
  }

  const q = (value || '').trim()
  const sinResultados = !buscando && !sugerencias.length && q.length >= 3
  const mostrarLista = abierta && (sugerencias.length > 0 || buscando || eligiendo || sinResultados)

  // Que la lista quede a la vista (con el teclado del móvil abierto la hoja
  // del carrito es bajita): subir el contenedor lo justo, sin esconder la casilla.
  useEffect(() => {
    if (!mostrarLista || !sugerencias.length) return
    const raf = requestAnimationFrame(() => {
      const input = inputRef.current, lista = listaRef.current
      if (!input || !lista) return
      const vv = window.visualViewport
      const visibleAbajo = vv ? vv.offsetTop + vv.height : window.innerHeight
      const exceso = lista.getBoundingClientRect().bottom - (visibleAbajo - 8)
      if (exceso <= 0) return
      const cont = contenedorScroll(input)
      const techo = cont ? Math.max(0, cont.getBoundingClientRect().top) : (vv ? vv.offsetTop : 0)
      const margen = input.getBoundingClientRect().top - techo - 8
      const delta = Math.min(exceso, Math.max(0, margen))
      if (delta <= 0) return
      if (cont) cont.scrollBy({ top: delta, behavior: 'smooth' })
      else window.scrollBy({ top: delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [mostrarLista, sugerencias])

  return (
    <div>
      <input
        ref={inputRef}
        value={value || ''}
        onChange={e => cambiarTexto(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { clearTimeout(cierreRef.current); setAbierta(true); if (!sugerencias.length && (value || '').trim().length >= 3) buscar(value) }}
        onBlur={() => { cierreRef.current = setTimeout(() => setAbierta(false), 250) }}
        placeholder={placeholder || 'Buscar dirección...'}
        style={style}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />

      {mostrarLista && (
        <div
          ref={listaRef}
          role="listbox"
          // Que tocar una sugerencia no quite el foco (y cierre la lista) antes del click.
          onMouseDown={e => e.preventDefault()}
          style={{
            marginTop: 6, borderRadius: 12, overflow: 'hidden',
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            boxShadow: 'var(--c-shadow-md)', textAlign: 'left',
          }}
        >
          {sugerencias.map((p, i) => {
            const principal = p.structured_formatting?.main_text || p.description
            const secundario = p.structured_formatting?.secondary_text || ''
            return (
              <button
                key={p.place_id}
                type="button"
                role="option"
                aria-selected={i === marcada}
                onClick={() => elegir(p)}
                disabled={eligiendo}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px',
                  border: 'none', borderTop: i ? '1px solid var(--c-border-soft)' : 'none',
                  background: i === marcada ? 'var(--c-primary-soft)' : 'transparent',
                  cursor: eligiendo ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.35 }}>{principal}</div>
                {secundario && <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 1 }}>{secundario}</div>}
              </button>
            )
          })}
          {(buscando || eligiendo) && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--c-muted)' }}>
              {eligiendo ? 'Guardando dirección...' : 'Buscando...'}
            </div>
          )}
          {sinResultados && !eligiendo && !aviso && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--c-muted)' }}>
              No hay sugerencias para lo que has escrito.{' '}
              <button type="button" onClick={confirmarEscrito} style={{
                border: 'none', background: 'none', padding: 0, fontFamily: 'inherit',
                fontSize: 12, fontWeight: 700, color: 'var(--c-primary)', cursor: 'pointer',
              }}>Buscar esta dirección</button>
            </div>
          )}
          {sugerencias.length > 0 && (
            <div style={{ padding: '4px 14px 6px', fontSize: 10, color: 'var(--c-muted-soft)', textAlign: 'right' }}>
              Sugerencias de Google
            </div>
          )}
        </div>
      )}

      {aviso && (
        <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 6 }}>{aviso}</div>
      )}
    </div>
  )
}
