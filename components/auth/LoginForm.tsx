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
  LogIn,
} from 'lucide-react'
import { LumaSpin } from '@/components/ui/luma-spin'

export function LoginForm() {
  const router = useRouter()
  const [itsNo, setItsNo] = useState('')
  const [paciNo, setPaciNo] = useState('')
  const [showPaci, setShowPaci] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Validate ITS + PACI server-side; get derived credentials
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ its_no: itsNo, paci_no: paciNo }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Invalid ITS No or PACI No. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Sign in with HMAC-derived credentials
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Sign in failed. Please try again.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
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
        {/* ITS Number */}
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

        {/* PACI Number */}
        <div>
          <label
            htmlFor="paci_no"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2"
          >
            <Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Password
          </label>
          <div className="relative">
            <input
              id="paci_no"
              type={showPaci ? 'text' : 'password'}
              inputMode="numeric"
              value={paciNo}
              onChange={e => setPaciNo(e.target.value)}
              className="w-full border border-border rounded-lg h-11 px-3 pr-11 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
              placeholder="Enter your PACI number"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPaci(prev => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPaci ? 'Hide PACI number' : 'Show PACI number'}
            >
              {showPaci ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 italic">
            Use your house PACI number as your password
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg h-11 font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <LumaSpin size={24} />
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
