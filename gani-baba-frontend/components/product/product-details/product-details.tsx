'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import Link from 'next/link'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import type { GetProductType } from '@/utils/type'
import { fetchProductById, fetchProducts } from '@/utils/api'
import { useToast } from '@/hooks/use-toast'
import { Minus, Plus, ShieldCheck, Truck, Headphones } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import ProductCard from '../product-card'
import { formatTaka, siteConfig } from '@/utils/constants'

export default function ProductDetails() {
  useInitializeUser()
  const params = useParams()
  const { addToCart, setIsCartOpen } = useCart()
  const { toast } = useToast()
  const id = Number(params.id)
  const [token] = useAtom(tokenAtom)
  const [product, setProduct] = useState<GetProductType | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<GetProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  const getProductbyId = useCallback(async () => {
    const res = await fetchProductById(token, id)

    if (res.error || !res.data) {
      toast({
        title: 'Error',
        description: res.error?.message || 'Failed to get product',
        variant: 'destructive',
      })
    } else {
      setProduct(res.data)
    }
  }, [token, id, toast])

  const getRelatedProducts = useCallback(
    async (current: GetProductType) => {
      const res = await fetchProducts(token)
      if (res.error || !res.data) return

      const filtered = res.data
        .filter(
          (p) =>
            p.productId !== current.productId &&
            (p.categoryId === current.categoryId ||
              p.brandId === current.brandId)
        )
        .slice(0, 5)
      setRelatedProducts(filtered)
    },
    [token]
  )

  useEffect(() => {
    setLoading(true)
    getProductbyId()
  }, [getProductbyId])

  useEffect(() => {
    if (product) {
      getRelatedProducts(product)
      setLoading(false)
    }
  }, [product, getRelatedProducts])

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading product...</p>
      </div>
    )
  }

  const discount = product.discount ?? 0
  const discountedPrice = product.price * (1 - discount / 100)
  const inStock = product.isAvailable !== false

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const image = document.getElementById('zoom-image') as HTMLElement
    if (!image) return
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    image.style.transform = 'scale(1.8)'
    image.style.transformOrigin = `${x}% ${y}%`
  }

  const resetZoom = () => {
    const image = document.getElementById('zoom-image') as HTMLElement
    if (!image) return
    image.style.transform = 'scale(1)'
  }

  const handleAddToCart = () => {
    addToCart(product, quantity)
    toast({
      title: 'Added to Cart',
      description: `${product.name} (Qty: ${quantity}) has been added to your cart.`,
    })
    setQuantity(1)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span>/</span>
          {product.categoryName && (
            <>
              <Link
                href={`/category-products/${product.categoryId}`}
                className="hover:text-primary"
              >
                {product.categoryName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-800 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Product Image */}
          <div className="relative">
            {discount > 0 && (
              <div className="absolute top-4 left-4 text-white bg-primary px-3 py-1 rounded text-sm font-semibold z-10">
                -{discount}%
              </div>
            )}
            <div
              className="overflow-hidden cursor-crosshair rounded-lg border bg-gray-50"
              onMouseMove={handleMouseMove}
              onMouseLeave={resetZoom}
            >
              <Image
                src={product.photoUrl || '/placeholder.svg'}
                alt={product.name}
                className="w-full aspect-square object-contain p-6 transition-transform duration-300 ease-in-out"
                width={1000}
                height={1000}
                id="zoom-image"
                priority
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.brandName && (
                <Link
                  href={`/men-products?brand=${product.brandId}`}
                  className="inline-block text-xs uppercase tracking-wide font-semibold text-primary bg-primary-50 px-2 py-1 rounded mb-3 hover:bg-primary-100"
                >
                  {product.brandName}
                </Link>
              )}
              <h1 className="text-3xl font-bold text-pretty text-secondary">
                {product.name}
              </h1>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                {product.productCode && <p>Product Code: {product.productCode}</p>}
                {product.categoryName && <p>Category: {product.categoryName}</p>}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">
                  {formatTaka(discountedPrice)}
                </span>
                {discount > 0 && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatTaka(product.price)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  You save {formatTaka(product.price - discountedPrice)} (
                  {discount}%)
                </p>
              )}
              <p
                className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}
              >
                {inStock ? 'In Stock' : 'Out of Stock'}
              </p>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 border-2 border-gray-300 rounded px-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="hover:bg-gray-100 transition-colors border-r-2 pr-2 py-1 border-gray-300"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-9 h-9 p-2" />
                </button>
                <span className="text-lg font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="hover:bg-gray-100 transition-colors border-l-2 pl-2 py-1 border-gray-300"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-9 h-9 p-2" />
                </button>
              </div>

              <Button
                className="flex-1 px-8 py-6 text-lg rounded shadow-lg hover:shadow-xl transition-all duration-300 disabled:bg-gray-400 disabled:text-gray-600"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                {inStock ? 'ADD TO CART' : 'Out of Stock'}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full py-6 text-base"
              disabled={!inStock}
              onClick={() => {
                addToCart(product, quantity)
                setIsCartOpen(true)
              }}
            >
              Buy Now
            </Button>

            {/* Trust points */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs text-gray-600">
              <div className="rounded-lg bg-primary-50 p-3">
                <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-primary" />
                Genuine Product
              </div>
              <div className="rounded-lg bg-primary-50 p-3">
                <Truck className="w-5 h-5 mx-auto mb-1 text-primary" />
                Home Delivery
              </div>
              <div className="rounded-lg bg-primary-50 p-3">
                <Headphones className="w-5 h-5 mx-auto mb-1 text-primary" />
                Call {siteConfig.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mb-16 border-b">
          <div className="py-8 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Product Description:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {product.description || 'No description available'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Note:</h3>
              <p className="text-sm">
                Product color and finish may look slightly different because of
                lighting and your device&apos;s screen settings.
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center text-secondary">
              Related Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.productId} product={related} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
