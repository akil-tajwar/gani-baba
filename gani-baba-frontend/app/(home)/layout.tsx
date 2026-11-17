import '.././globals.css'
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { ReactQueryProvider } from '@/provider/react-query-provider'
import Footer from '@/components/shared/footer'
import LayoutClientWrapper from './layout-client-wrapper'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Gani Baba',
  description:
    'Commodes, basins, taps, showers, geysers, pumps and pipe fittings from trusted brands.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ReactQueryProvider>
          <LayoutClientWrapper>
            <main className="min-h-[60vh]">{children}</main>
            <Toaster />
            <Footer />
          </LayoutClientWrapper>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
