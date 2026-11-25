'use client'

// Dashboard → Overview (admin only)
// Range tabs: 7D, 15D, 1M, 3M, 6M, 1Y  (D = days, M = months, Y = years).
// The selected range is sent to the API as ?range=… and every card/chart
// below is built from that one response.
import React, { useCallback, useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { format, parseISO } from 'date-fns'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  Wallet,
  Receipt,
  Store,
} from 'lucide-react'
import Image from 'next/image'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { fetchDashboardOverview } from '@/utils/api'
import type { DashboardOverviewType, DashboardRange } from '@/utils/type'
import { formatTaka } from '@/utils/constants'
import formatDate from '@/utils/formatDate'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const RANGES: { key: DashboardRange; label: string; text: string }[] = [
  { key: '7D', label: '7D', text: 'Last 7 days' },
  { key: '15D', label: '15D', text: 'Last 15 days' },
  { key: '1M', label: '1M', text: 'Last 1 month' },
  { key: '3M', label: '3M', text: 'Last 3 months' },
  { key: '6M', label: '6M', text: 'Last 6 months' },
  { key: '1Y', label: '1Y', text: 'Last 1 year' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#2563eb',
  delivered: '#16a34a',
}

const METHOD_META: Record<string, { label: string; color: string }> = {
  bkash: { label: 'bKash', color: '#e2136e' },
  nagad: { label: 'Nagad', color: '#f6921e' },
  rocket: { label: 'Rocket', color: '#8c3494' },
  cod: { label: 'Cash on Delivery', color: '#475569' },
}

// Read the site colors (globals.css) so charts follow the theme
const useThemeColors = () => {
  const [colors, setColors] = useState({
    primary: '#1d4ed8',
    secondary: '#3b3b3a',
  })
  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    setColors({
      primary: css.getPropertyValue('--primary-color').trim() || '#1d4ed8',
      secondary: css.getPropertyValue('--secondary-color').trim() || '#3b3b3a',
    })
  }, [])
  return colors
}

// % change vs previous period. null = "no previous data" (shown as New)
const growth = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

const compact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

/* ----------------------------- small pieces ----------------------------- */

const GrowthBadge = ({ value }: { value: number | null }) => {
  if (value === null) {
    return (
      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary">
        New
      </span>
    )
  }
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
        up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  )
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  note,
}: {
  title: string
  value: string
  icon: React.ElementType
  change?: number | null
  note?: string
}) => (
  <div className="rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start justify-between">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="rounded-md bg-primary-50 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
      {change !== undefined && <GrowthBadge value={change} />}
      <span>{note ?? (change !== undefined ? 'vs previous period' : '')}</span>
    </div>
  </div>
)

