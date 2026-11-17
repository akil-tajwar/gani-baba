'use client'

import { tokenAtom, useInitializeUser, userDataAtom } from '@/utils/user'
import { useAtom } from 'jotai'
import React, { useState, useEffect } from 'react'
import { getUserByUserId, fetchOrdersByUserId, updateUser } from '@/utils/api'
import { GetUsersType } from '@/utils/type'
import {
  User,
  Package,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomCombobox } from '@/utils/custom-combobox'
import { locationData } from '@/utils/constants'
import { toast } from '@/hooks/use-toast'
import formatDate from '@/utils/formatDate'
import { Reveal } from '@/hooks/use-reveal'
import { WaveLine } from '@/components/shared/section-heading'

type TabType = 'user-info' | 'my-orders'

const methodLabel: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  cod: 'Cash on Delivery',
}

const statusStyle = (status?: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'confirmed':
      return 'bg-primary-50 text-primary border-primary-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export default function Profile() {
  useInitializeUser()
  const [userData] = useAtom(userDataAtom)
  const [token] = useAtom(tokenAtom)

  const [activeTab, setActiveTab] = useState<TabType>('user-info')
  const [userInfo, setUserInfo] = useState<GetUsersType | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    division: '',
    district: '',
    address: '',
  })

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true)
        const response = await getUserByUserId(token, userData?.userId ?? 0)
        setUserInfo(response.data)

        // Initialize edit form data
        setEditFormData({
          fullName: response.data?.fullName || '',
          email: response.data?.email || '',
          phone: response.data?.phone || '',
          division: response.data?.division || '',
          district: response.data?.district || '',
          address: response.data?.address || '',
        })
      } catch (error) {
        // user info could not be loaded; the page shows empty values
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [userData?.userId, token])

  // Fetch orders when orders tab is active
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab !== 'my-orders' || !userData?.userId || !token) return

      try {
        setLoading(true)
        const response = await fetchOrdersByUserId(token, userData?.userId)
        setOrders(
          Array.isArray(response.data)
            ? response.data
            : response.data
              ? [response.data]
              : []
        )
      } catch (error) {
        console.error('Failed to fetch orders:', error)
        toast({
          title: 'Error',
          description: 'Failed to load orders',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [activeTab, userData?.userId, token])

  // Get available districts
  const getAvailableDistricts = () => {
    if (!editFormData.division) return []
    return (
      locationData.districts[
        editFormData.division as keyof typeof locationData.districts
      ] || []
    )
  }

  // Handle division change
  const handleDivisionChange = (value: { id: string; name: string } | null) => {
    setEditFormData((prev) => ({
      ...prev,
      division: value?.id || '',
      district: '', // Reset district when division changes
    }))
  }

  // Handle district change
  const handleDistrictChange = (value: { id: string; name: string } | null) => {
    setEditFormData((prev) => ({
      ...prev,
      district: value?.id || '',
    }))
  }

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!userData?.userId || !token) return

    try {
      setLoading(true)

      const updateResponse = await updateUser(
        token,
        userData.userId,
        editFormData
      )

      if (updateResponse.error) {
        toast({
          title: 'Error',
          description: (updateResponse.error?.details as any).message,
          variant: 'destructive',
        })
        return
      }

      const response = await getUserByUserId(token, userData.userId)
      setUserInfo(response.data)
      setIsEditing(false)

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditFormData({
      fullName: userInfo?.fullName || '',
      email: userInfo?.email || '',
      phone: userInfo?.phone || '',
      division: userInfo?.division || '',
      district: userInfo?.district || '',
      address: userInfo?.address || '',
    })
    setIsEditing(false)
  }

  // Get first letter for avatar
  const getInitial = () => {
    return (
      userInfo?.fullName?.charAt(0).toUpperCase() ||
      userInfo?.username?.charAt(0).toUpperCase() ||
      'U'
    )
  }

  const divisionName =
    locationData.divisions.find((d) => d.id === userInfo?.division)?.name ||
    'Not provided'

  const districtName =
    (userInfo?.division &&
      locationData.districts[
        userInfo.division as keyof typeof locationData.districts
      ]?.find((d) => d.id === userInfo?.district)?.name) ||
    'Not provided'

  const infoFields = [
    { icon: User, label: 'Full name', value: userInfo?.fullName },
    { icon: User, label: 'Username', value: userInfo?.username },
    { icon: Mail, label: 'Email', value: userInfo?.email },
    { icon: Phone, label: 'Phone number', value: userInfo?.phone },
    { icon: MapPin, label: 'Division', value: divisionName },
    { icon: MapPin, label: 'District', value: districtName },
  ]

  const inputClass =
    'rounded-none border-secondary/20 bg-white focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary'

  if (loading && !userInfo) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-xs uppercase tracking-[0.25em] text-secondary/60">
            Loading profile
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ---------------- Header band ---------------- */}
      <div className="bg-surface">
        <div className="container mx-auto px-4 py-10 md:px-8 md:py-14 animate-fadeUp">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-secondary text-5xl font-light text-white">
              {getInitial()}
            </div>
            <div>
              <WaveLine className="mb-3 text-primary" />
              <h1 className="text-2xl font-semibold uppercase tracking-[0.18em] text-secondary md:text-3xl">
                {userInfo?.fullName || 'My account'}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-secondary/60">
                <span>@{userInfo?.username || 'username'}</span>
                {userInfo?.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {formatDate(String(userInfo.createdAt))}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:px-8 md:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* ---------------- Side navigation ---------------- */}
          <aside>
            <nav className="flex gap-2 overflow-x-auto lg:sticky lg:top-28 lg:flex-col lg:gap-0 lg:border lg:border-secondary/10 lg:bg-white">
              {(
                [
                  ['user-info', 'Personal information', User],
                  ['my-orders', 'My orders', Package],
                ] as [TabType, string, typeof User][]
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`group relative flex shrink-0 items-center gap-3 border px-5 py-4 text-xs font-medium uppercase tracking-[0.18em] transition-all duration-300 lg:border-0 lg:border-b lg:border-secondary/10 lg:last:border-b-0 ${
                    activeTab === key
                      ? 'border-primary bg-primary text-white'
                      : 'border-secondary/15 bg-white text-secondary/70 hover:bg-surface hover:text-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {label}
                  <ChevronRight
                    className={`ml-auto hidden h-4 w-4 transition-transform duration-300 lg:block ${
                      activeTab === key
                        ? 'translate-x-0'
                        : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              ))}
            </nav>
          </aside>

          {/* ---------------- Content ---------------- */}
          <section>
            {/* ===== Personal information ===== */}
            {activeTab === 'user-info' && (
              <Reveal>
                <div className="border border-secondary/10 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary/10 px-6 py-5 md:px-8">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
                      Personal information
                    </h2>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="group flex items-center gap-2 border border-secondary px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveChanges}
                          disabled={loading}
                          className="flex items-center gap-2 bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white transition-colors hover:bg-secondary disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {loading ? 'Saving...' : 'Save changes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 border border-secondary/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-secondary transition-colors hover:border-secondary"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8">
                    {!isEditing ? (
                      /* ---- read-only view ---- */
                      <dl className="grid grid-cols-1 gap-px bg-secondary/10 sm:grid-cols-2">
                        {infoFields.map((f) => (
                          <div
                            key={f.label}
                            className="group bg-white px-5 py-5 transition-colors hover:bg-surface/50"
                          >
                            <dt className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-secondary/50">
                              <f.icon
                                className="h-3.5 w-3.5 text-primary"
                                strokeWidth={1.5}
                              />
                              {f.label}
                            </dt>
                            <dd className="mt-2 text-base font-medium text-secondary">
                              {f.value || 'Not provided'}
                            </dd>
                          </div>
                        ))}
                        <div className="group bg-white px-5 py-5 transition-colors hover:bg-surface/50 sm:col-span-2">
                          <dt className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-secondary/50">
                            <MapPin
                              className="h-3.5 w-3.5 text-primary"
                              strokeWidth={1.5}
                            />
                            Address
                          </dt>
                          <dd className="mt-2 text-base font-medium text-secondary">
                            {userInfo?.address || 'Not provided'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      /* ---- edit form ---- */
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="fullName"
                            className="text-[11px] uppercase tracking-[0.2em] text-secondary/60"
                          >
                            Full name
                          </Label>
                          <Input
                            id="fullName"
                            value={editFormData.fullName}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                fullName: e.target.value,
                              }))
                            }
                            placeholder="Enter your full name"
                            className={inputClass}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="text-[11px] uppercase tracking-[0.2em] text-secondary/60"
                          >
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={editFormData.email}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            placeholder="Enter your email"
                            className={inputClass}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="text-[11px] uppercase tracking-[0.2em] text-secondary/60"
                          >
                            Phone number
                          </Label>
                          <Input
                            id="phone"
                            value={editFormData.phone}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="Enter your phone number"
                            className={inputClass}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.2em] text-secondary/60">
                            Division
                          </Label>
                          <CustomCombobox
                            items={locationData.divisions}
                            value={
                              editFormData.division
                                ? {
                                    id: editFormData.division,
                                    name:
                                      locationData.divisions.find(
                                        (d) => d.id === editFormData.division
                                      )?.name || '',
                                  }
                                : null
                            }
                            onChange={handleDivisionChange}
                            placeholder="Select division"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.2em] text-secondary/60">
                            District
                          </Label>
                          <CustomCombobox
                            items={getAvailableDistricts()}
                            value={
                              editFormData.district
                                ? {
                                    id: editFormData.district,
                                    name:
                                      getAvailableDistricts().find(
                                        (d) => d.id === editFormData.district
                                      )?.name || '',
                                  }
                                : null
                            }
                            onChange={handleDistrictChange}
                            placeholder="Select district"
                            disabled={!editFormData.division}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label
                            htmlFor="address"
                            className="text-[11px] uppercase tracking-[0.2em] text-secondary/60"
                          >
                            Address
                          </Label>
                          <textarea
                            id="address"
                            value={editFormData.address}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                            placeholder="Enter your complete address"
                            rows={3}
                            className="w-full resize-none border border-secondary/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ===== My orders ===== */}
            {activeTab === 'my-orders' && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
                    Order history
                  </h2>
                  {!loading && orders.length > 0 && (
                    <span className="text-xs uppercase tracking-[0.18em] text-secondary/50">
                      {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="border border-secondary/10 bg-white py-16 text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                    <p className="text-xs uppercase tracking-[0.25em] text-secondary/60">
                      Loading orders
                    </p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="border border-secondary/10 bg-white py-16 text-center">
                    <Package
                      className="mx-auto mb-4 h-14 w-14 text-secondary/20"
                      strokeWidth={1}
                    />
                    <p className="text-sm uppercase tracking-[0.2em] text-secondary">
                      No orders yet
                    </p>
                    <p className="mt-1 text-sm text-secondary/50">
                      Your order history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {orders.map((order, index) => (
                      <Reveal
                        key={order.orderMaster?.ordersMasterId ?? index}
                        delay={(index % 4) * 70}
                      >
                        <article className="border border-secondary/10 bg-white transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
                          {/* Order header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary/10 bg-surface/50 px-5 py-4 md:px-6">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                                Order #
                                {order.orderMaster?.ordersMasterId ?? index + 1}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-secondary/60">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(order.orderMaster.createdAt)}
                              </span>
                              {order.orderMaster.method && (
                                <span className="flex items-center gap-1.5 text-xs text-secondary/60">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  {methodLabel[order.orderMaster.method] ||
                                    order.orderMaster.method}
                                </span>
                              )}
                            </div>
                            <span
                              className={`border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${statusStyle(
                                order.orderMaster.status
                              )}`}
                            >
                              {order.orderMaster.status}
                            </span>
                          </div>

                          {/* Items */}
                          <div className="px-5 py-4 md:px-6">
                            {order.orderDetails &&
                            order.orderDetails.length > 0 ? (
                              <ul className="divide-y divide-secondary/5">
                                {order.orderDetails.map(
                                  (item: any, idx: number) => (
                                    <li
                                      key={idx}
                                      className="flex items-center justify-between gap-4 py-2.5 text-sm"
                                    >
                                      <span className="text-secondary">
                                        {item.productName || 'Product'}
                                      </span>
                                      <span className="shrink-0 text-secondary/60">
                                        × {item.quantity}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <p className="py-2 text-sm text-secondary/40">
                                No items
                              </p>
                            )}
                          </div>

                          {/* Total */}
                          <div className="flex items-center justify-between border-t border-secondary/10 px-5 py-4 md:px-6">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-secondary/50">
                              Total amount
                            </span>
                            <span className="text-lg font-semibold text-primary">
                              ৳
                              {Math.round(
                                order.orderMaster.totalAmount
                              ).toLocaleString('en-US')}
                            </span>
                          </div>
                        </article>
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
