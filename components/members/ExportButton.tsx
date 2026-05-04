'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  filters: Record<string, string | undefined>
}

export function ExportButton({ filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    const params = new URLSearchParams(
      Object.entries(filters).filter((e): e is [string, string] => e[1] !== undefined)
    )
    window.location.href = `/api/export/members?${params.toString()}`
    setTimeout(() => setLoading(false), 2500)
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export Excel
        </>
      )}
    </button>
  )
}
