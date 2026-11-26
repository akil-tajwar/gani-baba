'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAtom } from 'jotai'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  MapPin,
  Phone,
  Home,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react'
import { RegisterRequestSchema } from '@/utils/type'
import {
  getUsers,
  registerUser,
  verifyRegistration,
  resendRegistrationOtp,
} from '@/utils/api'
import { UserType } from './login-form'
import { tokenAtom } from '@/utils/user'
import { toast } from '@/hooks/use-toast'
import { locationData } from '@/utils/constants'
import { CustomCombobox } from '@/utils/custom-combobox'

interface RegisterFormProps {
  isOpen: boolean
  onClose: () => void
  onRegister: (user: UserType) => void
  onSwitchToLogin: () => void
}

interface PasswordRequirement {
  text: string
  met: boolean
}

type TabType = 'user-details' | 'location-details' | 'set-password'

export default function RegisterForm({
  isOpen,
  onClose,
  onSwitchToLogin,
}: RegisterFormProps) {
  const router = useRouter()
  const [token] = useAtom(tokenAtom)

  // ==========================================
  // OTP STATE
  // ==========================================
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [registeredPhone, setRegisteredPhone] = useState('')
  const [resendLevel, setResendLevel] = useState(0) // Tracks attempts

  // ==========================================
  // FORM STATE
  // ==========================================
  const [currentTab, setCurrentTab] = useState<TabType>('user-details')
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    fullName: '',
    division: '',
    district: '',
    address: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingUsers, setExistingUsers] = useState<any[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [touched, setTouched] = useState({
    username: false,
    phone: false,
    email: false,
    fullName: false,
    division: false,
    district: false,
    address: false,
    password: false,
    confirmPassword: false,
  })

  const [passwordRequirements, setPasswordRequirements] = useState<
    PasswordRequirement[]
  >([
    { text: 'At least 8 characters long', met: false },
    { text: 'Contains uppercase letter (A-Z)', met: false },
    { text: 'Contains lowercase letter (a-z)', met: false },
    { text: 'Contains a number (0-9)', met: false },
    { text: 'Contains special character (!@#$%^&*...)', met: false },
    { text: 'Not a common password', met: false },
  ])

  // ==========================================
  // DATA FETCHING & VALIDATION
  // ==========================================
  const fetchUsers = useCallback(async () => {
    if (!isOpen) return
    try {
      setCheckingAvailability(true)
      const res = await getUsers(token || '')
      setExistingUsers(res.data?.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setExistingUsers([])
    } finally {
      setCheckingAvailability(false)
    }
  }, [token, isOpen])

  useEffect(() => {
    if (isOpen) fetchUsers()
  }, [fetchUsers, isOpen])

  useEffect(() => {
    const password = formData.password
    const commonPasswords = ['password123', 'admin123', '12345678']

    setPasswordRequirements([
      { text: 'At least 8 characters long', met: password.length >= 8 },
      { text: 'Contains uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
      { text: 'Contains lowercase letter (a-z)', met: /[a-z]/.test(password) },
      { text: 'Contains a number (0-9)', met: /\d/.test(password) },
      {
        text: 'Contains special character (!@#$%^&*...)',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
      {
        text: 'Not a common password',
        met:
          password.length > 0 &&
          !commonPasswords.includes(password.toLowerCase()),
      },
    ])
  }, [formData.password])

  const allPasswordRequirementsMet = passwordRequirements.every(
    (req) => req.met
  )
  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword

  const isUsernameTaken = (username: string) => {
    if (!username || username.length < 3) return false
    return existingUsers.some(
      (user) =>
        user.username && user.username.toLowerCase() === username.toLowerCase()
    )
  }

  const isPhoneTaken = (phone: string) => {
    if (!phone || !/^[0-9]{10,15}$/.test(phone)) return false
    return existingUsers.some((user) => user.phone && user.phone === phone)
  }

  const isEmailTaken = (email: string) => {
    if (!email || !isEmailValid(email)) return false
    return existingUsers.some(
      (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
    )
  }

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isUsernameValid = (username: string) => {
    return username.length >= 3
  }

  const isPhoneValid = (phone: string) => {
    return /^[0-9]{10,15}$/.test(phone)
  }

  const getAvailableDistricts = () => {
    if (!formData.division) return []
    return (
      locationData.districts[
        formData.division as keyof typeof locationData.districts
      ] || []
    )
  }

  const handleDivisionChange = (value: { id: string; name: string } | null) => {
    setFormData((prev) => ({
      ...prev,
      division: value?.id || '',
      district: '',
    }))
    setError('')
  }

  const handleDistrictChange = (value: { id: string; name: string } | null) => {
    setFormData((prev) => ({
      ...prev,
      district: value?.id || '',
    }))
    setError('')
  }

  const validateCurrentTab = (): boolean => {
    setError('')

    if (currentTab === 'user-details') {
      setTouched((prev) => ({
        ...prev,
        username: true,
        phone: true,
        email: true,
        fullName: true,
      }))

      if (!isUsernameValid(formData.username)) {
        setError('Username must be at least 3 characters long')
        return false
      }
      if (isUsernameTaken(formData.username)) {
        setError('This username is already taken. Please choose another one.')
        return false
      }

      if (!formData.phone.trim()) {
        setError('Phone number is required')
        return false
      }
      if (!isPhoneValid(formData.phone)) {
        setError('Please enter a valid phone number (10-15 digits)')
        return false
      }
      if (isPhoneTaken(formData.phone)) {
        setError(
          'This phone number is already registered. Please login instead.'
        )
        return false
      }

      if (formData.email.trim()) {
        if (!isEmailValid(formData.email)) {
          setError('Please enter a valid email address')
          return false
        }
        if (isEmailTaken(formData.email)) {
          setError(
            'This email is already registered. Please use another email or login.'
          )
          return false
        }
      }

      if (!formData.fullName || formData.fullName.trim().length < 2) {
        setError('Please enter your full name')
        return false
      }

      return true
    }

    if (currentTab === 'location-details') {
      setTouched((prev) => ({
        ...prev,
        division: true,
        district: true,
        address: true,
      }))

      if (!formData.division) {
        setError('Please select a division')
        return false
      }
      if (!formData.district) {
        setError('Please select a district')
        return false
      }
      if (!formData.address || formData.address.trim().length < 5) {
        setError('Please enter a valid address (at least 5 characters)')
        return false
      }
      return true
    }

    if (currentTab === 'set-password') {
      setTouched((prev) => ({
        ...prev,
        password: true,
        confirmPassword: true,
      }))

      if (!allPasswordRequirementsMet) {
        setError('Please meet all password requirements')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
      return true
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentTab()) return
    if (currentTab === 'user-details') setCurrentTab('location-details')
    else if (currentTab === 'location-details') setCurrentTab('set-password')
  }

  const handlePrev = () => {
    setError('')
    if (currentTab === 'set-password') setCurrentTab('location-details')
    else if (currentTab === 'location-details') setCurrentTab('user-details')
  }

  // ==========================================
  // SUBMIT ACTIONS
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateCurrentTab()) return

    try {
      setLoading(true)
      const validatedData = RegisterRequestSchema.parse({
        ...formData,
        email: formData.email.trim() || undefined,
        roleId: 2,
      })
      const response = await registerUser(validatedData)

      if (response.data && response.data.status === 'success') {
        // Transition to OTP screen
        setRegisteredPhone(formData.phone)
        setShowOtpScreen(true)
        setResendLevel(0) // Reset the resend attempts

        toast({
          title: 'Account Created! 🎉',
          description: `We've sent a 6-digit OTP to ${formData.phone}.`,
          variant: 'default',
        })
      } else {
        setError(
          response.error?.message || 'Registration failed. Please try again.'
        )
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      if (err.errors) {
        setError('Validation failed. Please check your inputs.')
      } else {
        setError(err.message || 'An error occurred. Please try again.')
      }
      toast({
        title: 'Error',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    try {
      setLoading(true)
      const response = await verifyRegistration({
        phone: registeredPhone,
        otpCode: otpCode,
      })

      if (response.data && response.data.status === 'success') {
        setSuccess('Account verified successfully! Redirecting to login...')
        toast({
          title: 'Verified! ✅',
          description: 'You can now login with your credentials.',
          variant: 'default',
        })

        setTimeout(() => {
          setShowOtpScreen(false)
          setOtpCode('')
          onClose()
          onSwitchToLogin()
        }, 2000)
      } else {
        setError(response.error?.message || 'Invalid or expired OTP.')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      setError('')
      setLoading(true)

      const response = await resendRegistrationOtp({ phone: registeredPhone })

      if (response.error) {
        // ✅ Show the EXACT error from the backend (e.g., "Please wait 60 minutes...")
        setError(response.error.message)
        return
      }

      // ✅ Success. Increment attempt count.
      setResendLevel((prev) => prev + 1)
      toast({ title: 'Success', description: 'A new OTP has been sent.' })
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'user-details' as TabType, label: 'User Details', icon: User },
    {
      id: 'location-details' as TabType,
      label: 'Location Details',
      icon: MapPin,
    },
    { id: 'set-password' as TabType, label: 'Set Password', icon: Lock },
  ]

  const currentTabIndex = tabs.findIndex((tab) => tab.id === currentTab)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            {showOtpScreen ? 'Verify Your Phone' : 'Create New Account'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ==========================================
            OTP SCREEN VIEW
            ========================================== */}
        {showOtpScreen ? (
          <form
            onSubmit={handleVerifyOtp}
            className="p-8 space-y-6 flex flex-col items-center"
          >
            <div className="bg-primary-50 p-4 rounded-full">
              <ShieldCheck className="w-12 h-12 text-primary-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                Enter Verification Code
              </h3>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-gray-900">
                  {registeredPhone}
                </span>
              </p>
            </div>

            {error && (
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="w-full p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="w-full max-w-xs space-y-2">
              <Input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-3xl tracking-[0.5em] font-bold h-16"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full max-w-xs bg-primary-600 hover:bg-primary-700 text-white h-12 text-lg"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>

            <div className="text-sm text-gray-500 mt-4 text-center">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </form>
        ) : (
          /* ==========================================
              REGULAR REGISTRATION VIEW
              ========================================== */
          <>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 bg-gray-50 sticky top-[73px] z-10">
              <div className="flex">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon
                  const isActive = currentTab === tab.id
                  const isCompleted = index < currentTabIndex

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (index <= currentTabIndex) {
                          setCurrentTab(tab.id)
                          setError('')
                        }
                      }}
                      disabled={index > currentTabIndex}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 border-b-2 transition-all ${
                        isActive
                          ? 'border-primary-600 text-primary-600 bg-white'
                          : isCompleted
                            ? 'border-green-500 text-green-600 bg-white hover:bg-gray-50 cursor-pointer'
                            : 'border-transparent text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full ${
                          isActive
                            ? 'bg-primary-100'
                            : isCompleted
                              ? 'bg-green-100'
                              : 'bg-gray-100'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-medium text-sm hidden sm:inline">
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {currentTab === 'user-details' && (
                  <>
                    {/* Username */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-username"
                        className="text-sm font-medium text-gray-700"
                      >
                        Username <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-username"
                          type="text"
                          value={formData.username}
                          onChange={(e) =>
                            handleInputChange('username', e.target.value)
                          }
                          onBlur={() => handleBlur('username')}
                          placeholder="Choose a username"
                          className={`pl-10 ${
                            touched.username &&
                            !isUsernameValid(formData.username)
                              ? 'border-red-300 focus:border-red-500'
                              : touched.username &&
                                  isUsernameTaken(formData.username)
                                ? 'border-red-300 focus:border-red-500'
                                : touched.username &&
                                    isUsernameValid(formData.username)
                                  ? 'border-green-300 focus:border-green-500'
                                  : ''
                          }`}
                          required
                        />
                      </div>
                      {touched.username &&
                        !isUsernameValid(formData.username) && (
                          <p className="text-xs text-red-600">
                            Username must be at least 3 characters
                          </p>
                        )}
                      {touched.username &&
                        isUsernameValid(formData.username) &&
                        isUsernameTaken(formData.username) && (
                          <p className="text-xs text-red-600">
                            This username is already taken
                          </p>
                        )}
                      {touched.username &&
                        isUsernameValid(formData.username) &&
                        !isUsernameTaken(formData.username) && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Username is available
                          </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-phone"
                        className="text-sm font-medium text-gray-700"
                      >
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange('phone', e.target.value)
                          }
                          onBlur={() => handleBlur('phone')}
                          placeholder="01XXXXXXXXX"
                          className={`pl-10 ${
                            touched.phone && !formData.phone
                              ? 'border-red-300 focus:border-red-500'
                              : touched.phone && !isPhoneValid(formData.phone)
                                ? 'border-red-300 focus:border-red-500'
                                : touched.phone && isPhoneTaken(formData.phone)
                                  ? 'border-red-300 focus:border-red-500'
                                  : touched.phone &&
                                      isPhoneValid(formData.phone)
                                    ? 'border-green-300 focus:border-green-500'
                                    : ''
                          }`}
                          required
                        />
                      </div>
                      {touched.phone && !formData.phone && (
                        <p className="text-xs text-red-600">
                          Phone number is required
                        </p>
                      )}
                      {touched.phone &&
                        formData.phone &&
                        !isPhoneValid(formData.phone) && (
                          <p className="text-xs text-red-600">
                            Please enter a valid phone number (10-15 digits)
                          </p>
                        )}
                      {touched.phone &&
                        isPhoneValid(formData.phone) &&
                        isPhoneTaken(formData.phone) && (
                          <p className="text-xs text-red-600">
                            This phone number is already registered
                          </p>
                        )}
                      {touched.phone &&
                        isPhoneValid(formData.phone) &&
                        !isPhoneTaken(formData.phone) && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Phone number is
                            available
                          </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-email"
                        className="text-sm font-medium text-gray-700"
                      >
                        Email (Optional)
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange('email', e.target.value)
                          }
                          onBlur={() => handleBlur('email')}
                          placeholder="your.email@example.com"
                          className={`pl-10 ${
                            touched.email &&
                            formData.email &&
                            !isEmailValid(formData.email)
                              ? 'border-red-300 focus:border-red-500'
                              : touched.email &&
                                  formData.email &&
                                  isEmailTaken(formData.email)
                                ? 'border-red-300 focus:border-red-500'
                                : touched.email &&
                                    formData.email &&
                                    isEmailValid(formData.email)
                                  ? 'border-green-300 focus:border-green-500'
                                  : ''
                          }`}
                        />
                      </div>
                      {touched.email &&
                        formData.email &&
                        !isEmailValid(formData.email) && (
                          <p className="text-xs text-red-600">
                            Please enter a valid email address
                          </p>
                        )}
                      {touched.email &&
                        formData.email &&
                        isEmailValid(formData.email) &&
                        isEmailTaken(formData.email) && (
                          <p className="text-xs text-red-600">
                            This email is already registered
                          </p>
                        )}
                      {touched.email &&
                        formData.email &&
                        isEmailValid(formData.email) &&
                        !isEmailTaken(formData.email) && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Email is available
                          </p>
                        )}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-fullname"
                        className="text-sm font-medium text-gray-700"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-fullname"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) =>
                            handleInputChange('fullName', e.target.value)
                          }
                          onBlur={() => handleBlur('fullName')}
                          placeholder="Enter your full name"
                          className={`pl-10 ${
                            touched.fullName &&
                            (!formData.fullName ||
                              formData.fullName.trim().length < 2)
                              ? 'border-red-300 focus:border-red-500'
                              : touched.fullName &&
                                  formData.fullName.trim().length >= 2
                                ? 'border-green-300 focus:border-green-500'
                                : ''
                          }`}
                          required
                        />
                      </div>
                      {touched.fullName &&
                        (!formData.fullName ||
                          formData.fullName.trim().length < 2) && (
                          <p className="text-xs text-red-600">
                            Please enter your full name
                          </p>
                        )}
                    </div>
                  </>
                )}

                {currentTab === 'location-details' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Division <span className="text-red-500">*</span>
                      </Label>
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
                      />
                      {touched.division && !formData.division && (
                        <p className="text-xs text-red-600">
                          Please select a division
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        District <span className="text-red-500">*</span>
                      </Label>
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
                        disabled={!formData.division}
                      />
                      {touched.district && !formData.district && (
                        <p className="text-xs text-red-600">
                          Please select a district
                        </p>
                      )}
                      {!formData.division && (
                        <p className="text-xs text-gray-500">
                          Please select a division first
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-address"
                        className="text-sm font-medium text-gray-700"
                      >
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                        <textarea
                          id="reg-address"
                          value={formData.address}
                          onChange={(e) =>
                            handleInputChange('address', e.target.value)
                          }
                          onBlur={() => handleBlur('address')}
                          placeholder="Enter your complete address"
                          rows={3}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                            touched.address &&
                            (!formData.address ||
                              formData.address.trim().length < 5)
                              ? 'border-red-300 focus:border-red-500'
                              : touched.address &&
                                  formData.address.trim().length >= 5
                                ? 'border-green-300 focus:border-green-500'
                                : 'border-gray-300'
                          }`}
                          required
                        />
                      </div>
                      {touched.address &&
                        (!formData.address ||
                          formData.address.trim().length < 5) && (
                          <p className="text-xs text-red-600">
                            Please enter a valid address (at least 5 characters)
                          </p>
                        )}
                      {touched.address &&
                        formData.address.trim().length >= 5 && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Valid address
                          </p>
                        )}
                    </div>
                  </>
                )}

                {currentTab === 'set-password' && (
                  <>
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-password"
                        className="text-sm font-medium text-gray-700"
                      >
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) =>
                            handleInputChange('password', e.target.value)
                          }
                          onBlur={() => handleBlur('password')}
                          placeholder="Create a password"
                          className={`pl-10 pr-10 ${
                            touched.password && !allPasswordRequirementsMet
                              ? 'border-red-300 focus:border-red-500'
                              : touched.password && allPasswordRequirementsMet
                                ? 'border-green-300 focus:border-green-500'
                                : ''
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {(touched.password || formData.password.length > 0) && (
                        <div className="bg-gray-50 rounded-md p-3 space-y-1.5">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Password must have:
                          </p>
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-start gap-2">
                              {req.met ? (
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              )}
                              <span
                                className={`text-xs ${req.met ? 'text-green-700' : 'text-gray-600'}`}
                              >
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-confirm-password"
                        className="text-sm font-medium text-gray-700"
                      >
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            handleInputChange('confirmPassword', e.target.value)
                          }
                          onBlur={() => handleBlur('confirmPassword')}
                          placeholder="Confirm your password"
                          className={`pl-10 pr-10 ${
                            touched.confirmPassword &&
                            formData.confirmPassword &&
                            !passwordsMatch
                              ? 'border-red-300 focus:border-red-500'
                              : touched.confirmPassword && passwordsMatch
                                ? 'border-green-300 focus:border-green-500'
                                : ''
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {touched.confirmPassword &&
                        formData.confirmPassword &&
                        !passwordsMatch && (
                          <p className="text-xs text-red-600">
                            Passwords do not match
                          </p>
                        )}
                      {touched.confirmPassword && passwordsMatch && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Passwords match
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentTab === 'user-details'}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentTab !== 'set-password' ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                )}
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
