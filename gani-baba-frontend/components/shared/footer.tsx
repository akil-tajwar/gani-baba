'use client'

import { FaFacebookF, FaWhatsapp, FaInstagram, FaYoutube } from 'react-icons/fa'
import { Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import { siteConfig } from '@/utils/constants'

export default function Footer() {
  const { social } = siteConfig

  return (
    <footer className="bg-secondary text-white mt-20 md:mt-28">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <p className="text-2xl font-light uppercase tracking-[0.35em] mb-4">
              {siteConfig.name}
            </p>
            <p className="text-sm text-white/65">{siteConfig.tagline}</p>

            <div className="flex gap-3 items-center mt-6">
              <Link
                href={`https://wa.me/${siteConfig.whatsapp}`}
                target="_blank"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-9 h-9 text-white p-2 border border-white/30 hover:bg-primary hover:border-primary hover:-translate-y-0.5 transition" />
              </Link>
              {social.facebook && (
                <Link href={social.facebook} target="_blank" aria-label="Facebook">
                  <FaFacebookF className="w-9 h-9 text-white p-2 border border-white/30 hover:bg-primary hover:border-primary hover:-translate-y-0.5 transition" />
                </Link>
              )}
              {social.instagram && (
                <Link href={social.instagram} target="_blank" aria-label="Instagram">
                  <FaInstagram className="w-9 h-9 text-white p-2 border border-white/30 hover:bg-primary hover:border-primary hover:-translate-y-0.5 transition" />
                </Link>
              )}
              {social.youtube && (
                <Link href={social.youtube} target="_blank" aria-label="YouTube">
                  <FaYoutube className="w-9 h-9 text-white p-2 border border-white/30 hover:bg-primary hover:border-primary hover:-translate-y-0.5 transition" />
                </Link>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.25em] font-semibold mb-5 text-white">Shop</h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li>
                <Link href="/men-products" className="hover:text-white hover:pl-1 transition-all">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/kids-products" className="hover:text-white hover:pl-1 transition-all">
                  All Brands
                </Link>
              </li>
              <li>
                <Link
                  href="/flash-sale-products"
                  className="hover:text-white hover:pl-1 transition-all"
                >
                  Special Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* My account */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.25em] font-semibold mb-5 text-white">My Account</h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li>
                <Link href="/profile" className="hover:text-white hover:pl-1 transition-all">
                  Profile &amp; Order History
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-white hover:pl-1 transition-all">
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.25em] font-semibold mb-5 text-white">Contact</h3>
            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                {siteConfig.address}
              </li>
              <li className="flex gap-2 items-center">
                <Phone className="w-4 h-4 shrink-0" />
                <a href={`tel:${siteConfig.phone}`} className="hover:text-white">
                  {siteConfig.phone}
                </a>
              </li>
              <li className="flex gap-2 items-center">
                <Mail className="w-4 h-4 shrink-0" />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                  {siteConfig.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Floating WhatsApp button */}
      <Link
        href={`https://wa.me/${siteConfig.whatsapp}`}
        target="_blank"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition"
      >
        <FaWhatsapp className="w-6 h-6" />
      </Link>
    </footer>
  )
}
