let canvas: HTMLCanvasElement | null = null
let ctx2d: CanvasRenderingContext2D | null = null
let particles: { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; life: number; maxLife: number }[] = []
let raf = 0

export function confettiBurst(x?: number, y?: number, count = 120, colors: string[] = ['#a78bfa', '#f0abfc', '#fbbf24', '#22d3ee', '#f472b6', '#34d399']) {
  try {
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;'
      document.body.appendChild(canvas)
      ctx2d = canvas.getContext('2d')
    }
    const c = ctx2d
    if (!c || !canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = x ?? window.innerWidth / 2
    const cy = y ?? window.innerHeight / 2
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 5 + Math.random() * 9
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (2 + Math.random() * 4),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 100 + Math.random() * 90,
      })
    }
    if (!raf) tick()
  } catch {}
}

function tick() {
  if (!ctx2d || !canvas) { raf = 0; return }
  const c = ctx2d
  c.clearRect(0, 0, window.innerWidth, window.innerHeight)
  particles = particles.filter((p) => p.life < p.maxLife)
  for (const p of particles) {
    p.life++
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.22
    p.rot += p.vr
    const alpha = 1 - p.life / p.maxLife
    c.save()
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    c.globalAlpha = Math.max(0, alpha)
    c.fillStyle = p.color
    c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
    c.restore()
  }
  if (particles.length > 0) {
    raf = requestAnimationFrame(tick)
  } else {
    c.clearRect(0, 0, window.innerWidth, window.innerHeight)
    raf = 0
  }
}