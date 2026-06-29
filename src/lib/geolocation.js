import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

/**
 * Solicita permisos y obtiene la posición actual del usuario.
 * En web usa navigator.geolocation, en nativo usa Capacitor Geolocation.
 */
export async function getCurrentPosition() {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions()
    if (perm.location !== 'granted') {
      throw new Error('Permiso de ubicación denegado')
    }
    // Para descubrir restaurantes / geocodificar una dirección NO necesitamos
    // precisión de metros; alta precisión sin timeout puede colgarse esperando
    // un fix GPS en interiores. COARSE + timeout + maximumAge devuelve en 1-3s
    // o cae al fallback (dirección guardada) sin dejar la pantalla colgada.
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  })
}

/**
 * Observa cambios de posición (para tracking del rider).
 * Devuelve un ID de watch para poder hacer clearWatch después.
 */
export async function watchPosition(callback) {
  if (Capacitor.isNativePlatform()) {
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (pos, err) => {
        if (pos) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      }
    )
    return watchId
  }

  // Web fallback
  const watchId = navigator.geolocation.watchPosition(
    pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {},
    { enableHighAccuracy: true }
  )
  return watchId
}

/**
 * Detiene el tracking de posición.
 */
export async function clearWatch(watchId) {
  if (Capacitor.isNativePlatform()) {
    await Geolocation.clearWatch({ id: watchId })
  } else {
    navigator.geolocation.clearWatch(watchId)
  }
}
