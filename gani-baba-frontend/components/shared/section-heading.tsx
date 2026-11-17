import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/hooks/use-reveal'

/** Small decorative wave used under/above headings. Colored by `text-*`. */
export function WaveLine({ className = '' }: { className?: string }) {
  return (
    <svg
      width="90"
      height="14"
      viewBox="0 0 90 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 7c3.7-6 7.5-6 11.2 0s7.5 6 11.2 0 7.5-6 11.2 0 7.5 6 11.2 0 7.5-6 11.2 0 7.5 6 11.2 0 7.5-6 11.2 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = 'View all',
}: {
  title: string
  subtitle?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <Reveal className="mb-8 md:mb-10 flex items-end justify-between gap-4">
      <div>
        <WaveLine className="text-primary mb-3" />
        <h2 className="text-2xl md:text-3xl font-semibold uppercase tracking-[0.18em] text-secondary">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-xs md:text-sm uppercase tracking-[0.2em] text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors"
        >
          {linkLabel}
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </Reveal>
  )
}
