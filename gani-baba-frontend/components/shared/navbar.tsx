'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search,
  User,
  ShoppingCart,
  X,
  ChevronDown,
  Menu,
  Phone,
  LayoutGrid,
} from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchBrands, fetchCategories } from '@/utils/api'
import { useAtom } from 'jotai'
import { tokenAtom } from '@/utils/user'
import type { GetBrandType, GetCategoryType } from '@/utils/type'
import { useCart } from '@/hooks/use-cart'
import { siteConfig } from '@/utils/constants'

interface NavbarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredProducts: any[]
  isLoggedIn: boolean
  currentUser: string
  setIsLoginOpen: (open: boolean) => void
  setIsRegisterOpen: (open: boolean) => void
  handleLogout: () => void
  setIsCartOpen: (open: boolean) => void
  getTotalItems: () => number
  roleId: number | null
  onCategoryClick: (categoryId: number) => void
  onProductClick: (productId: number) => void
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'All Products', href: '/men-products' },
  { label: 'Brands', href: '/kids-products' },
  { label: 'Special Offers', href: '/flash-sale-products' },
]

export default function Navbar({
  searchQuery,
  setSearchQuery,
  filteredProducts,
  isLoggedIn,
  currentUser,
  setIsLoginOpen,
  setIsRegisterOpen,
  handleLogout,
  setIsCartOpen,
  roleId,
  onCategoryClick,
}: NavbarProps) {
  const [categories, setCategories] = useState<GetCategoryType[]>([])
  const [brands, setBrands] = useState<GetBrandType[]>([])
  const [token] = useAtom(tokenAtom)

  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const { cartItems, getTotalItems } = useCart()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetchCategories(token),
          fetchBrands(token),
        ])
        if (catRes?.data) setCategories(catRes.data)
        if (brandRes?.data) setBrands(brandRes.data)
      } catch (err) {
        console.error('Failed loading data', err)
      }
    }
    loadData()
  }, [token])

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isSidebarOpen])

  const goToCategory = (categoryId: number) => {
    setIsSidebarOpen(false)
    setShowCategoryMenu(false)
    onCategoryClick(categoryId)
    router.push(`/category-products/${categoryId}`)
  }

  const handleCloseSearch = () => {
    setShowSearchOverlay(false)
    setSearchQuery('')
  }

  const shouldHideSearch =
    pathname.includes('product-details') ||
    pathname.includes('thank-you') ||
    pathname.includes('checkout')

  const cartCount = getTotalItems()

  return (
    <>
      {!showSearchOverlay && (
        <header className="sticky top-0 z-40 shadow-sm">
          {/* Top strip */}
          <div className="bg-secondary text-white text-xs hidden sm:block">
            <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
              <p className="text-primary-100">{siteConfig.tagline}</p>
              <a
                href={`tel:${siteConfig.phone}`}
                className="flex items-center gap-1.5 hover:text-primary-200"
              >
                <Phone className="w-3 h-3" />
                {siteConfig.phone}
              </a>
            </div>
          </div>

          {/* Main row */}
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-3 flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-gray-700 hover:text-primary"
                aria-label="Menu"
              >
                <Menu className="w-7 h-7" />
              </button>

              {/* Logo (text wordmark — swap for <Image src="/logo.png" /> if you have one) */}
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <span className="w-9 h-9 rounded-lg bg-primary text-white font-extrabold flex items-center justify-center">
                  {siteConfig.name.charAt(0)}
                </span>
                <span className="text-xl font-extrabold text-secondary leading-none">
                  {siteConfig.name}
                </span>
              </Link>

              {/* Search (desktop) */}
              {!shouldHideSearch && (
                <button
                  onClick={() => setShowSearchOverlay(true)}
                  className="hidden md:flex flex-1 max-w-xl mx-auto items-center justify-between border rounded-full px-4 py-2 text-sm text-gray-400 hover:border-primary transition"
                >
                  I am shopping for…
                  <Search className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center gap-4 ml-auto md:ml-0">
                {!shouldHideSearch && (
                  <button
                    onClick={() => setShowSearchOverlay(true)}
                    className="md:hidden text-gray-600 hover:text-primary"
                    aria-label="Search"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                )}

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="text-gray-600 hover:text-primary relative"
                  aria-label="Shopping cart"
                >
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 text-xs bg-primary rounded-full min-w-5 h-5 px-1 flex items-center justify-center text-white">
                      {cartCount}
                    </span>
                  )}
                  <ShoppingCart className="w-6 h-6" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger className="text-gray-600 hover:text-primary outline-none">
                    <User className="w-6 h-6" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-2 bg-white border rounded-lg shadow-lg">
                    {!isLoggedIn ? (
                      <>
                        <DropdownMenuItem onClick={() => setIsLoginOpen(true)}>
                          Login
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsRegisterOpen(true)}>
                          Register
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem disabled>Hi, {currentUser}</DropdownMenuItem>
                        {roleId === 1 && (
                          <DropdownMenuItem
                            onClick={() => router.push('/dashboard/categories')}
                          >
                            Admin Dashboard
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                          Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="text-red-600"
                        >
                          Logout
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Nav bar (desktop) */}
          <nav className="bg-primary text-white hidden lg:block">
            <div className="container mx-auto px-4 flex items-center gap-8 relative">
              <div
                className="relative"
                onMouseEnter={() => setShowCategoryMenu(true)}
                onMouseLeave={() => setShowCategoryMenu(false)}
              >
                <button className="flex items-center gap-2 bg-primary-700 px-5 py-3 font-semibold">
                  <LayoutGrid className="w-4 h-4" />
                  All Categories
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showCategoryMenu && (
                  <div className="absolute left-0 top-full w-72 bg-white text-gray-700 border shadow-lg rounded-b-lg animate-slideDown z-50 max-h-[70vh] overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">
                        No categories yet
                      </p>
                    ) : (
                      categories.map((cat) => (
                        <button
                          key={cat.categoryId}
                          onClick={() => goToCategory(cat.categoryId!)}
                          className="w-full text-left px-5 py-2.5 text-sm hover:bg-primary-50 hover:text-primary border-b last:border-b-0"
                        >
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-3 text-sm font-medium hover:text-primary-200 ${
                    pathname === link.href ? 'border-b-2 border-white' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
      )}

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 bg-secondary text-white">
          <h2 className="text-lg font-semibold">{siteConfig.name}</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <ul className="mb-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="block px-3 py-3 font-medium text-gray-700 hover:text-primary border-b"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="text-xs font-semibold uppercase tracking-wide text-primary px-3 mb-2">
            Categories
          </h3>
          <ul>
            {categories.map((cat) => (
              <li key={cat.categoryId}>
                <button
                  onClick={() => goToCategory(cat.categoryId!)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-primary-50 rounded"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>

          {brands.length > 0 && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-primary px-3 mt-5 mb-2">
                Brands
              </h3>
              <ul>
                {brands.map((brand) => (
                  <li key={brand.brandId}>
                    <Link
                      href={`/men-products?brand=${brand.brandId}`}
                      onClick={() => setIsSidebarOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-primary-50 rounded"
                    >
                      {brand.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* FULLSCREEN SEARCH OVERLAY */}
      {showSearchOverlay && (
        <div className="fixed inset-0 bg-white z-50 h-fit animate-slideDownFast p-6 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">
              Search Products{' '}
              {searchQuery && <span>(Found {filteredProducts.length})</span>}
            </h2>
            <button onClick={handleCloseSearch} aria-label="Close search">
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <Input
            autoFocus
            type="text"
            placeholder="Search by product, category or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 p-4 text-lg rounded-lg"
          />
        </div>
      )}
    </>
  )
}
