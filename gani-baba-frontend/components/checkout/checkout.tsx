'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  MapPin,
  Phone,
  Mail,
  User,
  DollarSign,
  FileSliders,
  Banknote,
  Ticket,
  Tag,
  Check,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { CustomCombobox } from '@/utils/custom-combobox'
import { useCart } from '@/hooks/use-cart'
import { locationData, siteConfig } from '@/utils/constants'
import { createOrder, fetchCoupons, getUserByUserId } from '@/utils/api'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser, userDataAtom } from '@/utils/user'
import { GetCouponType, GetUsersType } from '@/utils/type'

/** Today as YYYY-MM-DD (local date, no time) */
const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Normalise a date string (handles "YYYY-MM-DD" and full ISO) to YYYY-MM-DD */
const toDateOnly = (s: string | null | undefined) => {
  if (!s) return null
  return s.length >= 10 ? s.slice(0, 10) : s
}

export default function CheckoutPage() {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)
  const [userData] = useAtom(userDataAtom)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userInfoLoading, setUserInfoLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    division: '',
    district: '',
    method: 'bkash' as 'bkash' | 'nagad' | 'rocket' | 'cod',
    billingPhone: '',
    transactionId: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const { cartItems, clearCart } = useCart()

  // ---------------- Coupon state ----------------
  const [coupons, setCoupons] = useState<GetCouponType[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null)

  // ---- subtotal (before discount) ----
  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  )

  // ---- eligible coupons (date + active check) ----
  // minimumOrder is checked separately per-card so we can show disabled state.
  const eligibleCoupons = useMemo(() => {
    const today = todayStr()
    return coupons.filter((c) => {
      if (!c.isActive) return false
      const from = toDateOnly(c.fromDate)
      const to = toDateOnly(c.toDate)
      if (!from) return false
      if (today < from) return false // not started yet
      if (to && today > to) return false // expired
      return true
    })
  }, [coupons])

  // ---- selected coupon ----
  const selectedCoupon = useMemo(
    () => eligibleCoupons.find((c) => c.couponId === selectedCouponId) || null,
    [eligibleCoupons, selectedCouponId]
  )

  // If selected coupon becomes ineligible (e.g. cart drops below minOrder), clear it
  useEffect(() => {
    if (!selectedCoupon) {
      setSelectedCouponId(null)
      return
    }
    if (subtotal < selectedCoupon.minimumOrder) {
      setSelectedCouponId(null)
    }
  }, [subtotal, selectedCoupon])

  // ---- discount calculation ----
  const discountAmount = useMemo(() => {
    if (!selectedCoupon) return 0
    if (subtotal < selectedCoupon.minimumOrder) return 0

    let amount = 0
    if (selectedCoupon.couponType === 'amount') {
      amount = selectedCoupon.discount
    } else {
      // percentage
      amount = (subtotal * selectedCoupon.discount) / 100
      if (
        selectedCoupon.maxDiscount != null &&
        amount > selectedCoupon.maxDiscount
      ) {
        amount = selectedCoupon.maxDiscount
      }
    }
    // never exceed subtotal
    return Math.min(Math.round(amount), Math.round(subtotal))
  }, [selectedCoupon, subtotal])

  const grandTotal = useMemo(
    () => Math.max(0, Math.round(subtotal) - discountAmount),
    [subtotal, discountAmount]
  )

  // ---- fetch coupons ----
  useEffect(() => {
    const loadCoupons = async () => {
      if (!token) {
        setCouponsLoading(false)
        return
      }
      try {
        setCouponsLoading(true)
        const res = await fetchCoupons(token)
        setCoupons(res.data ?? [])
      } catch (err) {
        console.error('Failed to load coupons:', err)
      } finally {
        setCouponsLoading(false)
      }
    }
    loadCoupons()
  }, [token])

  // Fetch user info and populate form when userData.userId is available
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!userData?.userId || !token) return

      try {
        setUserInfoLoading(true)
        const response = await getUserByUserId(token, userData.userId)
        const userInfo: GetUsersType | null = response.data

        if (userInfo) {
          setFormData((prev) => ({
            ...prev,
            fullName: userInfo.fullName || '',
            phone: userInfo.phone || '',
            email: userInfo.email || '',
            address: userInfo.address || '',
            division: userInfo.division || '',
            district: userInfo.district || '',
          }))
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
        toast({
          title: 'Error',
          variant: 'destructive',
          description: `Failed to load user information`,
        })
      } finally {
        setUserInfoLoading(false)
      }
    }

    fetchUserInfo()
  }, [userData?.userId, token])

  const isCod = formData.method === 'cod'

  // Get available districts based on selected division
  const getAvailableDistricts = () => {
    if (!formData.division) return []
    return (
      locationData.districts[
        formData.division as keyof typeof locationData.districts
      ] || []
    )
  }

  const handleDivisionChange = (value: { id: string; name: string } | null) => {
    setFormData({
      ...formData,
      division: value?.id || '',
      district: '',
    })
    setErrors({ ...errors, division: '' })
  }

  const handleDistrictChange = (value: { id: string; name: string } | null) => {
    setFormData({
      ...formData,
      district: value?.id || '',
    })
    setErrors({ ...errors, district: '' })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.division) newErrors.division = 'Division is required'
    if (!formData.district) newErrors.district = 'District is required'
    if (!isCod && !formData.billingPhone)
      newErrors.billingPhone = 'Billing phone number is required'
    if (!isCod && !formData.transactionId.trim())
      newErrors.transactionId = 'Transaction ID is required'

    if (formData.phone && !/^01[3-9]\d{8}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cartItems.length === 0) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Your cart is empty. Please add items to cart before placing an order.`,
      })
      return
    }

    if (!validateForm()) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Please fill in all required fields`,
      })
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        orderMaster: {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email || null,
          address: formData.address,
          division: formData.division,
          district: formData.district,
          status: 'pending' as 'pending' | 'confirmed' | 'delivered',
          method: formData.method,
          billingPhone: isCod ? formData.phone : formData.billingPhone,
          transactionId: isCod ? '' : formData.transactionId,
          totalAmount: grandTotal, // ← discounted total
          userId: userData?.userId || null,
          // Optional — include if your backend stores them:
          couponId: selectedCoupon?.couponId ?? null,
          couponCode: selectedCoupon?.code ?? null,
          discountAmount,
        },
        orderDetails: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          amount: Math.round(item.price * item.quantity),
        })),
      }

      await createOrder(token, payload)
      router.push('/thank-you')
      clearCart()
    } catch (error) {
      console.error('Order error:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Failed to place order. Please try again.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="lg:w-4/5 mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Left Side - Delivery Information */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="rounded-lg shadow-lg p-6 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Personal Information
                </h2>
                {userInfoLoading && (
                  <span className="text-sm text-gray-500 ml-auto">
                    Loading...
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="fullName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value })
                      setErrors({ ...errors, fullName: '' })
                    }}
                    className={`mt-1 ${errors.fullName ? 'border-red-500' : ''}`}
                    placeholder="Enter your full name"
                    disabled={userInfoLoading}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value })
                        setErrors({ ...errors, phone: '' })
                      }}
                      className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="01XXXXXXXXX"
                      disabled={userInfoLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email (Optional)
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value })
                        setErrors({ ...errors, email: '' })
                      }}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="your.email@example.com"
                      disabled={userInfoLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="rounded-lg shadow-lg p-6 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Delivery Address
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Division <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-1">
                    <CustomCombobox
                      items={locationData.divisions}
                      value={
                        formData.division
                          ? {
                              id: formData.division,
                              name:
                                locationData.divisions.find(
                                  (d) => d.id === formData.division
                                )?.name || '',
                            }
                          : null
                      }
                      onChange={handleDivisionChange}
                      placeholder="Select division"
                      disabled={userInfoLoading}
                    />
                  </div>
                  {errors.division && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.division}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    District <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-1">
                    <CustomCombobox
                      items={getAvailableDistricts()}
                      value={
                        formData.district
                          ? {
                              id: formData.district,
                              name:
                                getAvailableDistricts().find(
                                  (d) => d.id === formData.district
                                )?.name || '',
                            }
                          : null
                      }
                      onChange={handleDistrictChange}
                      placeholder="Select district"
                      disabled={!formData.division || userInfoLoading}
                    />
                  </div>
                  {errors.district && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.district}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="address"
                    className="text-sm font-medium text-gray-700"
                  >
                    Full Address <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value })
                      setErrors({ ...errors, address: '' })
                    }}
                    className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows={3}
                    placeholder="House/Flat No, Road, Area"
                    disabled={userInfoLoading}
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-lg shadow-lg p-6 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Payment Method
                </h2>
              </div>

              {/* Payment Instructions */}
              {isCod ? (
                <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-gray-700">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Cash on Delivery
                  </h3>
                  Pay in cash when your order arrives. Our team will call you to
                  confirm the order and delivery time.
                </div>
              ) : (
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="bg-primary-50 border flex-1 border-primary-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Payment Instructions:
                    </h3>
                    <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Select your payment method below</li>
                      <li>
                        Scan the QR code or use the number (personal):{' '}
                        <span className="font-semibold">
                          {
                            siteConfig.payment[
                              formData.method as 'bkash' | 'nagad' | 'rocket'
                            ]
                          }
                        </span>
                      </li>
                      <li>
                        Pay (send money) at least{' '}
                        {siteConfig.payment.advanceAmount} tk to confirm your
                        order
                      </li>
                      <li>Enter the Transaction ID</li>
                    </ol>
                  </div>
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-full sm:w-40 h-40 bg-gray-100 flex-shrink-0">
                    <Image
                      src={
                        formData.method === 'bkash'
                          ? '/QRbkash.jpeg'
                          : formData.method === 'nagad'
                            ? '/nagadQR.jpg'
                            : '/QRrocket.jpeg'
                      }
                      alt={`${formData.method} QR Code`}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              <RadioGroup
                value={formData.method}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    method: value as 'bkash' | 'nagad' | 'rocket' | 'cod',
                  })
                }
                className="space-y-3"
              >
                <div
                  onClick={() => setFormData({ ...formData, method: 'bkash' })}
                  className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-pink-500 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="bkash" id="bkash" />
                  <Label
                    htmlFor="bkash"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    bKash
                  </Label>
                  <div className="text-pink-600 font-bold text-lg">
                    <Image
                      height={50}
                      width={50}
                      src={'/bkash.png'}
                      alt={'bkash logo'}
                      className="object-cover border rounded-xl"
                    />
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, method: 'nagad' })}
                  className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-orange-500 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="nagad" id="nagad" />
                  <Label
                    htmlFor="nagad"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    Nagad
                  </Label>
                  <div className="text-orange-600 font-bold text-lg">
                    <Image
                      height={50}
                      width={50}
                      src={'/nagad.webp'}
                      alt={'nagad logo'}
                      className="object-cover border rounded-md"
                    />
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, method: 'rocket' })}
                  className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="rocket" id="rocket" />
                  <Label
                    htmlFor="rocket"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    Rocket
                  </Label>
                  <div className="text-purple-600 font-bold text-lg">
                    <Image
                      height={50}
                      width={50}
                      src={'/rocket.jpg'}
                      alt={'rocket logo'}
                      className="object-cover border rounded-md"
                    />
                  </div>
                </div>
                <div
                  onClick={() => setFormData({ ...formData, method: 'cod' })}
                  className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                >
                  <RadioGroupItem value="cod" id="cod" />
                  <Label
                    htmlFor="cod"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    Cash on Delivery
                  </Label>
                  <div className="text-primary">
                    <Banknote className="w-9 h-9" />
                  </div>
                </div>
              </RadioGroup>

              {!isCod && (
                <>
                  <div className="my-6">
                    <Label
                      htmlFor="billingPhone"
                      className="text-sm font-medium text-gray-700"
                    >
                      Billing Phone Number{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="billingPhone"
                        value={formData.billingPhone}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            billingPhone: e.target.value,
                          })
                          setErrors({ ...errors, billingPhone: '' })
                        }}
                        className={`pl-10 ${errors.billingPhone ? 'border-red-500' : ''}`}
                        placeholder="01XXXXXXXXX"
                        disabled={userInfoLoading}
                      />
                    </div>
                    {errors.billingPhone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.billingPhone}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="transactionId"
                      className="text-sm font-medium text-gray-700"
                    >
                      Transaction ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <FileSliders className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="transactionId"
                        value={formData.transactionId}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            transactionId: e.target.value,
                          })
                          setErrors({ ...errors, transactionId: '' })
                        }}
                        className={`mt-1 pl-10 ${errors.transactionId ? 'border-red-500' : ''}`}
                        placeholder="Enter transaction ID"
                      />
                    </div>
                    {errors.transactionId && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.transactionId}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Side - Order Summary */}
          <div className="lg:sticky lg:top-20 h-fit">
            <div className="rounded-lg shadow-lg p-6 bg-gray-50 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Order Summary ({cartItems.length}{' '}
                {cartItems.length === 1 ? 'item' : 'items'})
              </h2>

              <div className="max-h-96 overflow-y-auto space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start space-x-3 bg-gray-50 border border-gray-200 p-3 rounded-lg relative"
                  >
                    <div className="w-14 h-14 overflow-hidden rounded-md">
                      <Image
                        height={64}
                        width={64}
                        src={item.url || '/placeholder.svg'}
                        alt={item.name}
                        className="object-cover border rounded-md"
                      />
                    </div>

                    <div className="flex-1 pr-6">
                      <h3 className="font-medium text-lg truncate">
                        {item.name}
                      </h3>
                      {item.brandName && (
                        <span className="text-sm text-slate-600 font-medium">
                          {item.brandName}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="font-semibold text-sm">
                        {`৳${Math.round(item.price)}x${item.quantity} = ৳${Math.round(item.price * item.quantity)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== COUPON SECTION ===== */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold text-gray-900">
                    Apply Coupon
                  </h3>
                </div>

                {couponsLoading ? (
                  <p className="text-sm text-gray-500">
                    Loading available coupons...
                  </p>
                ) : eligibleCoupons.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No coupons available right now.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {eligibleCoupons.map((coupon) => {
                      const belowMin = subtotal < coupon.minimumOrder
                      const isSelected = selectedCouponId === coupon.couponId
                      return (
                        <button
                          type="button"
                          key={coupon.couponId}
                          disabled={belowMin}
                          onClick={() =>
                            setSelectedCouponId(
                              isSelected ? null : coupon.couponId
                            )
                          }
                          className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                            belowMin
                              ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-primary bg-primary-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <Tag
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                  isSelected ? 'text-primary' : 'text-gray-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-gray-900">
                                    {coupon.code}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {coupon.couponType === 'amount'
                                    ? `৳${coupon.discount} off`
                                    : `${coupon.discount}% off${
                                        coupon.maxDiscount != null
                                          ? ` (max ৳${coupon.maxDiscount})`
                                          : ''
                                      }`}
                                  {coupon.minimumOrder > 0
                                    ? ` • Min order ৳${coupon.minimumOrder}`
                                    : ''}
                                </p>
                                {belowMin && (
                                  <p className="text-[11px] text-red-500 mt-1">
                                    Add ৳
                                    {coupon.minimumOrder - Math.round(subtotal)}{' '}
                                    more to use this coupon
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedCoupon && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-green-700 font-medium">
                      Coupon applied: {selectedCoupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponId(null)}
                      className="text-xs text-red-600 underline hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {/* ===== /COUPON SECTION ===== */}

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>৳{Math.round(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>− ৳{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary">৳{grandTotal}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  isLoading || cartItems.length === 0 || userInfoLoading
                }
                className="w-full group relative mt-6 h-12 px-8 py-4 bg-primary text-white text-lg rounded font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isLoading ? 'Processing...' : 'Place Order'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing this order, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
