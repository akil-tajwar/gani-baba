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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-secondary text-white py-10 md:py-14">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-wide">
            All Brands
          </h1>
          <p className="mt-2 text-primary-100 text-sm md:text-base">
            {brands.length} trusted brands
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {brands.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No brands yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.brandId}
                href={`/men-products?brand=${brand.brandId}`}
                className="group bg-white border rounded-lg p-6 text-center hover:border-primary hover:shadow-md transition"
              >
                <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary-50 text-primary flex items-center justify-center text-xl font-bold group-hover:bg-primary group-hover:text-white transition">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-secondary line-clamp-1">
                  {brand.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {countFor(brand.brandId)} products
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
