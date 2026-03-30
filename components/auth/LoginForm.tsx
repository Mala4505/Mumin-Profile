'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Hash,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [itsNo, setItsNo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const email = `${itsNo}@mumin.local`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid ITS No or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Sign In</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Enter your ITS number and password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ITS Number field */}
        <div>
          <label
            htmlFor="its_no"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2"
          >
            <Hash className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            ITS Number
          </label>
          <input
            id="its_no"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={itsNo}
            onChange={e => setItsNo(e.target.value)}
            className="w-full border border-border rounded-lg h-11 px-3 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
            placeholder="e.g. 10000001"
            required
            autoFocus
            autoComplete="username"
          />
        </div>

        {/* Password field */}
        <div>
          <label
            htmlFor="password"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2"
          >
            <Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-border rounded-lg h-11 px-3 pr-11 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
              placeholder="Your Sabeel number"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 italic">
            Default password is your Sabeel number
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2.5 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg h-11 font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Sign In
            </>
          )}
        </button>
      </form>
    </div>
  )
}
