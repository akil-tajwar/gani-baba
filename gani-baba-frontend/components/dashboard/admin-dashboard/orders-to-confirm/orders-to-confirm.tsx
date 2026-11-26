'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  CheckCircle,
  Trash2,
  ArrowUpDown,
  Search,
  FileChartColumn,
  Eye,
} from 'lucide-react'
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
import { fetchAllOrders, confirmOrder, deleteOrder } from '@/utils/api'
import type { GetOrderType } from '@/utils/type'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { useAtom } from 'jotai'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Popup } from '@/utils/popup'
import Image from 'next/image'
import { Label } from '@/components/ui/label'

type SortColumn = 'fullName' | 'phone' | 'totalAmount' | 'createdAt' | 'status'
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

export default function OrdersToConfirm() {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)
  const router = useRouter()
  const { toast } = useToast()

  const [orders, setOrders] = useState<GetOrderType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [orderToConfirm, setOrderToConfirm] = useState<number | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const [isViewOpen, setIsViewOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<GetOrderType | null>(null)

  const fetchOrdersData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetchAllOrders(token)
      if (response?.error?.status === 401) {
        router.push('/unauthorized-access')
        return
      } else {
        const pendingOrders = (response.data ?? []).filter(
          (order) => order.orderMaster.status === 'pending'
        )
        setOrders(pendingOrders)
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

  const handleViewClick = (order: GetOrderType) => {
    setViewOrder(order)
    setIsViewOpen(true)
  }

  const handleConfirmClick = (orderId: number) => {
    setOrderToConfirm(orderId)
    setIsConfirmDialogOpen(true)
  }

  const handleConfirmOrder = async () => {
    if (!orderToConfirm || !token) return
    try {
      setIsConfirming(true)
      const response = await confirmOrder(token, orderToConfirm)
      if ((response as any).error) {
        toast({
          title: 'Error',
          description:
            (response as any).error?.message || 'Failed to confirm order',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Order confirmed successfully',
        })
        fetchOrdersData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm order',
        variant: 'destructive',
      })
    } finally {
      setIsConfirming(false)
      setIsConfirmDialogOpen(false)
      setOrderToConfirm(null)
    }
  }

  const handleDeleteClick = (orderId: number) => {
    setOrderToDelete(orderId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete || !token) return
    try {
      setIsDeleting(true)
      const response = await deleteOrder(orderToDelete, token)
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error?.message || 'Failed to delete order',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Order deleted successfully',
        })
        fetchOrdersData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setOrderToDelete(null)
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
            <FileChartColumn />
          </div>
          <h2 className="text-lg font-semibold">Orders To Confirm</h2>
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

      {/* Table — minimal columns */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary-100">
            <TableRow>
              <TableHead>Sl No</TableHead>
              <SortHead column="fullName">Customer</SortHead>
              <SortHead column="phone">Phone</SortHead>
              <SortHead column="totalAmount">Total</SortHead>
              <SortHead column="status">Status</SortHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No pending orders found
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order, index) => (
                <TableRow key={order.orderMaster.ordersMasterId}>
                  <TableCell>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.orderMaster.fullName}
                  </TableCell>
                  <TableCell>{order.orderMaster.phone}</TableCell>
                  <TableCell>৳{order.orderMaster.totalAmount}</TableCell>
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
                  <TableCell className="space-x-4 text-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClick(order)}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleConfirmClick(order.orderMaster.ordersMasterId!)
                      }
                      title="Confirm order"
                      className="bg-green-50 hover:bg-primary text-green-700 border-primary"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDeleteClick(order.orderMaster.ordersMasterId!)
                      }
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
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

      {/* View Details Popup — full data here */}
      <Popup
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false)
          setViewOrder(null)
        }}
        title="Order Details"
        size="sm:max-w-3xl"
      >
        {viewOrder && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Master Info */}
            <div>
              <h3 className="text-base font-semibold mb-3 border-b pb-2">
                Customer & Order Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-medium">
                    #{viewOrder.orderMaster.ordersMasterId}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">
                    {viewOrder.orderMaster.status}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.fullName}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewOrder.orderMaster.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.email || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Billing Phone</Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.billingPhone}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Division</Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.division}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">District</Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.district}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{viewOrder.orderMaster.address}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Payment Method
                  </Label>
                  <p className="font-medium uppercase">
                    {viewOrder.orderMaster.method}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Transaction ID
                  </Label>
                  <p className="font-medium">
                    {viewOrder.orderMaster.transactionId || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="font-semibold">
                    ৳{viewOrder.orderMaster.totalAmount}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {formatDate(viewOrder.orderMaster.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-base font-semibold mb-3 border-b pb-2">
                Order Items
              </h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-primary-100">
                    <TableRow>
                      <TableHead>Sl No</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewOrder.orderDetails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewOrder.orderDetails.map((detail, idx) => (
                        <TableRow key={detail.ordersDetailsId}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Image
                              src={detail.photoUrl || '/placeholder.svg'}
                              alt={detail.productName || 'Product'}
                              width={40}
                              height={40}
                              className="w-10 h-10 object-cover rounded"
                            />
                          </TableCell>
                          <TableCell>{detail.productName || '-'}</TableCell>
                          <TableCell>{detail.quantity}</TableCell>
                          <TableCell>৳{detail.amount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Popup>

      {/* Confirm Order Dialog */}
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm this order? This action will
              change the order status to confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirming}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOrder}
              disabled={isConfirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Order Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
