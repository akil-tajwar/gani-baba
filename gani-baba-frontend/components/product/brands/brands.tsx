'use client'

// NOTE: route is /kids-products (kept from the original structure).
// In this store it is the "All Brands" page. Clicking a brand opens
// /men-products?brand=<id> (the filterable product list).
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { fetchBrands, fetchProducts } from '@/utils/api'
import type { GetBrandType, GetProductType } from '@/utils/type'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import Loader from '@/utils/loader'
import { WaveLine } from '@/components/shared/section-heading'
import { Reveal } from '@/hooks/use-reveal'

export default function AllBrands() {
  useInitializeUser()
  const [brands, setBrands] = useState<GetBrandType[]>([])
  const [products, setProducts] = useState<GetProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token] = useAtom(tokenAtom)

  const load = useCallback(async () => {
    try {
      const [brandRes, productRes] = await Promise.all([
        fetchBrands(token),
        fetchProducts(token),
      ])
      setBrands(brandRes.data ?? [])
      setProducts(productRes.data ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load brands')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const countFor = (brandId?: number) =>
    products.filter((p) => p.brandId === brandId).length

  if (loading)
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  if (error) return <p className="text-center text-red-500 py-16">{error}</p>

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-surface">
        <div className="container mx-auto px-4 md:px-8 py-12 md:py-16 animate-fadeUp">
          <WaveLine className="text-primary mb-4" />
          <h1 className="text-3xl md:text-5xl font-semibold uppercase tracking-[0.25em] text-secondary">
            All Brands
          </h1>
          <p className="mt-3 text-xs md:text-sm uppercase tracking-[0.22em] text-secondary/60">
            {brands.length} trusted brands
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        {brands.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No brands yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {brands.map((brand, i) => (
              <Reveal key={brand.brandId} delay={(i % 5) * 70}>
                <Link
                  href={`/men-products?brand=${brand.brandId}`}
                  className="group relative block bg-surface px-4 py-9 text-center transition-colors duration-500 hover:bg-secondary"
                >
                  <p className="text-sm uppercase tracking-[0.2em] font-medium text-secondary group-hover:text-white transition-colors line-clamp-1">
                    {brand.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-secondary/50 group-hover:text-white/60 mt-2 transition-colors">
                    {countFor(brand.brandId)} products
                  </p>
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full transition-all duration-500" />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
