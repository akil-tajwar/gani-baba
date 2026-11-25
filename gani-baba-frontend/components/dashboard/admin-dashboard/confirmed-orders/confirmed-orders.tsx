'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { ArrowUpDown, CheckCircle, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { completeOrder, fetchAllOrders } from '@/utils/api'
import type { GetOrderType } from '@/utils/type'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { useAtom } from 'jotai'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

type SortColumn =
  | 'fullName'
  | 'phone'
  | 'division'
  | 'district'
  | 'totalAmount'
  | 'method'
  | 'createdAt'
  | 'address'
  | 'status'
  | 'transactionId'
type SortDirection = 'asc' | 'desc'

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ConfirmedOrders() {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)
  const router = useRouter()
  const { toast } = useToast()

  // State variables
  const [orders, setOrders] = useState<GetOrderType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Complete order dialog state
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [orderToComplete, setOrderToComplete] = useState<number | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const fetchOrdersData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetchAllOrders(token)
      if (response?.error?.status === 401) {
        router.push('/unauthorized-access')
        return
      } else {
        // Filter only confirmed + delivered orders
        const confirmedOrders = (response.data ?? []).filter(
          (order) =>
            order.orderMaster.status === 'confirmed' ||
            order.orderMaster.status === 'delivered'
        )
        setOrders(confirmedOrders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [token, router, toast])

  useEffect(() => {
    fetchOrdersData()
  }, [fetchOrdersData])

  // Filtering orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders
    const q = searchTerm.toLowerCase()

    return orders.filter((order) => {
      return (
        order.orderMaster.fullName?.toLowerCase().includes(q) ||
        order.orderMaster.phone?.toLowerCase().includes(q) ||
        order.orderMaster.email?.toLowerCase().includes(q) ||
        order.orderMaster.division?.toLowerCase().includes(q) ||
        order.orderMaster.district?.toLowerCase().includes(q) ||
        order.orderMaster.method?.toLowerCase().includes(q) ||
        order.orderMaster.transactionId?.toLowerCase().includes(q) ||
        order.orderMaster.totalAmount?.toString().includes(searchTerm)
      )
    })
  }, [orders, searchTerm])

  // Sorting orders
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders]
    sorted.sort((a, b) => {
      if (sortColumn === 'totalAmount') {
        const diff =
          Number(a.orderMaster[sortColumn]) - Number(b.orderMaster[sortColumn])
        return sortDirection === 'asc' ? diff : -diff
      }
      if (sortColumn === 'createdAt') {
        const dateA = new Date(a.orderMaster.createdAt || '').getTime()
        const dateB = new Date(b.orderMaster.createdAt || '').getTime()
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
      const cmp = String(a.orderMaster[sortColumn] || '').localeCompare(
        String(b.orderMaster[sortColumn] || '')
      )
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredOrders, sortColumn, sortDirection])

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedOrders, currentPage])

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage)

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleCompleteClick = (orderId: number) => {
    setOrderToComplete(orderId)
    setIsCompleteDialogOpen(true)
  }

  const handleCompleteOrder = async () => {
    if (!orderToComplete || !token) return

    try {
      setIsCompleting(true)

      const response = await completeOrder(token, orderToComplete)

      if ((response as any)?.error) {
        toast({
          title: 'Error',
          description:
            (response as any).error?.message || 'Failed to complete order',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Order marked as delivered',
        })
        fetchOrdersData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete order',
        variant: 'destructive',
      })
    } finally {
      setIsCompleting(false)
      setIsCompleteDialogOpen(false)
      setOrderToComplete(null)
    }
  }

  const SortHead = ({
    column,
    children,
  }: {
    column: SortColumn
    children: React.ReactNode
  }) => (
    <TableHead onClick={() => handleSort(column)} className="cursor-pointer">
      <div className="flex items-center gap-1">
        <span>{children}</span>
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </TableHead>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary p-2 rounded-md text-white">
            <Check />
          </div>
          <h2 className="text-lg font-semibold">Confirmed Orders</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary-100">
            <TableRow>
              <TableHead>Sl No</TableHead>
              <SortHead column="fullName">Customer Name</SortHead>
              <SortHead column="phone">Phone</SortHead>
              <SortHead column="division">Division</SortHead>
              <SortHead column="district">District</SortHead>
              <SortHead column="method">Payment Method</SortHead>
              <SortHead column="transactionId">Transaction ID</SortHead>
              <SortHead column="totalAmount">Total Amount</SortHead>
              <SortHead column="createdAt">Order Date</SortHead>
              <SortHead column="address">Address</SortHead>
              <SortHead column="status">Status</SortHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-4">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-4">
                  No confirmed orders found
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order, index) => (
                <TableRow key={order.orderMaster.ordersMasterId}>
                  <TableCell>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell>{order.orderMaster.fullName}</TableCell>
                  <TableCell>{order.orderMaster.phone}</TableCell>
                  <TableCell>{order.orderMaster.division}</TableCell>
                  <TableCell>{order.orderMaster.district}</TableCell>
                  <TableCell className="uppercase">
                    {order.orderMaster.method}
                  </TableCell>
                  <TableCell>
                    {order.orderMaster.transactionId || '-'}
                  </TableCell>
                  <TableCell>৳{order.orderMaster.totalAmount}</TableCell>
                  <TableCell>
                    {formatDate(order.orderMaster.createdAt)}
                  </TableCell>
                  <TableCell>{order.orderMaster.address}</TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        order.orderMaster.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.orderMaster.status === 'confirmed'
                            ? 'bg-primary-100 text-primary-800'
                            : order.orderMaster.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.orderMaster.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={order.orderMaster.status === 'delivered'}
                      onClick={() =>
                        handleCompleteClick(order.orderMaster.ordersMasterId!)
                      }
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {sortedOrders.length > 0 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className={
                    currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>

              {[...Array(totalPages)].map((_, index) => {
                if (
                  index === 0 ||
                  index === totalPages - 1 ||
                  (index >= currentPage - 2 && index <= currentPage + 2)
                ) {
                  return (
                    <PaginationItem key={`page-${index}`}>
                      <PaginationLink
                        onClick={() => setCurrentPage(index + 1)}
                        isActive={currentPage === index + 1}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )
                } else if (
                  index === currentPage - 3 ||
                  index === currentPage + 3
                ) {
                  return (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationLink>...</PaginationLink>
                    </PaginationItem>
                  )
                }

                return null
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className={
                    currentPage === totalPages
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Complete Order Dialog */}
      <AlertDialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as delivered? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteOrder}
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCompleting ? 'Completing...' : 'Complete Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
