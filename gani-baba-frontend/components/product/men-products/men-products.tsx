'use client'

// NOTE: route is /men-products (kept from the original structure).
// In this store it is the "All Products" page, filterable by brand & category:
//   /men-products?brand=3        → only brand #3 preselected
//   /men-products?category=2     → only category #2 preselected
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { GetProductType } from '@/utils/type'
import { fetchProducts } from '@/utils/api'
import CategoryProductsDisplay from '../category-product-display'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'

export default function AllProducts() {
  useInitializeUser()
  const searchParams = useSearchParams()
  const brandParam = searchParams.get('brand')
  const categoryParam = searchParams.get('category')

  const [products, setProducts] = useState<GetProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token] = useAtom(tokenAtom)

  const getProducts = useCallback(async () => {
    try {
      const res = await fetchProducts(token)
      setProducts(res.data ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    getProducts()
  }, [getProducts])

  const brandId = brandParam ? Number(brandParam) : null
  const brandName = brandId
    ? products.find((p) => p.brandId === brandId)?.brandName
    : undefined

  return (
    <CategoryProductsDisplay
      categoryType={brandName ? brandName : 'All Products'}
      products={products}
      loading={loading}
      error={error}
      showCategoryFilter
      initialBrandId={brandId}
      initialCategoryId={categoryParam ? Number(categoryParam) : null}
    />
  )
}
