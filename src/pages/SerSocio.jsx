import { useState } from 'react'

const beneficios = [
  { emoji: '💰', titulo: 'Comision por pedido', desc: 'Ganas un porcentaje de cada pedido que entregues' },
  { emoji: '🚀', titulo: '100% del envio', desc: 'Todo el coste de envio es para ti' },
  { emoji: '🎁', titulo: 'Propinas integras', desc: 'Las propinas van directamente a tu bolsillo' },
  { emoji: '🕐', titulo: 'Tu propio horario', desc: 'Tu decides cuando trabajar, sin jefe' },
  { emoji: '🏪', titulo: 'Tu propia tienda online', desc: 'Comparte tu link y gana por cada pedido' },
  { emoji: '📱', titulo: 'Panel de gestion completo', desc: 'Controla pedidos, ganancias e informes' },
]

const pasos = [
  { num: '1', titulo: 'Registrate', desc: 'Crea tu cuenta de socio en minutos' },
  { num: '2', titulo: 'Elige restaurantes', desc: 'Solicita vincularte a los restaurantes de tu zona' },
  { num: '3', titulo: 'Arma tu tienda', desc: 'Personaliza tu tienda con tu nombre y logo' },
  { num: '4', titulo: 'Comparte y gana', desc: 'Comparte tu link por WhatsApp, Instagram o QR' },
]

const requisitos = [
  'Ser autonomo en Espana',
  'Tener moto, bicicleta o vehiculo',
  'Smartphone con datos moviles',
  'Ganas de emprender',
]

export default function SerSocio({ onClose }) {
  const [animado, setAnimado] = useState(true)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={onClose} style={styles.backBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', background: 'var(--c-primary-light)', padding: '4px 10px', borderRadius: 6 }}>PIDOGO</span>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🛵</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2, marginBottom: 8 }}>
          Gana dinero repartiendo con <span style={{ color: 'var(--c-primary)' }}>Pidoo</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.5 }}>
          Se tu propio jefe. Reparte cuando quieras y gana desde el primer dia.
        </p>
      </div>

      {/* Ejemplo ganancias */}
      <div style={styles.earningsCard}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginBottom: 4 }}>Ganancias estimadas</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#4ADE80', letterSpacing: '-0.02em' }}>Hasta 2.000€</div>
        <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>al mes como socio repartidor activo</div>
      </div>

      {/* Beneficios */}
      <h2 style={styles.sectionTitle}>Beneficios</h2>
      <div className="ser-socio-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        {beneficios.map((b, i) => (
          <div key={i} style={styles.beneficioCard}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{b.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 2 }}>{b.titulo}</div>
            <div style={{ fontSize: 10, color: 'var(--c-muted)', lineHeight: 1.4 }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      <h2 style={styles.sectionTitle}>Como funciona</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {pasos.map((p, i) => (
          <div key={i} style={styles.pasoCard}>
            <div style={styles.pasoNum}>{p.num}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{p.titulo}</div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Requisitos */}
      <h2 style={styles.sectionTitle}>Requisitos</h2>
      <div style={{ ...styles.card, marginBottom: 28 }}>
        {requisitos.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#4ADE80' }}>✓</div>
            <span style={{ fontSize: 13, color: 'var(--c-text)' }}>{r}</span>
          </div>
        ))}
      </div>

      {/* Testimonios */}
      <div style={{ ...styles.card, background: 'var(--c-primary-light)', borderColor: 'var(--c-primary-soft)', marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--c-text)', lineHeight: 1.5, marginBottom: 8 }}>
          "Llevo 3 meses como socio Pidoo y ya gano mas de 1.500EUR al mes. Lo mejor es que yo decido mi horario."
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)' }}>— Carlos M., Tenerife</div>
      </div>

      {/* Como se gana */}
      <h2 style={styles.sectionTitle}>Como ganas dinero</h2>
      <div style={{ ...styles.card, marginBottom: 28 }}>
        {[
          { icon: '🛵', titulo: 'Entrega pedidos', desc: 'Recoge en el restaurante y entrega al cliente. Ganas comision + envio por cada entrega.' },
          { icon: '🔗', titulo: 'Comparte tu tienda', desc: 'Tienes tu propia tienda online. Cada pedido que entre por tu link te genera ganancias extra.' },
          { icon: '💸', titulo: 'Recibe propinas', desc: 'Las propinas del cliente van 100% a tu bolsillo, sin comisiones.' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 2 }}>{item.titulo}</div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={() => window.open('https://rider.pidoo.es', '_blank')} style={styles.ctaBtn}>
        Registrarme como socio
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6 }}>
          <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
        </svg>
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-muted)', marginTop: 12, paddingBottom: 20 }}>
        Sin permanencia · Registro gratuito · Empieza hoy
      </div>
    </div>
  )
}

const styles = {
  container: { animation: 'fadeIn 0.3s ease' },
  backBtn: { width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  hero: { textAlign: 'center', marginBottom: 24 },
  earningsCard: {
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '20px 24px',
    textAlign: 'center', marginBottom: 28,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: 'var(--c-text)', marginBottom: 12, letterSpacing: '-0.01em' },
  beneficioCard: {
    background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 12, padding: '16px 14px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  pasoCard: {
    display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  pasoNum: {
    width: 32, height: 32, borderRadius: 10, background: 'var(--c-primary)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  card: {
    background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 12, padding: '14px 18px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  ctaBtn: {
    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)', color: '#fff',
    fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
    cursor: 'pointer', fontFamily: 'var(--font)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(255,107,44,0.06)',
  },
}
