import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Contacto() {
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
          Contacto y soporte
        </div>
        <p style={{ fontSize: 15, color: 'var(--c-text-soft)', lineHeight: 1.6, marginBottom: 32 }}>
          Estamos aqui para ayudarte con cualquier duda, problema con un pedido o sugerencia sobre Pidoo. Contactanos por el canal que prefieras.
        </p>

        {/* Email */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: 'var(--c-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} color="var(--c-primary)" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Email</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
            La via mas rapida para recibir una respuesta detallada. Respondemos en menos de 24 horas en dias laborables.
          </p>
          <a
            href="mailto:soporte@pidoo.es"
            style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 10, background: 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            soporte@pidoo.es
          </a>
        </div>

        {/* Telefono */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: 'var(--c-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={18} color="var(--c-primary)" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Telefono</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Si tu problema es urgente (pedido en curso, incidencia con el repartidor), llamanos directamente.
          </p>
          <a
            href="tel:+34687257653"
            style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 10, background: 'var(--c-surface2)', color: 'var(--c-text)', fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--c-border)' }}
          >
            +34 687 25 76 53
          </a>
        </div>

        {/* Chat en la app */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: 'var(--c-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color="var(--c-primary)" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Chat en la app</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: 0 }}>
            Si ya tienes cuenta en Pidoo, puedes abrir un ticket desde <strong>Perfil &rarr; Ayuda</strong>. Tu mensaje nos llega identificado con tus pedidos, lo que agiliza la resolucion.
          </p>
        </div>

        {/* Informacion empresa */}
        <div style={{ background: 'var(--c-surface2)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--c-primary)" strokeWidth={2.2} />
            Horario de atencion
          </div>
          <ul style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.9, paddingLeft: 0, margin: 0, listStyle: 'none' }}>
            <li><strong>Lunes a Viernes:</strong> 09:00 - 22:00 (GMT+0, Canarias)</li>
            <li><strong>Sabados, Domingos y festivos:</strong> 12:00 - 22:00</li>
          </ul>

          <div style={{ fontSize: 14, fontWeight: 800, margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} color="var(--c-primary)" strokeWidth={2.2} />
            Ubicacion
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: 0 }}>
            Pidoo opera desde Tenerife, Islas Canarias (Espana). La atencion al cliente es 100% remota via email, telefono o chat.
          </p>
        </div>

        {/* Preguntas frecuentes */}
        <div style={{ background: 'var(--c-surface2)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={16} color="var(--c-primary)" strokeWidth={2.2} />
            Antes de contactarnos
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Estas son las consultas mas habituales y su solucion rapida:
          </p>
          <ul style={{ fontSize: 13, color: 'var(--c-text-soft)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li><strong>No encuentro restaurantes.</strong> Activa la ubicacion del movil y permite el acceso a Pidoo. Solo mostramos restaurantes dentro de tu radio.</li>
            <li><strong>Mi pedido no llega.</strong> Revisa el estado en <em>Mis pedidos</em>. Si han pasado mas de 15 minutos del tiempo estimado, contactanos.</li>
            <li><strong>Quiero cancelar un pedido.</strong> Si aun no ha sido aceptado por el restaurante, puedes cancelarlo desde la app. En otro caso escribenos.</li>
            <li><strong>No me llega el email de registro.</strong> Revisa tu carpeta de spam / correo no deseado.</li>
            <li><strong>Quiero eliminar mi cuenta.</strong> Entra en <a href="/eliminar-cuenta" style={{ color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 700 }}>/eliminar-cuenta</a> para ver el proceso.</li>
          </ul>
        </div>

        <p style={{ fontSize: 12, color: 'var(--c-muted)', textAlign: 'center', marginTop: 32 }}>
          Pidoo · Hecho en Canarias · <a href="/privacidad" style={{ color: 'var(--c-primary)', textDecoration: 'none' }}>Politica de privacidad</a> · <a href="/terminos" style={{ color: 'var(--c-primary)', textDecoration: 'none' }}>Terminos</a>
        </p>
      </div>
    </div>
  )
}
