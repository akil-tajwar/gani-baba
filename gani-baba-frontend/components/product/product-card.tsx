'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ShoppingCart } from 'lucide-react'
import type { GetProductType } from '@/utils/type'
import { useCart } from '@/hooks/use-cart'
import { useToast } from '@/hooks/use-toast'
import { formatTaka } from '@/utils/constants'

interface ProductCardProps {
  product: GetProductType
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const { toast } = useToast()

  const discount = product.discount ?? 0
  const finalPrice = product.price * (1 - discount / 100)
  const saved = product.price - finalPrice
  const inStock = product.isAvailable !== false

  const handleAdd = () => {
    addToCart(product, 1)
    toast({
      title: 'Added to Cart',
      description: `${product.name} has been added to your cart.`,
    })
  }

  return (
    <article className="group relative h-full flex flex-col bg-white border border-secondary/10 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.25)]">
      {/* Image */}
      <Link
        href={`/product-details/${product.productId}`}
        className="relative block aspect-square overflow-hidden"
      >
        <Image
          height={500}
          width={500}
          src={product.photoUrl || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Discount tag */}
        {discount > 0 && (
          <span className="absolute top-0 left-0 bg-primary text-white text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            -{discount}%
          </span>
        )}

        {/* "View" hint on hover */}
        <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
        </span>

        {!inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/75">
            <span className="bg-secondary px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white">
              Out of stock
            </span>
          </span>
        )}
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4 border-t border-secondary/10 bg-surface/10">
        <div className="flex items-center justify-between gap-2">
          {product.brandName ? (
            <span className="line-clamp-1 text-[11px] uppercase tracking-[0.22em] text-primary">
              {product.brandName}
            </span>
          ) : (
            <span />
          )}
          {product.categoryName && (
            <span className="line-clamp-1 text-[10px] uppercase tracking-[0.15em] text-secondary/40">
              {product.categoryName}
            </span>
          )}
        </div>

        <Link
          href={`/product-details/${product.productId}`}
          className="mt-2 line-clamp-2 min-h-[2.6rem] text-sm md:text-[15px] leading-snug text-secondary transition-colors hover:text-primary"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="mt-auto pt-4 flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-semibold text-secondary leading-tight">
            {formatTaka(finalPrice)}
          </span>
          {discount > 0 && (
            <>
              <span className="text-xs text-secondary/40 line-through">
                {formatTaka(product.price)}
              </span>
              <span className="text-[11px] text-primary">
                Save {formatTaka(saved)}
              </span>
            </>
          )}
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className="group/btn mt-4 flex w-full items-center justify-center gap-2 bg-primary py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition-all duration-300 hover:bg-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          <ShoppingCart
            className="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5"
            strokeWidth={1.6}
          />
          {inStock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </article>
  )
}