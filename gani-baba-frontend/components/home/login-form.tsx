'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  X,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Check,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { signIn, verifyRegistration, resendRegistrationOtp } from '@/utils/api'

export type UserType = {
  userId: number
  username: string
  phone: string
  email?: string | null
  fullName?: string | null
  roleId?: number | null
}

type SignInProps = {
  isOpen: boolean
  onClose: () => void
  onLogin: (user: UserType) => void
  onSwitchToRegister: () => void
}

const OTP_RESEND_SECONDS = 15 * 60
const NOT_VERIFIED_REGEX = /not verified|verify/i

// Pulls the real backend message out of whatever shape the error comes in
// (thrown axios error, returned { error }, plain Error, string, ...)
const getErrorMessage = (source: any): string | null =>
  source?.response?.data?.error?.message ||
  source?.response?.data?.message ||
  source?.error?.message ||
  source?.data?.error?.message ||
  source?.message ||
  (typeof source === 'string' ? source : null)

export default function SignIn({
  isOpen,
  onClose,
  onLogin,
  onSwitchToRegister,
}: SignInProps) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ==========================================
  // OTP VERIFICATION STATE
  // ==========================================
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Reset the OTP screen when the modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowOtpScreen(false)
      setOtpCode('')
      setOtpError('')
      setOtpSuccess('')
      setError('')
    }
  }, [isOpen])

  // Timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  // ==========================================
  // LOGIN FAILURE HANDLING
  // ==========================================
  const handleLoginFailure = async (msg: string) => {
    if (NOT_VERIFIED_REGEX.test(msg)) {
      // Switch the login popup to the verification screen
      setError('')
      setOtpError('')
      setOtpSuccess('')
      setOtpCode('')
      setShowOtpScreen(true)

      toast({
        title: 'Verification Required',
        description: msg, // the actual backend message
        variant: 'destructive',
      })

      // The backend message says the OTP was sent at registration (it may have
      // expired), so request a fresh one
      try {
        const res: any = await resendRegistrationOtp({ phone })
        if (res?.error) {
          // e.g. "Please wait X minutes before requesting another OTP"
          setOtpError(res.error.message)
        } else {
          setResendTimer(OTP_RESEND_SECONDS)
        }
      } catch (err: any) {
        setOtpError(getErrorMessage(err) || 'Failed to send OTP.')
      }
      return
    }

    // Real credential error: show the backend's message
    setError(msg)
    toast({ title: 'Login Failed', description: msg, variant: 'destructive' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phone || !password) {
      setError('Please fill in all fields.')
      return
    }

    setIsLoading(true)
    try {
      const response: any = await signIn({ phone, password })

      // API helper returned an error instead of throwing
      if (response?.error || response?.data?.error) {
        await handleLoginFailure(
          getErrorMessage(response) || 'Login failed. Please try again.'
        )
        return
      }

      const token = response?.data?.data?.token
      const user = response?.data?.data?.user

      if (!token || !user) {
        await handleLoginFailure(
          getErrorMessage(response) || 'Invalid credentials'
        )
        return
      }

      const typedUser: UserType = user as UserType
      localStorage.setItem('authToken', token)
      localStorage.setItem('currentUser', JSON.stringify(typedUser))

      toast({
        title: 'Success',
        description: `Welcome back, ${typedUser.username}!`,
        variant: 'default',
      })

      onLogin(typedUser)
      onClose()
      router.push('/')
    } catch (err: any) {
      console.error('Login error:', err)
      await handleLoginFailure(
        getErrorMessage(err) || 'An unexpected error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ==========================================
  // OTP ACTIONS
  // ==========================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError('')
    setOtpSuccess('')

    if (otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP')
      return
    }

    try {
      setIsLoading(true)
      const response: any = await verifyRegistration({
        phone,
        otpCode,
      })

      if (response?.data && response.data.status === 'success') {
        setOtpSuccess('Account verified successfully! Please login again.')
        toast({
          title: 'Verified! ✅',
          description: 'You can now login with your credentials.',
          variant: 'default',
        })

        setTimeout(() => {
          // Back to the login popup (phone stays, password cleared)
          setShowOtpScreen(false)
          setOtpCode('')
          setOtpSuccess('')
          setResendTimer(0)
          setPassword('')
        }, 2000)
      } else {
        setOtpError(getErrorMessage(response) || 'Invalid or expired OTP.')
      }
    } catch (err: any) {
      setOtpError(getErrorMessage(err) || 'Invalid or expired OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    try {
      setOtpError('')
      setIsLoading(true)
      const res: any = await resendRegistrationOtp({ phone })

      if (res?.error) {
        setOtpError(res.error.message)
        return
      }

      setResendTimer(OTP_RESEND_SECONDS)
      toast({ title: 'Success', description: 'A new OTP has been sent.' })
    } catch (err: any) {
      setOtpError(getErrorMessage(err) || 'Failed to resend OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {showOtpScreen ? 'Verify Your Account' : 'Sign in to your account'}
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
            className="p-6 space-y-6 flex flex-col items-center"
          >
            <div className="bg-primary-50 p-4 rounded-full">
              <ShieldCheck className="w-10 h-10 text-primary-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-medium text-gray-900">
                Account Not Verified
              </h3>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-gray-900">{phone}</span>
              </p>
            </div>

            {otpError && (
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{otpError}</p>
              </div>
            )}

            {otpSuccess && (
              <div className="w-full p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{otpSuccess}</p>
              </div>
            )}

            <div className="w-full space-y-2">
              <Input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </Button>

            <div className="text-sm text-gray-500 text-center">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isLoading}
                className="font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {resendTimer > 0
                  ? `Resend in ${formatTime(resendTimer)}`
                  : 'Resend OTP'}
              </button>
            </div>
          </form>
        ) : (
          /* ==========================================
              REGULAR LOGIN VIEW
              ========================================== */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
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
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Register here
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
