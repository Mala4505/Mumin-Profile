import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSession } from '@/lib/auth/getSession'
import { ImportForm } from '@/components/import/ImportForm'
import { FormImportSection } from '@/components/import/FormImportSection'
import { CoreImportSection } from '@/components/import/CoreImportSection'

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex items-start gap-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0 mt-0.5">
          {step}
        </span>
        <div>
          <h2 className="font-semibold text-base leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  )
}

export default async function ImportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'Mumin') redirect('/members')

  const showCore = session.role === 'SuperAdmin'
  const showForms = (['SuperAdmin', 'Admin', 'Masool'] as string[]).includes(session.role)

  const profileStep = showCore ? 2 : 1
  const formStep = showCore ? 3 : 2

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload CSV files to bulk-import data into the system.
        </p>
      </div>

      {showCore && (
        <StepCard
          step={1}
          title="Core Mumin Import"
          description="Upload the full mumin CSV to upsert members, houses, families, sectors, and subsectors in one pass. Processes 500 records per batch with live progress logs."
        >
          <CoreImportSection />
        </StepCard>
      )}

      <StepCard
        step={profileStep}
        title="Member & Profile Data"
        description="Import core member records and profile field values using a table-based CSV upload."
      >
        <ImportForm />
      </StepCard>

      {showForms && (
        <StepCard
          step={formStep}
          title="Form Response Data"
          description="Bulk-import CSV responses into a published form. Static answers update member profiles permanently; historical answers appear in profile timelines."
        >
          <FormImportSection />
        </StepCard>
      )}
    </div>
  )
}
