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

    const perm = await PushNotifications.requestPermissions().catch(err => {
      return { receive: 'denied' }
    })
    await debugLog('permission', { receive: perm?.receive })
    if (perm.receive !== 'granted') return null

    try {
      await PushNotifications.register()
    } catch (err) {
      await debugLog('register_error', { message: err?.message || String(err) })
      return null
    }

    async function linkOrphanFcmToUser() {
      if (!ids.user_id) return
      // Enlaza las filas recientes de user_id NULL (guardadas por AppDelegate en iOS)
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update({ user_id: ids.user_id, establecimiento_id: ids.establecimiento_id || null })
        .is('user_id', null)
        .eq('user_type', userType)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .select('id')
      if (error) await debugLog('link_orphan_error', { message: error.message })
      else await debugLog('link_orphan_ok', { linked: (data || []).length })
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

    PushNotifications.addListener('registration', async (t) => {
      await debugLog('plugin_registration', { value_preview: t.value?.slice(0, 24) + '...' })
      if (Capacitor.getPlatform() === 'ios') {
        // En iOS AppDelegate ya guarda el FCM token en Supabase (user_id=null).
        // Esperamos 1.5s y linkeamos la fila huerfana al usuario actual.
        setTimeout(() => { linkOrphanFcmToUser() }, 1500)
        // Reintentar a los 5s por si Firebase tardo mas en devolver el token
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
