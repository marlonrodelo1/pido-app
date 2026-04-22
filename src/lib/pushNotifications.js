import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * Registra push notifications nativas (FCM via Capacitor).
 *
 * En Android, @capacitor/push-notifications devuelve directamente el token FCM.
 * En iOS devuelve el token APNs, por lo que usamos @capacitor-community/fcm
 * para obtener el token FCM real (requiere Firebase iOS SDK + GoogleService-Info.plist).
 */
async function debugLog(event, details) {
  try {
    await supabase.from('push_debug_logs').insert({
      platform: Capacitor.getPlatform(),
      event,
      details: details ? JSON.stringify(details).slice(0, 2000) : null,
    })
  } catch (_) {}
}

export async function registerPushNotifications(userType, ids = {}, onNotification) {
  if (!Capacitor.isNativePlatform()) return null

  await debugLog('register_start', { userType, user_id: ids.user_id })

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const perm = await PushNotifications.requestPermissions().catch(err => {
      console.warn('[push] requestPermissions failed:', err?.message || err)
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

    async function upsertToken(fcmToken, source) {
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
        await debugLog('token_saved', { source, token_preview: fcmToken?.slice(0, 24) + '...' })
      } catch (err) {
        await debugLog('token_save_error', { source, message: err?.message || String(err) })
      }
    }

    PushNotifications.addListener('registration', async (t) => {
      await debugLog('plugin_registration', { value_preview: t.value?.slice(0, 24) + '...' })
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const { FCM } = await import('@capacitor-community/fcm')
          const { token: fcmToken } = await FCM.getToken()
          if (fcmToken) await upsertToken(fcmToken, 'fcm_plugin')
          else await debugLog('fcm_gettoken_empty', null)
        } catch (err) {
          await debugLog('fcm_plugin_error', { message: err?.message || String(err) })
          await upsertToken(t.value, 'apns_fallback')
        }
      } else {
        await upsertToken(t.value, 'android_fcm')
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
    console.warn('[push] plugin init error, push disabled in this session:', err?.message || err)
  }
}

export async function unregisterPushNotifications() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
  } catch (err) {
    console.warn('[push] removeAllListeners failed:', err?.message || err)
  }
}
