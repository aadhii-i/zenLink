import { useEffect, useRef, useState } from 'react'

// Animates a displayed number toward `target` whenever it changes — used
// for dashboard stat cards so a refetch reads as a live update rather than
// a jump-cut. Skips the animation entirely under prefers-reduced-motion.
export function useCountUp(target, { duration = 700 } = {}) {
  const [value, setValue] = useState(typeof target === 'number' ? target : 0)
  const prevTarget = useRef(typeof target === 'number' ? target : 0)

  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      prevTarget.current = target
      return
    }

    const from = prevTarget.current
    const to = target
    if (from === to) return

    const start = performance.now()
    let frame

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        prevTarget.current = to
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
