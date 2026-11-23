import { Suspense } from 'react'
import AllProducts from '@/components/product/products/products'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllProducts />
    </Suspense>
  )
}
