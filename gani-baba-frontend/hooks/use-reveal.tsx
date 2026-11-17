'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Direction = 'up' | 'left' | 'right' | 'none'

const hidden: Record<Direction, string> = {
  up: 'opacity-0 translate-y-8',
  left: 'opacity-0 -translate-x-8',
  right: 'opacity-0 translate-x-8',
  none: 'opacity-0',
}

/**
 * Scroll-reveal wrapper: fades/slides its children in the first time they
 * scroll into view. Use `delay` (ms) to stagger items in a grid.
 *
 *   <Reveal delay={120}>...</Reveal>
 */
export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: ReactNode
  delay?: number
  direction?: Direction
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={`reveal ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : hidden[direction]
      } ${className}`}
    >
      {children}
    </div>
  )
}
