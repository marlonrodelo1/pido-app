import { useEffect, useRef, useState } from 'react'

/**
 * ShaderBackground — fondo WebGL animado para el hero de la landing.
 * Concepto basado en shaders de "atzedent", repaletizado a tonos cálidos
 * de la marca Pidoo (naranja #FF6B2C sobre crema #FAFAF7).
 *
 * Performance: en móvil (<768px) NO se monta WebGL — se renderiza un
 * gradiente CSS estático para evitar drenar batería y bajar FPS.
 */
export default function ShaderBackground() {
  const canvasRef = useRef(null)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  )

  // Detectar desktop/móvil de forma reactiva (sin remontar todo el rato)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false })
    if (!gl) return

    const vertexSrc = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    // Shader fragment — paleta repaletizada a tonos cálidos Pidoo
    // (crema base + acentos naranja). Intensidad reducida para look elegante.
    const fragmentSrc = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      #define T (u_time * 0.18)
      #define S smoothstep

      // Hash y noise simples para distorsión orgánica
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main(){
        vec2 r = u_resolution.xy;
        vec2 uv = (gl_FragCoord.xy - 0.5 * r) / min(r.x, r.y);

        // Distorsión radial suave + flujo lento
        float t = T;
        vec2 p = uv;
        float n1 = noise(p * 1.6 + vec2(t * 0.7, t * 0.5));
        float n2 = noise(p * 3.2 - vec2(t * 0.4, t * 0.9));
        p += 0.18 * vec2(n1 - 0.5, n2 - 0.5);

        // Capa 1: blob naranja suave moviéndose en diagonal
        vec2 c1 = vec2(sin(t * 0.6) * 0.35 - 0.1, cos(t * 0.5) * 0.25 + 0.05);
        float d1 = length(p - c1);
        float blob1 = S(0.95, 0.0, d1) * 0.65;

        // Capa 2: blob secundario más sutil tono melocotón
        vec2 c2 = vec2(cos(t * 0.4) * 0.5 + 0.25, sin(t * 0.7) * 0.3 - 0.15);
        float d2 = length(p - c2);
        float blob2 = S(1.1, 0.0, d2) * 0.45;

        // Capa 3: glow lejano amarillo cálido para profundidad
        vec2 c3 = vec2(sin(t * 0.3 + 1.5) * 0.4, cos(t * 0.35 + 0.8) * 0.35);
        float d3 = length(p - c3);
        float blob3 = S(1.4, 0.2, d3) * 0.32;

        // Paleta cálida Pidoo
        vec3 cream    = vec3(0.980, 0.980, 0.965); // #FAFAF7 base
        vec3 peach    = vec3(1.000, 0.870, 0.760); // melocotón muy claro
        vec3 orange   = vec3(1.000, 0.420, 0.175); // #FF6B2C
        vec3 deep     = vec3(0.910, 0.355, 0.122); // #E85A1F
        vec3 amber    = vec3(1.000, 0.760, 0.420); // ámbar suave

        vec3 col = cream;
        col = mix(col, peach,  blob3);
        col = mix(col, amber,  blob2 * 0.55);
        col = mix(col, orange, blob1 * 0.55);
        col = mix(col, deep,   pow(blob1, 3.0) * 0.20);

        // Granito muy sutil para que no se vean bandas
        float grain = (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;
        col += grain;

        // Vignette suave hacia el crema base para que el contenido respire
        float vig = 1.0 - smoothstep(0.6, 1.5, length(uv));
        col = mix(cream, col, 0.55 + vig * 0.35);

        gl_FragColor = vec4(col, 1.0);
      }
    `

    function compile(type, src) {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, vertexSrc)
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc)
    if (!vs || !fs) return

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    // Quad fullscreen
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')

    let raf
    let start = performance.now()

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = canvas.clientWidth * dpr
      const h = canvas.clientHeight * dpr
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    function render(now) {
      resize()
      const t = (now - start) / 1000
      gl.clearColor(0.98, 0.98, 0.97, 1) // #FAFAF7
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [isDesktop])

  if (!isDesktop) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at top, rgba(255,107,44,0.08), transparent 70%), #FAFAF7',
          pointerEvents: 'none',
        }}
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
