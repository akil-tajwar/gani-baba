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
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// Pick an icon from the category name (falls back to a box)
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

  const offerProducts = products.filter((p) => (p.discount ?? 0) > 0).slice(0, 4)

  if (loading)
    return (
      <div className="text-center mt-10 min-h-[45vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  if (error) return <p className="text-center text-red-500">{error}</p>

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Slider - hidden when searching */}
      {!searchQuery && <HeroSlider />}

      {/* Search Results */}
      {searchQuery && (
        <section
          ref={searchResultsRef}
          className="container mx-auto px-4 pt-10 pb-8 md:pb-12"
        >
          <h2 className="text-2xl font-bold text-secondary mb-6">
            Search Results for &quot;{searchQuery}&quot; (
            {filteredProducts.length} items)
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        </section>
      )}

      {!searchQuery && (
        <main className="container mx-auto px-4 pt-10 md:pt-14">
          {/* Shop by category */}
          {categories.length > 0 && (
            <section className="mb-12 md:mb-16">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-secondary">
                  Shop by Category
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((category) => {
                  const Icon = iconForCategory(category.name)
                  return (
                    <Link
                      key={category.categoryId}
                      href={`/category-products/${category.categoryId}`}
                      className="group flex flex-col items-center text-center bg-primary-50 hover:bg-primary rounded-xl px-3 py-6 transition"
                    >
                      <Icon className="w-9 h-9 text-primary group-hover:text-white transition" />
                      <span className="mt-3 text-sm font-semibold text-secondary group-hover:text-white transition">
                        {category.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Special offers */}
          {offerProducts.length > 0 && (
            <section className="mb-12 md:mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-secondary">
                  Special Offers
                </h2>
                <Button
                  variant="outline"
                  className="text-sm px-4 py-2"
                  onClick={() => router.push('/flash-sale-products')}
                >
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {offerProducts.map((product) => (
                  <ProductCard key={product.productId} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* Top brands */}
          {brands.length > 0 && (
            <section className="mb-12 md:mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-secondary">
                  Top Brands
                </h2>
                <Button
                  variant="outline"
                  className="text-sm px-4 py-2"
                  onClick={() => router.push('/kids-products')}
                >
                  View All Brands
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {brands.slice(0, 12).map((brand) => (
                  <Link
                    key={brand.brandId}
                    href={`/men-products?brand=${brand.brandId}`}
                    className="border rounded-lg py-6 px-3 text-center font-semibold text-secondary hover:border-primary hover:text-primary hover:shadow-md transition"
                  >
                    {brand.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* One product row per category */}
          {categories.map((category) => {
            const categoryProducts = getProductsByCategory(category.categoryId!)
            if (categoryProducts.length === 0) return null

            const displayed = categoryProducts.slice(0, 4)
            const hasMore = categoryProducts.length > 4

            return (
              <section key={category.categoryId} className="mb-12 md:mb-14">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl md:text-2xl font-semibold text-secondary">
                    {category.name}
                  </h3>
                  {hasMore && (
                    <Button
                      variant="outline"
                      className="text-sm px-4 py-2"
                      onClick={() =>
                        router.push(`/category-products/${category.categoryId}`)
                      }
                    >
                      View All
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {displayed.map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>
              </section>
            )
          })}

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No products available at the moment.
              </p>
            </div>
          )}
        </main>
      )}

      <Toaster />
    </div>
  )
}
