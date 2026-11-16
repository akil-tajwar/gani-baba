'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GetProductType } from '@/utils/type'
import { fetchCategories, fetchProducts } from '@/utils/api'
import CategoryProductsDisplay from '../category-product-display'
import { useParams } from 'next/navigation'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'

// Route: /category-products/[subCategoryId]
// (param name kept from the original structure — here it is the categoryId)
export default function CategoryProduct() {
  useInitializeUser()
  const { subCategoryId } = useParams()
  const categoryId = Number(subCategoryId)
  const [products, setProducts] = useState<GetProductType[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token] = useAtom(tokenAtom)

  const load = useCallback(async () => {
    try {
      const [productRes, categoryRes] = await Promise.all([
        fetchProducts(token),
        fetchCategories(token),
      ])
      const productsData = productRes.data ?? []
      setProducts(productsData.filter((p) => p.categoryId === categoryId))
      setCategoryName(
        categoryRes.data?.find((c) => c.categoryId === categoryId)?.name ?? ''
      )
    } catch (err) {
      console.error(err)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [token, categoryId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <CategoryProductsDisplay
      categoryType={categoryName || 'Products'}
      products={products}
      loading={loading}
      error={error}
    />
  )
}
