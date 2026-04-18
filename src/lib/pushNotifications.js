import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * Registra push notifications nativas (FCM/APNs via Capacitor).
 * Envuelto en try/catch + import dinámico para no crashear la app si
 * falta `google-services.json` o el plugin no está listo en release.
 */
export async function registerPushNotifications(userType, ids = {}, onNotification) {
  if (!Capacitor.isNativePlatform()) return null

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const perm = await PushNotifications.requestPermissions().catch(err => {
      console.warn('[push] requestPermissions failed:', err?.message || err)
      return { receive: 'denied' }
    })
    if (perm.receive !== 'granted') return null

    // register() puede lanzar excepción nativa en Android sin google-services.json
    try {
      await PushNotifications.register()
    } catch (err) {
      console.warn('[push] register failed:', err?.message || err)
      return null
    }

    PushNotifications.addListener('registration', async (t) => {
      try {
        const fcmToken = t.value
        await supabase.from('push_subscriptions').upsert({
          endpoint: `fcm:${fcmToken}`,
          p256dh: '',
          auth: '',
          fcm_token: fcmToken,
          user_type: userType,
          user_id: ids.user_id || null,
          establecimiento_id: ids.establecimiento_id || null,
        }, { onConflict: 'endpoint' })
      } catch (err) {
        console.warn('[push] upsert token failed:', err?.message || err)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registrationError:', err?.error || err)
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
