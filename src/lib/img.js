// Redimensionado de imágenes según su origen. Los banners se subían/importaban
// a tamaño original (1-3 MB) y la Home los descargaba todos a la vez.
// - Cloudinary (imports last.shop): añade w_<px> como transformación encadenada
// - Supabase Storage: endpoint render/image (disponible en plan Pro)
// - Otro origen o URL rara: se devuelve tal cual (nunca rompe la imagen)
export function optimizarImagen(url, width = 640) {
  if (!url || typeof url !== 'string') return url
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    }
    if (url.includes('/storage/v1/object/public/')) {
      const u = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      return `${u}${u.includes('?') ? '&' : '?'}width=${width}&quality=75`
    }
  } catch (_) { /* noop: mejor original que roto */ }
  return url
}
