// app/page.tsx or components/home/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Bath,
  ShowerHead,
  Droplets,
  Flame,
  Waves,
  Cable,
  Utensils,
  Package,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  Headphones,
  Banknote,
  type LucideIcon,
} from 'lucide-react'
import HeroSlider from './hero-slider'
import ProductCard from '../product/product-card'
import { fetchBrands, fetchCategories, fetchProducts } from '@/utils/api'
import { useToast } from '@/hooks/use-toast'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import type {
  GetProductType,
  GetCategoryType,
  GetBrandType,
} from '@/utils/type'
import { Toaster } from '@/components/ui/toaster'
import { useSearch } from '@/hooks/use-search'
import { useRouter } from 'next/navigation'
import Loader from '@/utils/loader'
import { Reveal } from '@/hooks/use-reveal'
import SectionHeading from '@/components/shared/section-heading'
import { siteConfig } from '@/utils/constants'

// Pick an icon from the category name (falls back to a box)
const features = [
  { icon: ShieldCheck, title: 'Genuine products', text: 'Trusted brands only' },
  { icon: Truck, title: 'Home delivery', text: 'Across Bangladesh' },
  {
    icon: Banknote,
    title: 'Flexible payment',
    text: 'bKash, Nagad, Rocket & COD',
  },
  { icon: Headphones, title: 'Support', text: siteConfig.phone },
]

const iconForCategory = (name: string): LucideIcon => {
  const n = name.toLowerCase()
  if (/commode|toilet|wc|urinal/.test(n)) return Bath
  if (/shower/.test(n)) return ShowerHead
  if (/tap|faucet|mixer|cock/.test(n)) return Droplets
  if (/geyser|heater/.test(n)) return Flame
  if (/pump|purifier|water/.test(n)) return Waves
  if (/pipe|fitting/.test(n)) return Cable
  if (/kitchen|sink|hood|stove/.test(n)) return Utensils
  return Package
}

