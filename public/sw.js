// Service Worker lifecycle
self.addEventListener('install', function(event) {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

// Firebase Messaging Service Worker
// Versión 10.12.0 fija intencionalmente (no usar @latest). Coordinar con `firebase` en package.json.
// TODO: migrar a paquete local (vite-plugin-pwa o build manual) para no depender de la CDN gstatic.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')
} catch (e) {
  console.warn('[SW] Firebase scripts failed to load:', e)
}


if (typeof firebase !== 'undefined') {
firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
})

const messaging = firebase.messaging()

// Background message handler (when app is in background/closed)
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || 'Nuevo pedido'
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Tienes un nuevo pedido',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [300, 100, 300, 100, 300],
    data: payload.data || {},
    requireInteraction: true,
    tag: 'pedido-' + Date.now(),
  }
  return self.registration.showNotification(title, options)
})
} // end if firebase

// Web Push handler (fallback)
self.addEventListener('push', function(event) {
  let data = { title: 'pidoo', body: 'Tienes una notificación' }
  try {
    data = event.data.json()
  } catch (e) {
    data.body = event.data?.text() || data.body
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'pidoo', {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [300, 100, 300, 100, 300],
      data: data.data || {},
      requireInteraction: true,
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  var data = event.notification.data || {}
  var target = '/'
  if (data.pedido_id) {
    target = '/pedido/' + data.pedido_id
  } else if (data.url) {
    target = data.url
  } else if (data.pedido_codigo) {
    target = '/pedido?codigo=' + data.pedido_codigo
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i]
        if ('focus' in c) {
          c.postMessage({ type: 'navigate', target: target })
          return c.focus()
        }
      }
      return clients.openWindow(target)
    })
  )
})
