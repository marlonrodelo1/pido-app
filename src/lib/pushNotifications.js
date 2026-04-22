import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * Registra push notifications nativas (FCM via Capacitor).
 *
 * En Android, @capacitor/push-notifications devuelve directamente el token FCM.
 * En iOS devuelve el token APNs, por lo que usamos @capacitor-community/fcm
 * para obtener el token FCM real (requiere Firebase iOS SDK + GoogleService-Info.plist).
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

    try {
      await PushNotifications.register()
    } catch (err) {
      console.warn('[push] register failed:', err?.message || err)
      return null
    }

    async function upsertToken(fcmToken) {
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
      } catch (err) {
        console.warn('[push] upsert token failed:', err?.message || err)
      }
    }

    PushNotifications.addListener('registration', async (t) => {
      if (Capacitor.getPlatform() === 'ios') {
        // En iOS t.value = APNs token; pedimos el FCM token real via @capacitor-community/fcm
        try {
          const { FCM } = await import('@capacitor-community/fcm')
          const { token: fcmToken } = await FCM.getToken()
          if (fcmToken) await upsertToken(fcmToken)
          else console.warn('[push] FCM.getToken devolvio vacio en iOS')
        } catch (err) {
          console.warn('[push] FCM plugin unavailable, guardando APNs token como fallback:', err?.message || err)
          await upsertToken(t.value)
        }
      } else {
        // Android: el token de registro ya es FCM
        await upsertToken(t.value)
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
