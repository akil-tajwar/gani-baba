'use client'

import { FaFacebookF, FaWhatsapp, FaInstagram, FaYoutube } from 'react-icons/fa'
import { Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import { siteConfig } from '@/utils/constants'

export default function Footer() {
  const { social } = siteConfig

  return (
    <footer className="bg-secondary text-white mt-12 sm:mt-16">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-9 h-9 rounded-lg bg-primary text-white font-extrabold flex items-center justify-center">
                {siteConfig.name.charAt(0)}
              </span>
              <span className="text-xl font-extrabold">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-primary-100/80">{siteConfig.tagline}</p>

            <div className="flex gap-3 items-center mt-6">
              <Link
                href={`https://wa.me/${siteConfig.whatsapp}`}
                target="_blank"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-8 h-8 text-white p-1.5 rounded-lg bg-primary hover:bg-primary-500 transition" />
              </Link>
              {social.facebook && (
                <Link href={social.facebook} target="_blank" aria-label="Facebook">
                  <FaFacebookF className="w-8 h-8 text-white p-1.5 rounded-lg bg-primary hover:bg-primary-500 transition" />
                </Link>
              )}
              {social.instagram && (
                <Link href={social.instagram} target="_blank" aria-label="Instagram">
                  <FaInstagram className="w-8 h-8 text-white p-1.5 rounded-lg bg-primary hover:bg-primary-500 transition" />
                </Link>
              )}
              {social.youtube && (
                <Link href={social.youtube} target="_blank" aria-label="YouTube">
                  <FaYoutube className="w-8 h-8 text-white p-1.5 rounded-lg bg-primary hover:bg-primary-500 transition" />
                </Link>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-primary-100/80">
              <li>
                <Link href="/men-products" className="hover:text-white transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/kids-products" className="hover:text-white transition">
                  All Brands
                </Link>
              </li>
              <li>
                <Link
                  href="/flash-sale-products"
                  className="hover:text-white transition"
                >
                  Special Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* My account */}
          <div>
            <h3 className="text-lg font-semibold mb-4">My Account</h3>
            <ul className="space-y-2 text-sm text-primary-100/80">
              <li>
                <Link href="/profile" className="hover:text-white transition">
                  Profile &amp; Order History
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-white transition">
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-primary-100/80">
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

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-sm text-primary-100/70">
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
