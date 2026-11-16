'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Hero slides. Colors come from the theme (primary / secondary), so no
 * image is required. To use a banner photo, put the file in /public and set
 * `image: '/your-banner.jpg'` on a slide.
 */
const slides: {
  id: number
  eyebrow: string
  title: string
  text: string
  cta: string
  href: string
  image?: string
}[] = [
  {
    id: 1,
    eyebrow: 'Bathroom Essentials',
    title: 'Premium Commodes & Basins',
    text: 'Modern designs from trusted brands, delivered to your door.',
    cta: 'Shop Now',
    href: '/men-products',
  },
  {
    id: 2,
    eyebrow: 'Special Offers',
    title: 'Great Prices on Taps & Showers',
    text: 'Limited-time discounts on selected products.',
    cta: 'See Offers',
    href: '/flash-sale-products',
  },
  {
    id: 3,
    eyebrow: 'Shop by Brand',
    title: 'Geysers, Pumps & Pipe Fittings',
    text: 'Genuine products from the brands you already trust.',
    cta: 'Browse Brands',
    href: '/kids-products',
  },
]

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHovered) {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [isHovered])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-[42vh] md:h-[56vh] overflow-hidden bg-secondary">
        {/* Track */}
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="w-full h-full flex-shrink-0 relative bg-gradient-to-r from-secondary via-secondary-700 to-primary"
              style={{ minWidth: '100%' }}
            >
              {slide.image && (
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover opacity-40"
                />
              )}
              <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-center text-white">
                <span className="text-xs md:text-sm uppercase tracking-[0.25em] text-primary-200 mb-3">
                  {slide.eyebrow}
                </span>
                <h2 className="text-3xl md:text-6xl font-extrabold max-w-2xl leading-tight">
                  {slide.title}
                </h2>
                <p className="mt-3 md:mt-5 text-primary-100 max-w-lg text-sm md:text-lg">
                  {slide.text}
                </p>
                <Link
                  href={slide.href}
                  className="mt-6 inline-block w-fit bg-white text-primary font-semibold px-6 py-3 rounded hover:bg-primary-100 transition"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={prevSlide}
          aria-label="Previous slide"
          className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-500 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
          }`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Next slide"
          className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-500 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-5'
          }`}
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
