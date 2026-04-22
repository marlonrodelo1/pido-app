import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

async function debugLog(event, details) {
  try {
    await supabase.from('push_debug_logs').insert({
      platform: Capacitor.getPlatform(),
      event,
      details: details ? JSON.stringify(details).slice(0, 2000) : null,
    })
  } catch (_) {}
}

/**
 * Push notifications nativas.
 *
 * Android: @capacitor/push-notifications devuelve directamente el FCM token.
 * iOS: AppDelegate + FirebaseMessaging (swizzle manual) guarda el FCM token
 *      en push_subscriptions con user_id=null. Despues de login nosotros
 *      hacemos UPDATE enlazandolo al usuario actual.
 */
export async function registerPushNotifications(userType, ids = {}, onNotification) {
  if (!Capacitor.isNativePlatform()) return null

  await debugLog('register_start', { userType, user_id: ids.user_id })

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    async function linkOrphanFcmToUser() {
      if (!ids.user_id) return
      const { data: linked, error } = await supabase
        .from('push_subscriptions')
        .update({ user_id: ids.user_id, establecimiento_id: ids.establecimiento_id || null })
        .is('user_id', null)
        .eq('user_type', userType)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .select('id, created_at')
      if (error) { await debugLog('link_orphan_error', { message: error.message }); return }
      await debugLog('link_orphan_ok', { linked: (linked || []).length })

      // Limpieza: solo mantener el FCM token mas reciente del usuario.
      // Asi evitamos recibir N notificaciones cuando se acumulan tokens de reinstalaciones.
      const { data: allTokens } = await supabase
        .from('push_subscriptions')
        .select('id, created_at')
        .eq('user_id', ids.user_id)
        .eq('user_type', userType)
        .like('endpoint', 'fcm:%')
        .order('created_at', { ascending: false })
      if (allTokens && allTokens.length > 1) {
        const keepId = allTokens[0].id
        const toDelete = allTokens.slice(1).map(t => t.id)
        const { error: delErr } = await supabase
          .from('push_subscriptions')
          .delete()
          .in('id', toDelete)
        if (delErr) await debugLog('cleanup_old_tokens_error', { message: delErr.message })
        else await debugLog('cleanup_old_tokens_ok', { kept: keepId, deleted: toDelete.length })
      }
    }

    async function upsertAndroidToken(fcmToken) {
      try {
        await supabase.from('push_subscriptions').upsert({
          endpoint: `fcm:${fcmToken}`,
          p256dh: '',
          auth: '',
          fcm_token: fcmToken,
          user_type: userType,
          user_id: ids.user_id || null,
          establecimiento_id: ids.establecimiento_id || null,
        }, { onConflict: 'endpoint' })
        await debugLog('token_saved', { source: 'android_fcm' })
      } catch (err) {
        await debugLog('token_save_error', { message: err?.message || String(err) })
      }
    }

    // Registrar listeners ANTES de register() para no perder el evento 'registration'
    PushNotifications.addListener('registration', async (t) => {
      await debugLog('plugin_registration', { value_preview: t.value?.slice(0, 24) + '...' })
      if (Capacitor.getPlatform() === 'ios') {
        setTimeout(() => { linkOrphanFcmToUser() }, 1500)
        setTimeout(() => { linkOrphanFcmToUser() }, 5000)
      } else {
        await upsertAndroidToken(t.value)
      }
    })

    PushNotifications.addListener('registrationError', async (err) => {
      await debugLog('plugin_registration_error', { error: err?.error || String(err) })
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (onNotification) onNotification(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      if (onNotification) onNotification(action.notification, true)
    })

    // Ahora si pedimos permisos y registramos
    const perm = await PushNotifications.requestPermissions().catch(() => ({ receive: 'denied' }))
    await debugLog('permission', { receive: perm?.receive })
    if (perm.receive !== 'granted') return null

    try {
      await PushNotifications.register()
    } catch (err) {
      await debugLog('register_error', { message: err?.message || String(err) })
      return null
    }

    // Tambien disparar el link en iOS incluso si el evento 'registration' no llega
    // (el AppDelegate ya guardo el token en la BD independientemente)
    if (Capacitor.getPlatform() === 'ios' && ids.user_id) {
      setTimeout(() => { linkOrphanFcmToUser() }, 3000)
      setTimeout(() => { linkOrphanFcmToUser() }, 8000)
    }
  } catch (err) {
    await debugLog('plugin_init_error', { message: err?.message || String(err) })
  }
}

export async function unregisterPushNotifications() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
  } catch (_) {}
}
