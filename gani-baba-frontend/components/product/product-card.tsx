'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
import type { GetProductType } from '@/utils/type'
import Link from 'next/link'
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
  const inStock = product.isAvailable !== false

  const handleAdd = () => {
    addToCart(product, 1)
    toast({
      title: 'Added to Cart',
      description: `${product.name} has been added to your cart.`,
    })
  }

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
      {/* Image */}
      <Link
        href={`/product-details/${product.productId}`}
        className="aspect-square relative overflow-hidden bg-gray-50 block"
      >
        <Image
          height={400}
          width={400}
          src={product.photoUrl || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-secondary text-white text-xs font-semibold px-3 py-1 rounded">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {product.brandName && (
          <p className="text-[11px] uppercase tracking-wide font-semibold text-primary mb-1 line-clamp-1">
            {product.brandName}
          </p>
        )}
        <Link
          href={`/product-details/${product.productId}`}
          className="font-semibold text-gray-900 hover:text-primary line-clamp-2 text-sm md:text-base"
        >
          {product.name}
        </Link>
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
          {product.categoryName}
        </p>

        <div className="flex items-baseline gap-2 mt-auto pt-3 mb-3">
          <span className="text-lg font-bold text-secondary">
            {formatTaka(finalPrice)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">
              {formatTaka(product.price)}
            </span>
          )}
        </div>

        <Button
          disabled={!inStock}
          onClick={handleAdd}
          className="w-full gap-2 font-semibold disabled:bg-gray-300 disabled:text-gray-500"
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </Button>
      </div>
    </div>
  )
}
