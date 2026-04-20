import { ArrowLeft, Mail, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function EliminarCuenta() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-text)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} /> Volver
        </button>

        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Eliminar cuenta de Pidoo
        </div>
        <p style={{ fontSize: 15, color: 'var(--c-text-soft)', lineHeight: 1.6, marginBottom: 32 }}>
          Puedes eliminar tu cuenta y todos tus datos personales asociados en cualquier momento. Esta accion es irreversible.
        </p>

        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: 'var(--c-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={18} color="var(--c-primary)" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Opcion 1 — Desde la app</div>
          </div>
          <ol style={{ fontSize: 14, color: 'var(--c-text-soft)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Abre la app Pidoo e inicia sesion.</li>
            <li>Ve a <strong>Perfil</strong> (icono inferior derecho).</li>
            <li>Desplazate al final y pulsa <strong>Eliminar cuenta</strong>.</li>
            <li>Confirma la accion escribiendo tu email.</li>
          </ol>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', marginTop: 12, marginBottom: 0 }}>
            Se eliminaran inmediatamente: tu perfil, direcciones, historial de pedidos, notificaciones y tokens de sesion.
          </p>
        </div>

        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: 'var(--c-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} color="var(--c-primary)" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Opcion 2 — Por email</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Si no tienes acceso a la app, envianos un email desde la direccion asociada a tu cuenta a:
          </p>
          <a
            href="mailto:soporte@pidoo.es?subject=Solicitud%20de%20eliminacion%20de%20cuenta&body=Hola%2C%0A%0ASolicito%20la%20eliminacion%20de%20mi%20cuenta%20Pidoo%20y%20todos%20los%20datos%20asociados.%0A%0AEmail%20de%20la%20cuenta%3A%20%5Bescribe%20aqui%20tu%20email%5D%0A%0AGracias."
            style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 10, background: 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            soporte@pidoo.es
          </a>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', marginTop: 12, marginBottom: 0 }}>
            Procesaremos tu solicitud en un plazo maximo de <strong>30 dias</strong>. Te confirmaremos por email cuando se complete.
          </p>
        </div>

        <div style={{ background: 'var(--c-surface2)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Que datos se eliminan</div>
          <ul style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Perfil personal (nombre, telefono, direcciones)</li>
            <li>Credenciales de acceso (email, contrasena)</li>
            <li>Historial completo de pedidos</li>
            <li>Notificaciones y preferencias</li>
            <li>Tokens de sesion y dispositivos vinculados</li>
            <li>Metodos de pago guardados (en Stripe)</li>
          </ul>
          <div style={{ fontSize: 14, fontWeight: 800, margin: '16px 0 8px' }}>Que se conserva (obligacion legal)</div>
          <ul style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Facturas de pedidos completados (art. 29 del Codigo de Comercio — 6 anos).</li>
            <li>Registros financieros agregados y anonimizados para contabilidad.</li>
          </ul>
        </div>

        <p style={{ fontSize: 12, color: 'var(--c-muted)', textAlign: 'center', marginTop: 32 }}>
          Pidoo · Hecho en Canarias · <a href="/privacidad" style={{ color: 'var(--c-primary)', textDecoration: 'none' }}>Politica de privacidad</a>
        </p>
      </div>
    </div>
  )
}
