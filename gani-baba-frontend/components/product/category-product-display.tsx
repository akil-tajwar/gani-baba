'use client'

import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { GetProductType } from '@/utils/type'
import ProductCard from './product-card'
import { formatTaka } from '@/utils/constants'

interface CategoryProductsDisplayProps {
  /** Page title shown in the banner (e.g. "Commode", "All Products") */
  categoryType: string
  products: GetProductType[]
  loading?: boolean
  error?: string
  /** Pre-select a brand in the filter (used by /men-products?brand=ID) */
  initialBrandId?: number | null
  /** Show a category filter too (used on the all-products page) */
  showCategoryFilter?: boolean
  initialCategoryId?: number | null
}

type SortKey = 'latest' | 'price-asc' | 'price-desc' | 'name'

const finalPrice = (p: GetProductType) =>
  p.price * (1 - (p.discount ?? 0) / 100)

export default function CategoryProductsDisplay({
  categoryType,
  products,
  loading = false,
  error,
  initialBrandId = null,
  showCategoryFilter = false,
  initialCategoryId = null,
}: CategoryProductsDisplayProps) {
  const [selectedBrands, setSelectedBrands] = useState<number[]>(
    initialBrandId ? [initialBrandId] : []
  )
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialCategoryId ? [initialCategoryId] : []
  )
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('latest')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // keep in sync if the URL query changes
  useEffect(() => {
    setSelectedBrands(initialBrandId ? [initialBrandId] : [])
  }, [initialBrandId])
  useEffect(() => {
    setSelectedCategories(initialCategoryId ? [initialCategoryId] : [])
  }, [initialCategoryId])

  // Brands / categories that actually exist in this product list
  const brandOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number }>()
    products.forEach((p) => {
      const cur = map.get(p.brandId)
      if (cur) cur.count += 1
      else map.set(p.brandId, { id: p.brandId, name: p.brandName ?? 'Brand', count: 1 })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const categoryOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number }>()
    products.forEach((p) => {
      const cur = map.get(p.categoryId)
      if (cur) cur.count += 1
      else map.set(p.categoryId, { id: p.categoryId, name: p.categoryName ?? 'Category', count: 1 })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const visibleProducts = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null
    const max = maxPrice ? Number(maxPrice) : null

    const list = products.filter((p) => {
      if (selectedBrands.length && !selectedBrands.includes(p.brandId)) return false
      if (selectedCategories.length && !selectedCategories.includes(p.categoryId))
        return false
      if (inStockOnly && p.isAvailable === false) return false
      const price = finalPrice(p)
      if (min !== null && price < min) return false
      if (max !== null && price > max) return false
      return true
    })

    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => finalPrice(a) - finalPrice(b))
    if (sort === 'price-desc') sorted.sort((a, b) => finalPrice(b) - finalPrice(a))
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'latest')
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      )
    return sorted
  }, [products, selectedBrands, selectedCategories, inStockOnly, minPrice, maxPrice, sort])

  const toggle = (list: number[], setList: (v: number[]) => void, id: number) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const clearFilters = () => {
    setSelectedBrands([])
    setSelectedCategories([])
    setMinPrice('')
    setMaxPrice('')
    setInStockOnly(false)
  }

  const hasFilters =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    inStockOnly

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    )
  }

  const FilterPanel = (
    <aside className="space-y-6">
      {showCategoryFilter && categoryOptions.length > 0 && (
        <div>
          <h3 className="font-semibold text-secondary mb-3">Category</h3>
          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {categoryOptions.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={selectedCategories.includes(c.id)}
                    onChange={() =>
                      toggle(selectedCategories, setSelectedCategories, c.id)
                    }
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-secondary mb-3">Brand</h3>
        {brandOptions.length === 0 ? (
          <p className="text-sm text-gray-400">No brands</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {brandOptions.map((b) => (
              <li key={b.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={selectedBrands.includes(b.id)}
                    onChange={() => toggle(selectedBrands, setSelectedBrands, b.id)}
                  />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs text-gray-400">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-secondary mb-3">Price (৳)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          className="accent-primary w-4 h-4"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
        />
        In stock only
      </label>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-secondary text-white py-10 md:py-14">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-wide">
            {categoryType}
          </h1>
          <p className="mt-2 text-primary-100 text-sm md:text-base">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters — desktop */}
          <div className="hidden lg:block w-64 shrink-0 bg-white border rounded-lg p-5 h-fit">
            {FilterPanel}
          </div>

          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="lg:hidden flex items-center gap-2 text-sm font-medium border rounded px-3 py-2 bg-white"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
              <p className="text-sm text-gray-600 hidden sm:block">
                Showing {visibleProducts.length} of {products.length}
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="latest">Latest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </div>

            {/* Filters — mobile */}
            {filtersOpen && (
              <div className="lg:hidden bg-white border rounded-lg p-4 mb-5">
                {FilterPanel}
              </div>
            )}

            {visibleProducts.length === 0 ? (
              <div className="text-center py-16 bg-white border rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No Products Found
                </h3>
                <p className="text-gray-500">
                  {hasFilters
                    ? `Nothing matches your filters${maxPrice ? ` (up to ${formatTaka(Number(maxPrice))})` : ''}.`
                    : "We couldn't find any products here yet."}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-primary hover:underline text-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.productId} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
