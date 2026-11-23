import { Suspense } from 'react'
import AllBrands from '@/components/product/brands/brands'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllBrands />
    </Suspense>
  )
}