export default function Home() {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)
  const { toast } = useToast()
  const router = useRouter()
  const { searchQuery, filteredProducts, setAllProducts } = useSearch()

  const [products, setProducts] = useState<GetProductType[]>([])
  const [categories, setCategories] = useState<GetCategoryType[]>([])
  const [brands, setBrands] = useState<GetBrandType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchResultsRef = useRef<HTMLElement | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [catRes, brandRes, prodRes] = await Promise.all([
        fetchCategories(token),
        fetchBrands(token),
        fetchProducts(token),
      ])
      setCategories(catRes.data ?? [])
      setBrands(brandRes.data ?? [])
      const productsData = prodRes.data ?? []
      setProducts(productsData)
      setAllProducts(productsData)
    } catch (err) {
      console.error(err)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [token, setAllProducts])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Scroll to results when search query changes
  useEffect(() => {
    if (searchQuery && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [searchQuery])

  const getProductsByCategory = (categoryId: number) =>
    products.filter((product) => product.categoryId === categoryId)

  const offerProducts = products
    .filter((p) => (p.discount ?? 0) > 0)
    .slice(0, 4)

  if (loading)
    return (
      <div className="text-center mt-10 min-h-[45vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  if (error) return <p className="text-center text-red-500">{error}</p>

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Slider - hidden when searching */}
      {!searchQuery && <HeroSlider />}

      {/* Search Results */}
      {searchQuery && (
        <section
          ref={searchResultsRef}
          className="container mx-auto px-4 md:px-8 pt-12 pb-8 md:pb-12"
        >
          <SectionHeading
            title="Search results"
            subtitle={`"${searchQuery}" — ${filteredProducts.length} items`}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        </section>
      )}

      {!searchQuery && (
        <>
          {/* Feature strip */}
          <section className="border-b">
            <div className="container mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 90}>
                  <div className="group flex items-center gap-4 px-2 py-6 md:py-8 md:border-r last:border-r-0">
                    <f.icon
                      className="w-8 h-8 text-primary shrink-0 transition-transform duration-300 group-hover:-translate-y-1"
                      strokeWidth={1.2}
                    />
                    <div>
                      <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] font-semibold text-secondary">
                        {f.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <main className="container mx-auto px-4 md:px-8 pt-16 md:pt-24">
            {/* Shop by category */}
            {categories.length > 0 && (
              <section className="mb-20 md:mb-28">
                <SectionHeading
                  title="Shop by category"
                  subtitle="Everything for your bathroom & kitchen"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {categories.map((category, index) => {
                    const Icon = iconForCategory(category.name)
                    return (
                      <Reveal
                        key={category.categoryId}
                        delay={(index % 4) * 90}
                      >
                        <Link
                          href={`/category-products/${category.categoryId}`}
                          className="group relative flex flex-col justify-between h-40 md:h-48 overflow-hidden bg-primary/20 p-5 md:p-6 transition-colors duration-500 hover:bg-primary"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs tracking-[0.25em] text-secondary/50 group-hover:text-white/80 transition-colors">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <Icon
                              className="w-9 h-9 text-primary group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6"
                              strokeWidth={1.1}
                            />
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <span className="text-sm md:text-base uppercase tracking-[0.18em] font-medium text-secondary group-hover:text-white transition-colors">
                              {category.name}
                            </span>
                            <ArrowUpRight className="w-5 h-5 shrink-0 text-secondary/40 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:text-white transition-all duration-500" />
                          </div>
                          <span className="absolute left-0 bottom-0 h-0.5 w-0 bg-secondary group-hover:w-full transition-all duration-500" />
                        </Link>
                      </Reveal>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Special offers */}
            {offerProducts.length > 0 && (
              <section className="mb-20 md:mb-28">
                <SectionHeading
                  title="Special offers"
                  subtitle="Limited-time prices"
                  href="/flash-sale-products"
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
                  {offerProducts.map((product, i) => (
                    <Reveal key={product.productId} delay={i * 90}>
                      <ProductCard product={product} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Top brands — full-width beige band */}
          {brands.length > 0 && (
            <section className="bg-primary/20 py-16 md:py-24 mb-20 md:mb-28">
              <div className="container mx-auto px-4 md:px-8">
                <SectionHeading
                  title="Top brands"
                  subtitle="Shop by the names you trust"
                  href="/kids-products"
                  linkLabel="All brands"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-secondary/10 border border-secondary/10">
                  {brands.slice(0, 12).map((brand, i) => (
                    <Reveal
                      key={brand.brandId}
                      delay={(i % 6) * 70}
                      direction="none"
                    >
                      <Link
                        href={`/products?brand=${brand.brandId}`}
                        className="group relative flex items-center justify-center h-24 md:h-28 bg-surface px-3 text-center text-sm uppercase tracking-[0.18em] font-medium text-secondary transition-colors duration-300 hover:bg-white hover:text-primary"
                      >
                        {brand.name}
                        <span className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-primary group-hover:w-2/3 transition-all duration-500" />
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          )}

          <main className="container mx-auto px-4 md:px-8">
            {/* One product row per category */}
            {categories.map((category) => {
              const categoryProducts = getProductsByCategory(
                category.categoryId!
              )
              if (categoryProducts.length === 0) return null

              const displayed = categoryProducts.slice(0, 4)
              const hasMore = categoryProducts.length > 4

              return (
                <section key={category.categoryId} className="mb-20 md:mb-24">
                  <SectionHeading
                    title={category.name}
                    href={
                      hasMore
                        ? `/category-products/${category.categoryId}`
                        : undefined
                    }
                  />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
                    {displayed.map((product, i) => (
                      <Reveal key={product.productId} delay={i * 90}>
                        <ProductCard product={product} />
                      </Reveal>
                    ))}
                  </div>
                </section>
              )
            })}

            {products.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 uppercase tracking-[0.2em] text-sm">
                  No products available at the moment.
                </p>
              </div>
            )}
          </main>
        </>
      )}

      <Toaster />
    </div>
  )
}
