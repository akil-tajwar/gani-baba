'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Droplets } from 'lucide-react'
import { WaveLine } from '@/components/shared/section-heading'

/**
 * HERO SLIDES  —  edit this list to change the banner.
 * Put your banner photos in /public and set `image` (e.g. '/banner-1.jpg').
 * Recommended size: 1400 x 1000 px (landscape), JPG/WebP.
 * Without an image a soft brand-colored panel is shown instead.
 */
const slides: {
  id: number
  title: string
  subtitle: string
  text: string
  cta: string
  href: string
  image?: string
}[] = [
  {
    id: 1,
    title: 'Bathrooms',
    subtitle: 'by Gani Baba, for you',
    text: 'Commodes, basins and accessories from trusted brands.',
    cta: 'Shop all products',
    href: '/men-products',
    image: '/banner1.jpg',
  },
  {
    id: 2,
    title: 'Offers',
    subtitle: 'Special prices this season',
    text: 'Selected taps, showers and geysers at reduced prices.',
    cta: 'See special offers',
    href: '/flash-sale-products',
    image: '/banner2.jpg',
  },
  {
    id: 3,
    title: 'Brands',
    subtitle: 'The names you trust',
    text: 'Browse genuine products brand by brand.',
    cta: 'Explore brands',
    href: '/kids-products',
    image: '/banner3.jpg',
  },
]

const pad = (n: number) => String(n).padStart(2, '0')

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHovered) setCurrent((prev) => (prev + 1) % slides.length)
    }, 6500)
    return () => clearInterval(timer)
  }, [isHovered])

  const next = () => setCurrent((prev) => (prev + 1) % slides.length)
  const prev = () =>
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length)

  const slide = slides[current]

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-surface"
    >
      <div className="grid lg:grid-cols-[42%_58%] lg:h-[calc(100dvh-80px)] lg:min-h-[560px] lg:max-h-[780px]">
        {/* ---------- Image (top on mobile, right on desktop) ---------- */}
        <div className="relative order-1 lg:order-2 h-64 sm:h-80 lg:h-full overflow-hidden bg-secondary-100">
          {slides.map((s, index) => (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {s.image ? (
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className={`object-cover ${index === current ? 'animate-zoomOut' : ''}`}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-200 via-primary-100 to-surface-dark flex items-center justify-center">
                  <Droplets className="w-40 h-40 text-primary/20" strokeWidth={0.8} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ---------- Text panel ---------- */}
        <div className="order-2 lg:order-1 flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8 lg:py-14 gap-10">
          <div className="hidden lg:flex w-[76px] h-[76px] rounded-full border border-primary items-center justify-center text-primary">
            <Droplets className="w-8 h-8" strokeWidth={1.2} />
          </div>

          <div key={slide.id} className="animate-fadeUp">
            <WaveLine className="text-primary mb-5" />
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-semibold uppercase tracking-[0.28em] text-secondary break-words">
              {slide.title}
            </h1>
            <p className="mt-4 text-lg sm:text-xl uppercase tracking-[0.25em] text-secondary/80 font-light">
              {slide.subtitle}
            </p>
            <p className="mt-8 max-w-sm text-xs sm:text-sm uppercase tracking-[0.16em] text-secondary/70 leading-relaxed">
              {slide.text}
            </p>
            <Link
              href={slide.href}
              className="group mt-8 inline-flex items-center gap-3 border border-secondary px-6 py-3 text-xs uppercase tracking-[0.22em] text-secondary hover:bg-secondary hover:text-white transition-colors duration-300"
            >
              {slide.cta}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="text-secondary hover:text-primary hover:-translate-x-0.5 transition"
              >
                <ChevronLeft className="w-7 h-7" strokeWidth={1.3} />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="text-secondary hover:text-primary hover:translate-x-0.5 transition"
              >
                <ChevronRight className="w-7 h-7" strokeWidth={1.3} />
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto lg:ml-4">
              {slides.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-0.5 transition-all duration-500 ${
                    index === current
                      ? 'w-10 bg-primary'
                      : 'w-5 bg-secondary/30 hover:bg-secondary/60'
                  }`}
                />
              ))}
              <span className="ml-3 text-xs tracking-[0.2em] text-secondary/60">
                {pad(current + 1)} / {pad(slides.length)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
