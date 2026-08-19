/* ──────────────────────────────────────────────────────────────────────────
 * OrbeVoz — el orbe del camarero de mesa. Es TODA la interfaz mientras se
 * habla: no hay chat, ni transcripción, ni botones. Se mueve con la voz.
 *
 * ⚠️ ESTE COMPONENTE NO ABRE EL MICRÓFONO. El original del que viene sí lo
 * hacía (su propio `getUserMedia`), y eso aquí sería un fallo: quien está
 * hablando es el SDK de ElevenLabs, que YA tiene el micro abierto. Dos
 * streams a la vez en un teléfono es pedir problemas —eco, permisos raros,
 * batería— para medir dos veces lo mismo. El nivel entra por `nivelRef`, que
 * lo rellena `CamareroMesa` leyendo los analizadores del propio SDK. Así el
 * orbe reacciona TAMBIÉN cuando contesta el camarero, no solo cuando habla
 * el cliente.
 *
 * ⚠️ `nivelRef` es una ref, no una prop de estado, A PROPÓSITO: si el nivel
 * entrara como prop, React re-renderizaría 60 veces por segundo y el efecto
 * de WebGL se remontaría en cada cambio.
 *
 * WebGL a mano y sin librería (nada de `ogl`): el repo ya dibuja shaders así
 * en ShaderBackground.jsx y no merece la pena arrastrar una dependencia nueva
 * a una app que va a las stores.
 *
 * Shader: campo de ruido simplex 3D con dos luces, repaletizado a los naranjas
 * de Pidoo. Si algo falla —móvil sin WebGL, contexto perdido— el componente
 * no rompe: deja el hueco vacío y `CamareroMesa` sigue funcionando, porque
 * esto es decoración y la conversación va por su lado.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from 'react'

const VERT = `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const FRAG = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
uniform vec3  color1;
uniform vec3  color2;
uniform vec3  color3;
varying vec2 vUv;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

const float innerRadius = 0.6;
const float noiseScale = 0.65;

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}
float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;

  float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

  float a = iTime * -1.0;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  float v1 = light2(1.5, 5.0, d);
  v1 *= light1(1.0, 50.0, d0);

  float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
  float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

  vec3 col = mix(color1, color2, cl);
  col = mix(color3, col, v0);
  col = (col + v1) * v2 * v3;
  col = clamp(col, 0.0, 1.0);

  return extractAlpha(col);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - center) / size * 2.0;

  float s = sin(rot);
  float c = cos(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
  uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

  vec4 col = draw(uv);
  // rgb ya sale multiplicado por alpha: el blending de abajo es
  // gl.ONE / gl.ONE_MINUS_SRC_ALPHA, que es el que le corresponde. Con
  // SRC_ALPHA se multiplicaria dos veces y el orbe saldria apagado sobre el
  // glaseado claro de la carta.
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}`

// Naranjas de Pidoo. color1/color2 son los dos tonos que rotan por el anillo;
// color3 es el corazon oscuro que da el hueco del centro.
const NARANJA   = [1.0, 0.4196, 0.1725]    // #FF6B2C
const ALBARICOQ = [1.0, 0.7686, 0.6039]    // #FFC49A
const TERRACOTA = [0.4784, 0.1804, 0.0392] // #7A2E0A

function compilar(gl, tipo, fuente) {
  const sh = gl.createShader(tipo)
  gl.shaderSource(sh, fuente)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('OrbeVoz shader:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export default function OrbeVoz({
  nivelRef,
  color1 = NARANJA,
  color2 = ALBARICOQ,
  color3 = TERRACOTA,
  className,
  style,
}) {
  const cajaRef = useRef(null)

  useEffect(() => {
    const caja = cajaRef.current
    if (!caja) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    caja.appendChild(canvas)

    const soltarCanvas = () => {
      try { if (caja.contains(canvas)) caja.removeChild(canvas) } catch { /* ya no está */ }
    }

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      // El orbe está a la vista todo el rato: sin esto, en portátiles con dos
      // GPU el navegador elige la potente y calienta el equipo para dibujar
      // un círculo.
      powerPreference: 'low-power',
    })
    if (!gl) return soltarCanvas

    const vs = compilar(gl, gl.VERTEX_SHADER, VERT)
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return soltarCanvas

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('OrbeVoz link:', gl.getProgramInfoLog(prog))
      return soltarCanvas
    }
    gl.useProgram(prog)

    // Un solo triángulo que se sale de la pantalla: cubre todo el viewport con
    // 3 vértices en vez de 6 y sin la costura diagonal de dos triángulos.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0,
       3, -1, 2, 0,
      -1,  3, 0, 2,
    ]), gl.STATIC_DRAW)

    const locPos = gl.getAttribLocation(prog, 'position')
    const locUv = gl.getAttribLocation(prog, 'uv')
    gl.enableVertexAttribArray(locPos)
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(locUv)
    gl.vertexAttribPointer(locUv, 2, gl.FLOAT, false, 16, 8)

    const u = n => gl.getUniformLocation(prog, n)
    const uTime = u('iTime'), uRes = u('iResolution'), uHover = u('hover')
    const uRot = u('rot'), uHoverInt = u('hoverIntensity')
    gl.uniform3fv(u('color1'), color1)
    gl.uniform3fv(u('color2'), color2)
    gl.uniform3fv(u('color3'), color3)

    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const medir = () => {
      // Tope de 2: por encima no se nota, y en un móvil con pantalla 3x
      // triplicaría los píxeles a pintar en un bucle que no para nunca.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(caja.clientWidth * dpr))
      const h = Math.max(1, Math.round(caja.clientHeight * dpr))
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      gl.uniform3f(uRes, w, h, w / h)
    }
    medir()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    if (ro) ro.observe(caja)
    else window.addEventListener('resize', medir)

    const quieto = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let t0 = 0
    let giro = 0
    let nivel = 0

    const pintar = t => {
      raf = requestAnimationFrame(pintar)
      if (!t0) t0 = t
      const dt = Math.min((t - t0) * 0.001, 0.05)
      t0 = t
      const seg = t * 0.001

      // Suavizado asimétrico: sube rápido (que se note el ataque de la voz) y
      // baja despacio. Bajando igual de rápido, el orbe daría tirones en cada
      // pausa entre palabras.
      const objetivo = Math.max(0, Math.min(1, nivelRef?.current ?? 0))
      nivel += (objetivo - nivel) * (objetivo > nivel ? 0.35 : 0.06)

      if (!quieto) {
        giro += dt * (0.3 + nivel * 2.4)
        gl.uniform1f(uHover, Math.min(nivel * 2.0, 1.0))
        gl.uniform1f(uHoverInt, Math.min(nivel * 0.64, 0.8))
      } else {
        gl.uniform1f(uHover, 0)
        gl.uniform1f(uHoverInt, 0)
      }

      gl.uniform1f(uTime, quieto ? 0 : seg)
      gl.uniform1f(uRot, giro)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(pintar)

    // Con la pestaña de fondo el navegador ya congela el rAF, pero la carta se
    // queda abierta encima de una mesa: sin resetear el reloj, al volver el
    // primer fotograma daría un salto de tiempo enorme.
    const alVolver = () => { t0 = 0 }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', alVolver)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', medir)
      try { gl.getExtension('WEBGL_lose_context')?.loseContext() } catch { /* contexto ya perdido */ }
      soltarCanvas()
    }
    // Los colores por defecto son constantes de módulo: se comparan por
    // referencia y no provocan remontajes. El nivel entra por ref, jamás como
    // dependencia.
  }, [nivelRef, color1, color2, color3])

  return <div ref={cajaRef} className={className} style={{ width: '100%', height: '100%', ...style }} />
}