const Panel = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) => (
  <div className={`rounded-lg border bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
    {children}
  </div>
)

const Empty = ({ text = 'No data for this period' }: { text?: string }) => (
  <div className="flex h-40 items-center justify-center text-sm text-gray-400">
    {text}
  </div>
)

/* -------------------------------- page --------------------------------- */

const DashboardOverview = () => {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)
  const theme = useThemeColors()

  const [range, setRange] = useState<DashboardRange>('1M')
  const [data, setData] = useState<DashboardOverviewType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchDashboardOverview(token, range)
      if (res.error || !res.data) {
        const status = res.error?.status
        setError(
          status === 403 || status === 401
            ? 'Only admins can view the dashboard.'
            : res.error?.message || 'Failed to load dashboard data.'
        )
      } else {
        setData(res.data)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [token, range])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rangeText = RANGES.find((r) => r.key === range)?.text ?? ''
  const cur = data?.summary.current
  const prev = data?.summary.previous

  const tickLabel = (d: string) => {
    const dt = parseISO(d)
    return data?.bucket === 'month' ? format(dt, 'MMM yy') : format(dt, 'd MMM')
  }

  const statusData =
    data?.ordersByStatus
      .filter((s) => s.status)
      .map((s) => ({
        name: (s.status as string).replace(/^./, (c) => c.toUpperCase()),
        key: s.status as string,
        value: s.count,
      })) ?? []
  const statusTotal = statusData.reduce((sum, s) => sum + s.value, 0)

  const paymentTotal =
    data?.paymentMethods.reduce((sum, m) => sum + m.count, 0) ?? 0
  const maxBrandRevenue = Math.max(
    1,
    ...(data?.topBrands.map((b) => b.revenue) ?? [0])
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header + range tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-2 text-white">
            <LayoutDashboard />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dashboard Overview</h2>
            <p className="text-xs text-gray-500">
              {rangeText}
              {data &&
                ` · ${format(parseISO(data.from), 'd MMM yyyy')} – ${format(parseISO(data.to), 'd MMM yyyy')}`}
            </p>
          </div>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              disabled={isLoading && range === r.key}
              className={`px-4 py-2 text-sm font-medium transition ${
                range === r.key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-primary-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* First load skeleton */}
      {isLoading && !data && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      )}

      {data && cur && prev && (
        <div
          className={`space-y-6 transition-opacity duration-300 ${
            isLoading ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Revenue"
              value={formatTaka(cur.revenue)}
              icon={Wallet}
              change={growth(cur.revenue, prev.revenue)}
              note="confirmed + delivered"
            />
            <StatCard
              title="Total Orders"
              value={cur.totalOrders.toLocaleString('en-US')}
              icon={ShoppingBag}
              change={growth(cur.totalOrders, prev.totalOrders)}
            />
            <StatCard
              title="Items Sold"
              value={cur.itemsSold.toLocaleString('en-US')}
              icon={Package}
              change={growth(cur.itemsSold, prev.itemsSold)}
            />
            <StatCard
              title="Avg. Order Value"
              value={formatTaka(cur.averageOrderValue)}
              icon={Receipt}
              change={growth(cur.averageOrderValue, prev.averageOrderValue)}
            />
            <StatCard
              title="Pending Orders"
              value={cur.pendingOrders.toLocaleString('en-US')}
              icon={Clock}
              note={`${formatTaka(cur.pendingValue)} waiting to be confirmed`}
            />
            <StatCard
              title="Delivered Orders"
              value={cur.deliveredOrders.toLocaleString('en-US')}
              icon={Truck}
              change={growth(cur.deliveredOrders, prev.deliveredOrders)}
            />
            <StatCard
              title="New Customers"
              value={cur.newCustomers.toLocaleString('en-US')}
              icon={Users}
              change={growth(cur.newCustomers, prev.newCustomers)}
            />
            <StatCard
              title="Products"
              value={data.catalog.products.toLocaleString('en-US')}
              icon={Boxes}
              note={`${data.catalog.unavailableProducts} unavailable`}
            />
          </div>

          {/* Sales trend + order status */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Panel
              title="Sales Trend"
              subtitle={`Revenue and orders per ${data.bucket}`}
              className="xl:col-span-2"
            >
              {data.salesTrend.every((d) => d.orders === 0) ? (
                <Empty text="No orders in this period" />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.salesTrend}
                      margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="revFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={theme.primary}
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor={theme.primary}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={tickLabel}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        yAxisId="rev"
                        tickFormatter={(v) => `৳${compact(v)}`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                      />
                      <YAxis
                        yAxisId="ord"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        labelFormatter={(l: any) =>
                          data.bucket === 'week'
                            ? `Week of ${format(parseISO(l), 'd MMM yyyy')}`
                            : data.bucket === 'month'
                              ? format(parseISO(l), 'MMMM yyyy')
                              : format(parseISO(l), 'd MMM yyyy')
                        }
                        formatter={(value: any, name: any) =>
                          name === 'Revenue'
                            ? [formatTaka(Number(value)), name]
                            : [value, name]
                        }
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                        }}
                      />
                      <Area
                        yAxisId="rev"
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke={theme.primary}
                        strokeWidth={2}
                        fill="url(#revFill)"
                      />
                      <Line
                        yAxisId="ord"
                        type="monotone"
                        dataKey="orders"
                        name="Orders"
                        stroke={theme.secondary}
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Orders by Status" subtitle={rangeText}>
              {statusTotal === 0 ? (
                <Empty text="No orders in this period" />
              ) : (
                <>
                  <div className="relative h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {statusData.map((s) => (
                            <Cell
                              key={s.key}
                              fill={STATUS_COLORS[s.key] ?? '#94a3b8'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold text-gray-900">
                        {statusTotal}
                      </span>
                      <span className="text-xs text-gray-500">orders</span>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {statusData.map((s) => (
                      <li
                        key={s.key}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 text-gray-600">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: STATUS_COLORS[s.key] ?? '#94a3b8',
                            }}
                          />
                          {s.name}
                        </span>
                        <span className="font-medium text-gray-900">
                          {s.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          {/* Categories / payments / brands */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Panel title="Top Categories" subtitle="By revenue">
              {data.topCategories.length === 0 ? (
                <Empty text="No sales in this period" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topCategories}
                      layout="vertical"
                      margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `৳${compact(v)}`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={96}
                        tick={{ fontSize: 12, fill: '#374151' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(v: any) => [
                          formatTaka(Number(v)),
                          'Revenue',
                        ]}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={theme.primary}
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="Payment Methods"
              subtitle="Orders placed with each method"
            >
              {data.paymentMethods.length === 0 ? (
                <Empty text="No orders in this period" />
              ) : (
                <ul className="space-y-4">
                  {data.paymentMethods
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((m) => {
                      const meta = METHOD_META[m.method] ?? {
                        label: m.method,
                        color: '#94a3b8',
                      }
                      const pct = paymentTotal
                        ? Math.round((m.count / paymentTotal) * 100)
                        : 0
                      return (
                        <li key={m.method}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800">
                              {meta.label}
                            </span>
                            <span className="text-gray-500">
                              {m.count} orders · {formatTaka(m.revenue)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: meta.color,
                              }}
                            />
                          </div>
                        </li>
                      )
                    })}
                </ul>
              )}
            </Panel>

            <Panel title="Top Brands" subtitle="By revenue">
              {data.topBrands.length === 0 ? (
                <Empty text="No sales in this period" />
              ) : (
                <ul className="space-y-4">
                  {data.topBrands.map((b) => (
                    <li key={b.brandId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">
                          {b.name}
                        </span>
                        <span className="text-gray-500">
                          {b.quantity} sold · {formatTaka(b.revenue)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{
                            width: `${Math.round((b.revenue / maxBrandRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Top products + recent orders */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Panel title="Top Products" subtitle="By revenue">
              {data.topProducts.length === 0 ? (
                <Empty text="No sales in this period" />
              ) : (
                <ul className="divide-y">
                  {data.topProducts.map((p, i) => (
                    <li
                      key={p.productId}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="w-5 text-sm font-semibold text-gray-400">
                        {i + 1}
                      </span>
                      <Image
                        src={p.photoUrl || '/placeholder.svg'}
                        alt={p.name}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.brandName} · {p.quantity} sold
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatTaka(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recent Orders"
              subtitle={rangeText}
              className="xl:col-span-2"
            >
              {data.recentOrders.length === 0 ? (
                <Empty text="No orders in this period" />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-primary-100">
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((o) => (
                        <TableRow key={o.ordersMasterId}>
                          <TableCell className="font-medium">
                            #{o.ordersMasterId}
                          </TableCell>
                          <TableCell>{o.fullName}</TableCell>
                          <TableCell>
                            {METHOD_META[o.method]?.label ?? o.method}
                          </TableCell>
                          <TableCell>
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium capitalize"
                              style={{
                                background: `${STATUS_COLORS[o.status ?? ''] ?? '#94a3b8'}1a`,
                                color:
                                  STATUS_COLORS[o.status ?? ''] ?? '#475569',
                              }}
                            >
                              {o.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {o.createdAt
                              ? formatDate(String(o.createdAt))
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatTaka(o.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          </div>

          {/* Store snapshot */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Categories"
              value={data.catalog.categories.toLocaleString('en-US')}
              icon={Tags}
              note="in the catalog"
            />
            <StatCard
              title="Brands"
              value={data.catalog.brands.toLocaleString('en-US')}
              icon={Store}
              note="in the catalog"
            />
            <StatCard
              title="Registered Customers"
              value={data.catalog.customers.toLocaleString('en-US')}
              icon={Users}
              note="all time"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardOverview
