'use client'

import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormFieldMeta {
  caption: string
  behavior: 'static' | 'historical'
  field_type: string
  is_required: boolean
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

interface FormOption {
  id: string
  title: string
  event_id: number | null
}

export function FormImportSection() {
  const [forms, setForms] = useState<FormOption[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [formFields, setFormFields] = useState<FormFieldMeta[]>([])
  const [eventTitle, setEventTitle] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then((data) => {
        const published = (data.forms ?? []).filter(
          (f: any) => f.status === 'published'
        ) as FormOption[]
        setForms(published)
      })
  }, [])

  const handleFormSelect = useCallback(async (formId: string) => {
    setSelectedFormId(formId)
    setFormFields([])
    setEventTitle(null)
    setFile(null)
    setRowCount(null)
    setParseError(null)
    setResult(null)
    setImportError(null)

    const fieldsRes = await fetch(`/api/forms/${formId}/fields`)
    const fieldsData = await fieldsRes.json()
    const fields: FormFieldMeta[] = (fieldsData.fields ?? []).map((f: any) => ({
      caption: f.profile_field.caption,
      behavior: f.profile_field.behavior,
      field_type: f.profile_field.field_type,
      is_required: f.is_required,
    }))
    setFormFields(fields)

    const selectedForm = forms.find((f) => f.id === formId)
    if (selectedForm?.event_id) {
      const eventsRes = await fetch('/api/events')
      const eventsData = await eventsRes.json()
      const event = (eventsData.events ?? []).find(
        (e: any) => e.id === selectedForm.event_id
      )
      setEventTitle(event?.title ?? null)
    }
  }, [forms])

  const handleDownloadTemplate = useCallback(() => {
    const headers = ['its_no', ...formFields.map((f) => f.caption), 'remarks']
    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [formFields])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setRowCount(null)
    setParseError(null)
    setResult(null)
    setImportError(null)
    if (!f) return

    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (parsed) => {
        const dataRows = Math.max(0, (parsed.data as string[][]).length - 1)
        setRowCount(dataRows)
      },
      error: () => {
        setParseError('Could not parse file — ensure it is a valid CSV.')
      },
    })
  }, [])

  const handleImport = useCallback(async () => {
    if (!selectedFormId || !file || !rowCount) return
    setImporting(true)
    setResult(null)
    setImportError(null)

    const fd = new FormData()
    fd.append('form_id', selectedFormId)
    fd.append('file', file)

    const res = await fetch('/api/forms/import', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      const errMsg = data.error ?? (data.errors?.length ? data.errors.join('; ') : 'Import failed')
      setImportError(errMsg)
    } else {
      setResult(data as ImportResult)
    }
    setImporting(false)
  }, [selectedFormId, file, rowCount])

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Form Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Form</label>
        <Select
          value={selectedFormId}
          onValueChange={handleFormSelect}
          disabled={forms.length === 0}
        >
          <SelectTrigger className="w-72">
            <SelectValue
              placeholder={
                forms.length === 0
                  ? 'No published forms available'
                  : 'Select a form'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {forms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Publish a form first before importing responses.
          </p>
        )}
      </div>

      {/* Column Guide */}
      {selectedFormId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Column Guide</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={formFields.length === 0}
            >
              Download Template
            </Button>
          </div>

          {formFields.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
              This form has no questions yet. Add questions via the Form Builder before importing.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Column</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">its_no</td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5">Required</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Member ITS number</td>
                  </tr>
                  {formFields.map((f) => (
                    <tr key={f.caption} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{f.caption}</td>
                      <td className="px-3 py-2">
                        {f.behavior === 'static' ? (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Profile</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Timeline</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {f.behavior === 'static'
                          ? 'Static — updates member profile permanently'
                          : 'Historical — shows in profile timeline'}
                        {f.is_required && (
                          <span className="ml-1 text-xs text-red-600">(required)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">remarks</td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">Optional</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Note applied to all answers for this member row</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Event context note */}
          {eventTitle && (
            <div className="text-sm text-muted-foreground bg-muted/30 border rounded p-3">
              Responses will be linked to event: <strong>{eventTitle}</strong>.
              Historical fields will appear in member profile timelines under this event.
            </div>
          )}
        </div>
      )}

      {/* File Upload */}
      {selectedFormId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-muted"
          />
          {parseError && (
            <p className="text-sm text-red-600">{parseError}</p>
          )}
          {rowCount !== null && rowCount > 0 && !parseError && (
            <p className="text-sm text-green-700">
              ✓ {rowCount} {rowCount === 1 ? 'row' : 'rows'} detected
            </p>
          )}
          {rowCount === 0 && !parseError && (
            <p className="text-sm text-amber-700">
              CSV has no data rows — add at least one row before importing.
            </p>
          )}
        </div>
      )}

      {/* Error Banner */}
      {importError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {importError}
        </div>
      )}

      {/* Import Button */}
      {selectedFormId && (
        <Button
          onClick={handleImport}
          disabled={!file || !rowCount || rowCount === 0 || importing}
        >
          {importing ? 'Importing...' : 'Import Responses'}
        </Button>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg border p-4 bg-muted space-y-2">
          <p className="font-medium text-sm">Import Complete</p>
          <p className="text-sm">
            Succeeded: {result.success} · Failed: {result.failed}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-xs space-y-1 overflow-y-auto max-h-[200px] text-red-700">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
