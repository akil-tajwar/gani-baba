import { Suspense } from 'react'
import AllBrands from '@/components/product/kids-products/kids-products'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllBrands />
    </Suspense>
  )
}
