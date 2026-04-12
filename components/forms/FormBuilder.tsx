'use client'

import { useState } from 'react'
import { FormQuestion, FillerAccess, AudienceFilters } from '@/lib/types/forms'
import type { Role } from '@/lib/types/app'
import { Step1BasicInfo } from './steps/Step1BasicInfo'
import { Step2Audience } from './steps/Step2Audience'
import { Step3Questions } from './steps/Step3Questions'
import { Step4Access } from './steps/Step4Access'
import { Step5Review } from './steps/Step5Review'

export interface FormDraft {
  title: string
  description: string
  umoor_category_id: string
  form_type: 'simple' | 'detailed'
  questions: FormQuestion[]
  audience_filters: AudienceFilters
  filler_access: FillerAccess
  expires_at: string
}

const STEPS = ['Basic Info', 'Audience', 'Questions', 'Access', 'Review']

export function FormBuilder({ onComplete, role }: { onComplete: () => void; role: Role }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Partial<FormDraft>>({})

  const update = (patch: Partial<FormDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-xs py-1.5 rounded font-medium transition-colors ${
              i === step
                ? 'bg-primary text-primary-foreground'
                : i < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </div>
        ))}
      </div>

      {step === 0 && <Step1BasicInfo draft={draft} update={update} onNext={next} />}
      {step === 1 && <Step2Audience draft={draft} update={update} onNext={next} onBack={back} />}
      {step === 2 && <Step3Questions draft={draft} update={update} onNext={next} onBack={back} />}
      {step === 3 && <Step4Access draft={draft} update={update} onNext={next} onBack={back} />}
      {step === 4 && <Step5Review draft={draft} onBack={back} onComplete={onComplete} role={role} />}
    </div>
  )
}
