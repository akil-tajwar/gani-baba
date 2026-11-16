'use client'

// NOTE: route is /flash-sale-products (kept from the original structure).
// In this store it is the "Special Offers" page: every product with a discount.
import { useState, useEffect, useCallback } from 'react'
import type { GetProductType } from '@/utils/type'
import { fetchProducts } from '@/utils/api'
import CategoryProductsDisplay from '../category-product-display'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'

const SpecialOfferProducts = () => {
  useInitializeUser()
  const [products, setProducts] = useState<GetProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token] = useAtom(tokenAtom)

  const getProducts = useCallback(async () => {
    try {
      const res = await fetchProducts(token)
      const productsData = res.data ?? []
      setProducts(productsData.filter((p: GetProductType) => (p.discount ?? 0) > 0))
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

  return (
    <CategoryProductsDisplay
      categoryType="Special Offers"
      products={products}
      loading={loading}
      error={error}
      showCategoryFilter
    />
  )
}

export default SpecialOfferProducts
