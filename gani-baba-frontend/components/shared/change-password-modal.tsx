'use client'

import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { tokenAtom } from '@/utils/user'
import { changePassword } from '@/utils/api'
import { changePasswordSchema } from '@/utils/type'

type ChangePasswordModalProps = {
  isOpen: boolean
  onClose: () => void
}

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  placeholder: string
  show: boolean
  autoComplete: string
  onChange: (value: string) => void
  onToggle: () => void
}

// Defined outside the modal so inputs keep focus while typing
function PasswordField({
  id,
  label,
  value,
  placeholder,
  show,
  autoComplete,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="pl-10 pr-10"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const [token] = useAtom(tokenAtom)

  const [form, setForm] = useState(emptyForm)
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Reset everything whenever the popup closes
  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm)
      setShow({ current: false, next: false, confirm: false })
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const pw = form.newPassword
  const requirements = [
    { text: 'At least 8 characters long', met: pw.length >= 8 },
    { text: 'Contains uppercase letter (A-Z)', met: /[A-Z]/.test(pw) },
    { text: 'Contains lowercase letter (a-z)', met: /[a-z]/.test(pw) },
    { text: 'Contains a number (0-9)', met: /\d/.test(pw) },
    {
      text: 'Contains special character (!@#$%^&*...)',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    },
    {
      text: 'Different from current password',
      met: pw.length > 0 && pw !== form.currentPassword,
    },
  ]
  const allRequirementsMet = requirements.every((r) => r.met)
  const passwordsMatch =
    form.newPassword.length > 0 && form.newPassword === form.confirmNewPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = changePasswordSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your inputs.')
      return
    }

    if (!allRequirementsMet) {
      setError('Please meet all password requirements')
      return
    }

    try {
      setLoading(true)
      const response = await changePassword(token || '', parsed.data)

      // fetchApi returns { data, error } instead of throwing
      if (response.error) {
        setError(response.error.message)
        toast({
          title: 'Could not change password',
          description: response.error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      })
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred'
      setError(msg)
      toast({
        title: 'Could not change password',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Change Password
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <PasswordField
            id="cp-current"
            label="Current Password"
            value={form.currentPassword}
            placeholder="Enter your current password"
            autoComplete="current-password"
            show={show.current}
            onChange={(v) => handleChange('currentPassword', v)}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
          />

          <div className="space-y-2">
            <PasswordField
              id="cp-new"
              label="New Password"
              value={form.newPassword}
              placeholder="Create a new password"
              autoComplete="new-password"
              show={show.next}
              onChange={(v) => handleChange('newPassword', v)}
              onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
            />

            {form.newPassword.length > 0 && (
              <div className="bg-gray-50 rounded-md p-3 space-y-1.5">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Password must have:
                </p>
                {requirements.map((req) => (
                  <div key={req.text} className="flex items-start gap-2">
                    {req.met ? (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-xs ${
                        req.met ? 'text-green-700' : 'text-gray-600'
                      }`}
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <PasswordField
              id="cp-confirm"
              label="Confirm New Password"
              value={form.confirmNewPassword}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              show={show.confirm}
              onChange={(v) => handleChange('confirmNewPassword', v)}
              onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            />
            {form.confirmNewPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !form.currentPassword ||
                !allRequirementsMet ||
                !passwordsMatch
              }
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
