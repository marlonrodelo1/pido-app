/* ──────────────────────────────────────────────────────────────────────────
 * LOGO MARQUEE — cinta infinita de logos de restaurantes que ya reparten.
 * Data-driven: añadir un logo = copiar el archivo a public/logos/ y sumar una
 * entrada a LOGOS. Se ve llena aunque haya pocos (la lista se duplica y gira).
 * ────────────────────────────────────────────────────────────────────────── */

const LOGOS = [
  { src: '/logos/come-y-calla.jpg', name: 'Come y Calla' },
  { src: '/logos/maxpizza.webp', name: "Max's Pizza" },
  { src: '/logos/octava-isla.jpeg', name: 'Guachinche Octava Isla' },
  { src: '/logos/rincon-de-fran.jpg', name: 'Rincón de Fran' },
  { src: '/logos/cafe-bar-australia.png', name: 'Café Bar Australia' },
]

const Chip = ({ logo }) => (
  <div
    style={{
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
  </div>
)

export default function LogoMarquee() {
  const track = [...LOGOS, ...LOGOS]
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
        Ya reparten con Pidoo
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
