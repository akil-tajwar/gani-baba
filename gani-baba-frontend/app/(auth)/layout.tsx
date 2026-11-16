import '.././globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex items-center justify-center min-h-max">
          <div className="p-8 bg-white rounded">{children}</div>
          <Toaster />
        </div>
      </body>
    </html>
  )
}
