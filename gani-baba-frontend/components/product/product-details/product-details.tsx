'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import Link from 'next/link'
import Image from 'next/image'
import {
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Headphones,
  Banknote,
  ShoppingCart,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import type { GetProductType } from '@/utils/type'
import { fetchProductById, fetchProducts } from '@/utils/api'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import ProductCard from '../product-card'
import { formatTaka, siteConfig } from '@/utils/constants'
import { Reveal } from '@/hooks/use-reveal'
import SectionHeading, { WaveLine } from '@/components/shared/section-heading'

type Tab = 'description' | 'delivery'

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
  const [tab, setTab] = useState<Tab>('description')

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
        .slice(0, 4)
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
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-xs uppercase tracking-[0.25em] text-secondary/60">
            Loading product
          </p>
        </div>
      </div>
    )
  }

  const discount = product.discount ?? 0
  const discountedPrice = product.price * (1 - discount / 100)
  const saved = product.price - discountedPrice
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

  const trust = [
    {
      icon: ShieldCheck,
      title: 'Genuine product',
      text: 'Authentic brands only',
    },
    { icon: Truck, title: 'Home delivery', text: 'Across Bangladesh' },
    { icon: Headphones, title: 'Need help?', text: siteConfig.phone },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Breadcrumb bar */}
      <div className="border-b border-secondary/10 bg-white/60">
        <nav className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-secondary/60 md:px-8">
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          {product.categoryName && (
            <>
              <Link
                href={`/category-products/${product.categoryId}`}
                className="transition-colors hover:text-primary"
              >
                {product.categoryName}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="line-clamp-1 text-secondary">{product.name}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-10 md:px-8 md:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* ---------------- Image ---------------- */}
          <Reveal direction="left">
            <div className="lg:sticky lg:top-28">
              <div
                className="relative cursor-crosshair overflow-hidden border border-secondary/10 bg-white"
                onMouseMove={handleMouseMove}
                onMouseLeave={resetZoom}
              >
                {discount > 0 && (
                  <span className="absolute left-0 top-0 z-10 bg-primary px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white">
                    -{discount}% OFF
                  </span>
                )}
                <Image
                  src={product.photoUrl || '/placeholder.svg'}
                  alt={product.name}
                  className="aspect-square w-full object-contain p-8 transition-transform duration-300 ease-in-out md:p-12"
                  width={1000}
                  height={1000}
                  id="zoom-image"
                  priority
                />
              </div>
              <p className="mt-3 hidden text-center text-[11px] uppercase tracking-[0.2em] text-secondary/40 md:block">
                Hover to zoom
              </p>
            </div>
          </Reveal>

          {/* ---------------- Info ---------------- */}
          <Reveal direction="right" delay={100}>
            <div>
              <WaveLine className="mb-4 text-primary" />

              {product.brandName && (
                <Link
                  href={`/men-products?brand=${product.brandId}`}
                  className="text-xs font-medium uppercase tracking-[0.25em] text-primary transition-colors hover:text-secondary"
                >
                  {product.brandName}
                </Link>
              )}

              <h1 className="mt-2 text-2xl font-semibold uppercase leading-snug tracking-[0.1em] text-secondary md:text-3xl">
                {product.name}
              </h1>

              {/* Meta chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.15em]">
                {product.productCode && (
                  <span className="border border-secondary/15 px-3 py-1.5 text-secondary/70">
                    Code: {product.productCode}
                  </span>
                )}
                {product.categoryName && (
                  <Link
                    href={`/category-products/${product.categoryId}`}
                    className="border border-secondary/15 px-3 py-1.5 text-secondary/70 transition-colors hover:border-primary hover:text-primary"
                  >
                    {product.categoryName}
                  </Link>
                )}
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${
                    inStock
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {inStock ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {inStock ? 'In stock' : 'Out of stock'}
                </span>
              </div>

              {/* Price block */}
              <div className="mt-7 border-y border-secondary/10 py-6">
                <div className="flex flex-wrap items-baseline gap-4">
                  <span className="text-4xl font-semibold text-secondary">
                    {formatTaka(discountedPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="text-lg text-secondary/40 line-through">
                      {formatTaka(product.price)}
                    </span>
                  )}
                </div>
                {discount > 0 && (
                  <p className="mt-2 text-sm text-primary">
                    You save {formatTaka(saved)} ({discount}%)
                  </p>
                )}
              </div>

              {/* Quantity + actions */}
              <div className="mt-7 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-secondary/60">
                    Quantity
                  </span>
                  <div className="flex items-center border border-secondary/20 bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex h-11 w-11 items-center justify-center text-secondary transition-colors hover:bg-secondary hover:text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-center text-base font-semibold text-secondary">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-11 w-11 items-center justify-center text-secondary transition-colors hover:bg-secondary hover:text-white"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {quantity > 1 && (
                    <span className="text-sm text-secondary/60">
                      Total{' '}
                      <span className="font-semibold text-secondary">
                        {formatTaka(discountedPrice * quantity)}
                      </span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="group flex items-center justify-center gap-3 bg-primary py-4 text-xs font-medium uppercase tracking-[0.22em] text-white transition-all duration-300 hover:bg-secondary active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <ShoppingCart
                      className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5"
                      strokeWidth={1.6}
                    />
                    {inStock ? 'Add to cart' : 'Out of stock'}
                  </button>

                  <button
                    onClick={() => {
                      addToCart(product, quantity)
                      setIsCartOpen(true)
                    }}
                    disabled={!inStock}
                    className="border border-secondary py-4 text-xs font-medium uppercase tracking-[0.22em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    Buy now
                  </button>
                </div>
              </div>

              {/* Trust points */}
              <div className="mt-8 grid grid-cols-3 divide-x divide-secondary/10 border border-secondary/10 bg-white">
                {trust.map((t) => (
                  <div key={t.title} className="group px-3 py-5 text-center">
                    <t.icon
                      className="mx-auto mb-2 h-6 w-6 text-primary transition-transform duration-300 group-hover:-translate-y-1"
                      strokeWidth={1.3}
                    />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-secondary/60">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* ---------------- Tabs: description / delivery ---------------- */}
        <Reveal className="mt-16 md:mt-24">
          <div className="border border-secondary/10 bg-white">
            <div className="flex border-b border-secondary/10">
              {(
                [
                  ['description', 'Description'],
                  ['delivery', 'Delivery & payment'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] transition-colors md:px-8 ${
                    tab === key
                      ? 'text-primary'
                      : 'text-secondary/60 hover:text-secondary'
                  }`}
                >
                  {label}
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary transition-transform duration-300 ${
                      tab === key ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="p-6 md:p-10">
              {tab === 'description' ? (
                <div className="max-w-3xl space-y-6">
                  <p className="whitespace-pre-line text-sm leading-7 text-secondary/80">
                    {product.description || 'No description available.'}
                  </p>

                  <dl className="grid grid-cols-1 gap-px bg-secondary/10 sm:grid-cols-2">
                    {[
                      ['Brand', product.brandName],
                      ['Category', product.categoryName],
                      ['Product code', product.productCode],
                      ['Availability', inStock ? 'In stock' : 'Out of stock'],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-4 bg-white px-4 py-3 text-sm"
                        >
                          <dt className="text-secondary/50">{k}</dt>
                          <dd className="font-medium text-secondary">{v}</dd>
                        </div>
                      ))}
                  </dl>

                  <p className="text-xs leading-6 text-secondary/50">
                    Note: product color and finish may look slightly different
                    because of lighting and your device&apos;s screen settings.
                  </p>
                </div>
              ) : (
                <div className="grid max-w-3xl gap-8 text-sm leading-7 text-secondary/80 md:grid-cols-2">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-secondary">
                      <Truck
                        className="h-5 w-5 text-primary"
                        strokeWidth={1.3}
                      />
                      <h4 className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Delivery
                      </h4>
                    </div>
                    <p>
                      We deliver across Bangladesh. Our team will call you to
                      confirm your order and the delivery time.
                    </p>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-secondary">
                      <Banknote
                        className="h-5 w-5 text-primary"
                        strokeWidth={1.3}
                      />
                      <h4 className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Payment
                      </h4>
                    </div>
                    <p>
                      Pay with bKash, Nagad or Rocket, or choose Cash on
                      Delivery at checkout.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ---------------- Related products ---------------- */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 md:mt-24">
            <SectionHeading
              title="Related products"
              subtitle="You may also like"
            />
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {relatedProducts.map((related, i) => (
                <Reveal key={related.productId} delay={i * 80}>
                  <ProductCard product={related} />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
