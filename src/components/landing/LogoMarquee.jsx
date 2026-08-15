/* ──────────────────────────────────────────────────────────────────────────
 * LOGO MARQUEE — cinta infinita con los restaurantes que ya están en Pidoo.
 *
 * LA LISTA SALE DE `landing_vitrina()`, ya ordenada por pedidos de los últimos
 * 30 días. Antes eran cinco entradas escritas a mano y, medido el 15 ago 2026,
 * la prueba social estaba justo del revés: enseñaba a Come y Calla (0 pedidos
 * en 30 días) y a Octava Isla (0), y NO enseñaba a Mamma Mia (9) ni a Dar Kebab
 * (8), que son los dos que sostienen el volumen. Un alta nueva ya no exige
 * tocar este fichero.
 *
 * LOGOS_FALLBACK es el respaldo de los ficheros locales: si la consulta falla,
 * la cinta sigue llena en vez de dejar un hueco en la portada.
 * ────────────────────────────────────────────────────────────────────────── */

const LOGOS_FALLBACK = [
  { src: '/logos/maxpizza.webp', name: "Max's Pizza" },
  { src: '/logos/rincon-de-fran.jpg', name: 'Rincón de Fran' },
  { src: '/logos/cafe-bar-australia.png', name: 'Café Bar Australia' },
  { src: '/logos/octava-isla.jpeg', name: 'Guachinche Octava Isla' },
  { src: '/logos/come-y-calla.jpg', name: 'Come y Calla' },
]

/* Con `slug` el chip es un enlace a la tienda de ese restaurante. No es
   decoración: la portada no tenía UN SOLO enlace a las 9 tiendas públicas, así
   que para un buscador esas páginas no colgaban de ningún sitio. */
const Chip = ({ logo }) => {
  const Tag = logo.slug ? 'a' : 'div'
  return (
  <Tag
    href={logo.slug ? `/${logo.slug}` : undefined}
    style={{
      textDecoration: 'none',
      flexShrink: 0,
      height: 84,
      minWidth: 150,
      padding: '0 26px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      background: 'var(--c-paper)',
      border: '1px solid var(--c-border)',
      borderRadius: 18,
      boxShadow: '0 1px 3px rgba(26,24,21,0.04)',
    }}
  >
    <img
      src={logo.src}
      alt={logo.name}
      loading="lazy"
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--c-text-soft)',
        whiteSpace: 'nowrap',
      }}
    >
      {logo.name}
    </span>
  </Tag>
  )
}

export default function LogoMarquee({ restaurantes }) {
  const logos = Array.isArray(restaurantes) && restaurantes.length
    ? restaurantes.filter((r) => r?.logo_url).map((r) => ({ src: r.logo_url, name: r.nombre, slug: r.slug }))
    : LOGOS_FALLBACK
  const track = [...logos, ...logos]
  return (
    <section
      style={{
        padding: '48px 0',
        background: 'var(--c-cream)',
        borderTop: '1px solid var(--c-border)',
        borderBottom: '1px solid var(--c-border)',
      }}
    >
      <style>{marqueeCss}</style>
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--c-muted)',
          marginBottom: 26,
          padding: '0 20px',
        }}
      >
        {/* "Están" y no "reparten": Drink2Home tiene `tiene_delivery=false`, y
            la lista ahora la trae la BD entera, no una selección a mano. */}
        Ya están en Pidoo
      </div>

      <div className="pd-marquee">
        <div className="pd-marquee-track">
          {track.map((logo, i) => (
            <Chip key={i} logo={logo} />
          ))}
        </div>
        {/* Máscaras de degradado en los bordes */}
        <div className="pd-marquee-fade pd-marquee-fade-l" />
        <div className="pd-marquee-fade pd-marquee-fade-r" />
      </div>
    </section>
  )
}

const marqueeCss = `
.pd-marquee {
  position: relative;
  width: 100%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.pd-marquee-track {
  display: flex;
  gap: 20px;
  width: max-content;
  animation: pd-marquee-scroll 32s linear infinite;
}
.pd-marquee:hover .pd-marquee-track { animation-play-state: paused; }
.pd-marquee-fade { display: none; }
@keyframes pd-marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-50% - 10px)); }
}
@media (prefers-reduced-motion: reduce) {
  .pd-marquee-track { animation: none; }
}
`
