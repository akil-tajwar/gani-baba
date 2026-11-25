'use client'

// Dashboard → Coupons
// List with code, type, discount, max discount, minimum order, validity dates, status.
import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, TicketCheck } from 'lucide-react'
import type { GetCouponType, CreateCouponType, CouponType } from '@/utils/type'
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  updateCoupon,
} from '@/utils/api'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { useAtom } from 'jotai'
import { Popup } from '@/utils/popup'
import { toast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type Row = {
  id: number
  code: string
  couponType: CouponType
  discount: number
  maxDiscount: number | null
  minimumOrder: number
  fromDate: string
  toDate: string | null
  isActive: boolean
}

const Coupons = () => {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)

  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  // form state
  const [code, setCode] = useState('')
  const [couponType, setCouponType] = useState<CouponType>('amount')
  const [discount, setDiscount] = useState<number>(0)
  const [maxDiscount, setMaxDiscount] = useState<string>('')
  const [minimumOrder, setMinimumOrder] = useState<number>(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState<number | null>(null)

  const loadRows = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetchCoupons(token)
      const list: GetCouponType[] = res.data ?? []
      setRows(
        list.map((c) => ({
          id: c.couponId as number,
          code: c.code,
          couponType: c.couponType,
          discount: c.discount,
          maxDiscount: c.maxDiscount ?? null,
          minimumOrder: c.minimumOrder,
          fromDate: c.fromDate,
          toDate: c.toDate,
          isActive: c.isActive,
        }))
      )
    } catch (error) {
      console.error('Error loading coupons:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const resetForm = useCallback(() => {
    setCode('')
    setCouponType('amount')
    setDiscount(0)
    setMaxDiscount('')
    setMinimumOrder(0)
    setFromDate('')
    setToDate('')
    setIsActive(true)
    setEditing(null)
    setIsPopupOpen(false)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setCode('')
    setCouponType('amount')
    setDiscount(0)
    setMaxDiscount('')
    setMinimumOrder(0)
    setFromDate('')
    setToDate('')
    setIsActive(true)
    setIsPopupOpen(true)
  }

  const handleEdit = (row: Row) => {
    setEditing(row)
    setCode(row.code)
    setCouponType(row.couponType)
    setDiscount(row.discount)
    setMaxDiscount(row.maxDiscount != null ? String(row.maxDiscount) : '')
    setMinimumOrder(row.minimumOrder)
    setFromDate(row.fromDate)
    setToDate(row.toDate ?? '')
    setIsActive(row.isActive)
    setIsPopupOpen(true)
  }

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!token || !idToDelete) return
    try {
      setIsLoading(true)
      await deleteCoupon(idToDelete, token)
      await loadRows()
      setDeleteDialogOpen(false)
      setIdToDelete(null)
    } catch (error) {
      console.error('Error deleting coupon:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Could not delete coupon.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateCouponType = {
      code: code.trim(),
      couponType,
      discount: Number(discount),
      maxDiscount:
        couponType === 'percentage' && maxDiscount.trim() !== ''
          ? Number(maxDiscount)
          : null,
      minimumOrder: Number(minimumOrder) || 0,
      fromDate,
      toDate: toDate.trim() ? toDate : null,
      isActive,
    } as CreateCouponType

    if (!payload.code || !payload.fromDate) return

    try {
      setIsSubmitting(true)
      if (editing) await updateCoupon(token, editing.id, payload)
      else await createCoupon(token, payload)
      await loadRows()
      resetForm()
    } catch (error) {
      console.error('Error saving coupon:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Failed to save coupon.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-md text-white">
            <TicketCheck />
          </div>
          <h2 className="text-lg font-semibold">Coupons</h2>
        </div>
        <Button onClick={openCreate}>Add Coupon</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary-100">
            <TableRow>
              <TableHead className="w-16">Sl No</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Max Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  Loading coupons...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  No coupons found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell className="capitalize">{row.couponType}</TableCell>
                  <TableCell>
                    {row.couponType === 'percentage'
                      ? `${row.discount}%`
                      : row.discount}
                  </TableCell>
                  <TableCell>
                    {row.couponType === 'percentage' && row.maxDiscount != null
                      ? row.maxDiscount
                      : '—'}
                  </TableCell>
                  <TableCell>{row.minimumOrder}</TableCell>
                  <TableCell>{row.fromDate}</TableCell>
                  <TableCell>{row.toDate ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={
                        row.isActive
                          ? 'text-green-600 font-medium'
                          : 'text-gray-400 font-medium'
                      }
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(row)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(row.id)}
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

      {/* Add / Edit dialog */}
      <Popup
        isOpen={isPopupOpen}
        onClose={resetForm}
        title={editing ? 'Edit Coupon' : 'Add Coupon'}
        size="sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code*</Label>
              <Input
                id="code"
                name="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SAVE20"
                required
              />
            </div>

            {/* Coupon Type */}
            <div className="space-y-2">
              <Label>Coupon Type*</Label>
              <Select
                value={couponType}
                onValueChange={(v) => setCouponType(v as CouponType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount (flat)</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label htmlFor="discount">
                Discount* {couponType === 'percentage' ? '(%)' : '(amount)'}
              </Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder={
                  couponType === 'percentage' ? 'e.g. 20' : 'e.g. 500'
                }
                min={1}
                required
              />
            </div>

            {/* Max Discount — only for percentage */}
            {couponType === 'percentage' ? (
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">
                  Max Discount (cap, optional)
                </Label>
                <Input
                  id="maxDiscount"
                  name="maxDiscount"
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="e.g. 1000"
                  min={0}
                />
                <p className="text-xs text-gray-500">
                  Caps the discount even when the order total is high.
                </p>
              </div>
            ) : (
              // keeps the grid balanced when maxDiscount is hidden
              <div className="hidden sm:block" />
            )}

            {/* Minimum Order */}
            <div className="space-y-2">
              <Label htmlFor="minimumOrder">Minimum Order Amount*</Label>
              <Input
                id="minimumOrder"
                name="minimumOrder"
                type="number"
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(Number(e.target.value))}
                placeholder="e.g. 500"
                min={0}
                required
              />
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date*</Label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date (optional)</Label>
              <Input
                id="toDate"
                name="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2 sm:pt-8">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editing
                  ? 'Update Coupon'
                  : 'Save Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </Popup>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              coupon from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIdToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Coupons
