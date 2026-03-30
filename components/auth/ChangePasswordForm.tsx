'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react'

function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  return score
}

const strengthConfig = [
  { label: 'Weak', color: 'bg-red-500' },
  { label: 'Fair', color: 'bg-orange-500' },
  { label: 'Good', color: 'bg-yellow-400' },
  { label: 'Strong', color: 'bg-green-500' },
]

export function ChangePasswordForm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(newPassword)
  const strengthLabel = newPassword.length > 0 ? strengthConfig[strength - 1]?.label ?? '' : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await fetch('/api/auth/clear-password-flag', { method: 'POST' })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-card rounded-2xl shadow-lg p-8 w-full max-w-md">
      {/* Header badge */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-full bg-navy flex items-center justify-center mb-4 shadow-md"
          aria-hidden="true"
        >
          <Key className="w-7 h-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
        <p className="text-muted-foreground text-sm mt-1">Your account requires a new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* New Password field */}
        <div>
          <label
            htmlFor="new_password"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new_password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-border rounded-lg h-11 px-3 pr-11 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              placeholder="At least 8 characters"
              required
              autoFocus
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(prev => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          {newPassword.length > 0 && (
            <div className="mt-2" aria-live="polite" aria-label={`Password strength: ${strengthLabel}`}>
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < strength
                        ? strengthConfig[strength - 1]?.color ?? 'bg-gray-200'
                        : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              {strengthLabel && (
                <p className="text-xs text-muted-foreground">
                  Strength:{' '}
                  <span
                    className={
                      strength === 1
                        ? 'text-red-500'
                        : strength === 2
                        ? 'text-orange-500'
                        : strength === 3
                        ? 'text-yellow-500'
                        : 'text-green-600'
                    }
                  >
                    {strengthLabel}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password field */}
        <div>
          <label
            htmlFor="confirm_password"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm_password"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-border rounded-lg h-11 px-3 pr-11 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              placeholder="Repeat your new password"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(prev => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg h-11 font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              Update Password
            </>
          )}
        </button>
      </form>
    </div>
  )
}
