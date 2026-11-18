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
  ArrowRight,
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
import Image from 'next/image'

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
  { label: 'Products', href: '/men-products' },
  { label: 'Brands', href: '/kids-products' },
  { label: 'Offers', href: '/flash-sale-products' },
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
  const [scrolled, setScrolled] = useState(false)

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

  // Slightly shrink the header + add a shadow once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const linkClass = (href: string) =>
    `relative py-2 text-[13px] uppercase tracking-[0.18em] transition-colors hover:text-white after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:bg-primary-300 after:transition-transform after:duration-300 ${
      pathname === href
        ? 'text-white after:scale-x-100'
        : 'text-white/75 after:scale-x-0 hover:after:scale-x-100'
    }`

  return (
    <>
      {!showSearchOverlay && (
        <header
          className={`sticky top-0 z-40 bg-secondary text-white transition-all duration-300 ${
            scrolled ? 'shadow-lg shadow-black/20' : ''
          }`}
        >
          <div
            className={`container mx-auto px-4 md:px-8 flex items-center gap-6 transition-all duration-300 ${
              scrolled ? 'h-16' : 'h-20'
            }`}
          >
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-white/90 hover:text-white"
              aria-label="Menu"
            >
              <Menu className="w-7 h-7" strokeWidth={1.4} />
            </button>

            {/* Logo (text wordmark — swap for <Image src="/logo.png" /> if you have one) */}
            <Link
              href="/"
              className="text-xl md:text-2xl font-light uppercase tracking-[0.35em] text-surface shrink-0"
            >
              {/* {siteConfig.name} */}
              <Image
                height={50}
                width={50}
                src={'/logo3.png'}
                alt={'gani baba logo'}
                className="w-"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-9 mx-auto">
              <Link href="/" className={linkClass('/')}>
                Home
              </Link>

              {/* Categories mega menu */}
              <div
                className="relative"
                onMouseEnter={() => setShowCategoryMenu(true)}
                onMouseLeave={() => setShowCategoryMenu(false)}
              >
                <button
                  className={`${linkClass('/category')} flex items-center gap-1 ${
                    pathname.startsWith('/category-products')
                      ? 'text-white after:scale-x-100'
                      : ''
                  }`}
                >
                  Categories
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      showCategoryMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showCategoryMenu && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-5 z-50">
                    <div className="w-[min(780px,90vw)] bg-white text-secondary shadow-2xl animate-slideDown grid grid-cols-[1.4fr_1fr]">
                      <div className="p-7">
                        <h4 className="text-[11px] uppercase tracking-[0.25em] text-primary mb-4">
                          Shop by category
                        </h4>
                        {categories.length === 0 ? (
                          <p className="text-sm text-gray-400">
                            No categories yet
                          </p>
                        ) : (
                          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 max-h-72 overflow-y-auto pr-2">
                            {categories.map((cat) => (
                              <li key={cat.categoryId}>
                                <button
                                  onClick={() => goToCategory(cat.categoryId!)}
                                  className="group w-full flex items-center justify-between py-2 text-sm text-left text-secondary/80 hover:text-primary transition-colors"
                                >
                                  {cat.name}
                                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="bg-surface p-7">
                        <h4 className="text-[11px] uppercase tracking-[0.25em] text-primary mb-4">
                          Top brands
                        </h4>
                        <ul className="space-y-1 max-h-72 overflow-y-auto">
                          {brands.slice(0, 8).map((brand) => (
                            <li key={brand.brandId}>
                              <Link
                                href={`/men-products?brand=${brand.brandId}`}
                                onClick={() => setShowCategoryMenu(false)}
                                className="block py-2 text-sm text-secondary/80 hover:text-primary hover:translate-x-1 transition-all"
                              >
                                {brand.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/kids-products"
                          onClick={() => setShowCategoryMenu(false)}
                          className="mt-4 inline-block text-[11px] uppercase tracking-[0.22em] text-secondary border-b border-secondary hover:text-primary hover:border-primary transition-colors"
                        >
                          All brands
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(link.href)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: search / cart / user */}
            <div className="flex items-center gap-5 ml-auto lg:ml-0">
              {!shouldHideSearch && (
                <button
                  onClick={() => setShowSearchOverlay(true)}
                  aria-label="Search"
                  className="group hidden md:flex items-center gap-3 w-44 border-b border-white/30 pb-1 text-white/60 hover:border-primary-300 hover:text-white transition-colors"
                >
                  <Search className="w-4 h-4 text-primary-300" />
                  <span className="text-xs tracking-[0.15em] uppercase">
                    Search
                  </span>
                </button>
              )}
              {!shouldHideSearch && (
                <button
                  onClick={() => setShowSearchOverlay(true)}
                  className="md:hidden text-white/90 hover:text-white"
                  aria-label="Search"
                >
                  <Search className="w-6 h-6" strokeWidth={1.5} />
                </button>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative text-white/90 hover:text-white hover:scale-110 transition"
                aria-label="Shopping cart"
              >
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2.5 text-[10px] bg-primary rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-white">
                    {cartCount}
                  </span>
                )}
                <ShoppingCart className="w-6 h-6" strokeWidth={1.5} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="text-white/90 hover:text-white hover:scale-110 transition outline-none">
                  <User className="w-6 h-6" strokeWidth={1.5} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-2 bg-white border rounded-none shadow-xl">
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
                      <DropdownMenuItem disabled>
                        Hi, {currentUser}
                      </DropdownMenuItem>
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
        <div className="flex items-center justify-between p-5 bg-secondary text-white">
          <h2 className="text-lg font-light uppercase tracking-[0.3em]">
            {siteConfig.name}
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" strokeWidth={1.4} />
          </button>
        </div>

        <div className="p-4">
          <ul className="mb-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="block px-3 py-3 text-sm uppercase tracking-[0.18em] text-secondary hover:text-primary border-b"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="text-[11px] uppercase tracking-[0.25em] text-primary px-3 mb-2">
            Categories
          </h3>
          <ul>
            {categories.map((cat) => (
              <li key={cat.categoryId}>
                <button
                  onClick={() => goToCategory(cat.categoryId!)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-surface"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>

          {brands.length > 0 && (
            <>
              <h3 className="text-[11px] uppercase tracking-[0.25em] text-primary px-3 mt-5 mb-2">
                Brands
              </h3>
              <ul>
                {brands.map((brand) => (
                  <li key={brand.brandId}>
                    <Link
                      href={`/men-products?brand=${brand.brandId}`}
                      onClick={() => setIsSidebarOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-surface"
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
        <div className="fixed inset-0 bg-secondary text-white z-50 h-fit animate-slideDownFast px-6 py-8 flex flex-col shadow-2xl">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm uppercase tracking-[0.25em]">
                Search products{' '}
                {searchQuery && (
                  <span className="text-primary-300">
                    (found {filteredProducts.length})
                  </span>
                )}
              </h2>
              <button onClick={handleCloseSearch} aria-label="Close search">
                <X className="w-6 h-6" strokeWidth={1.4} />
              </button>
            </div>

            <Input
              autoFocus
              type="text"
              placeholder="Search by product, category or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-white/40 rounded-none px-0 py-4 text-xl text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:border-primary-300"
            />
          </div>
        </div>
      )}
    </>
  )
}
