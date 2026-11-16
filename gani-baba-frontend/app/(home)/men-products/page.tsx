import { Suspense } from 'react'
import AllProducts from '@/components/product/men-products/men-products'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllProducts />
    </Suspense>
  )
}
