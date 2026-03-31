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
  ShieldCheck,
  KeyRound,
  ArrowRightCircle,
} from 'lucide-react'
import { LumaSpin } from '@/components/ui/luma-spin'

type Step = 'verifying' | 'signing-in' | 'redirecting' | null

const STEP_LABELS: Record<NonNullable<Step>, { icon: React.ReactNode; text: string }> = {
  verifying: {
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    text: 'Verifying credentials...',
  },
  'signing-in': {
    icon: <KeyRound className="w-3.5 h-3.5" />,
    text: 'Signing in...',
  },
  redirecting: {
    icon: <ArrowRightCircle className="w-3.5 h-3.5" />,
    text: 'Redirecting to dashboard...',
  },
}

export function LoginForm() {
  const router = useRouter()
  const [itsNo, setItsNo] = useState('')
  const [paciNo, setPaciNo] = useState('')
  const [showPaci, setShowPaci] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>(null)

  const loading = step !== null

  async function handleSubmit() {
    setError('')

    try {
      // Step 1 — validate ITS + PACI server-side
      setStep('verifying')
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ its_no: itsNo, paci_no: paciNo }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Invalid ITS No or password. Please try again.')
        setStep(null)
        return
      }

      // Step 2 — sign in with derived credentials
      setStep('signing-in')
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Sign in failed. Please try again.')
        setStep(null)
        return
      }

      // Step 3 — redirect
      setStep('redirecting')
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setStep(null)
    }
  }

  const currentStep = step ? STEP_LABELS[step] : null

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Sign In</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Enter your ITS number and password
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6" noValidate>
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
            disabled={loading}
            className="w-full border border-border rounded-lg h-11 px-3 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="e.g. 10000001"
            required
            autoFocus
            autoComplete="username"
          />
        </div>

        {/* Password (PACI) */}
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
              disabled={loading}
              className="w-full border border-border rounded-lg h-11 px-3 pr-11 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your PACI number"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPaci(prev => !prev)}
              disabled={loading}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none"
              aria-label={showPaci ? 'Hide password' : 'Show password'}
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
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg h-11 font-semibold hover:opacity-90 disabled:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <LumaSpin size={22} color="#0F172A" />
          ) : (
            <>
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Sign In
            </>
          )}
        </button>

        {/* Step indicator */}
        {currentStep && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
            {currentStep.icon}
            <span>{currentStep.text}</span>
          </div>
        )}
      </form>
    </div>
  )
}
