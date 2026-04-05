import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { importCoreMembers } from '@/lib/import/importCoreMembers'

export const maxDuration = 300 // seconds (Vercel max for streaming)

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (session.role !== 'SuperAdmin') {
    return new Response(JSON.stringify({ error: 'Only SuperAdmin can run core imports' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!file.name.endsWith('.csv')) {
    return new Response(JSON.stringify({ error: 'File must be a CSV' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createAdminClient()
  const csvText = await file.text()
  const filename = file.name
  const importerIts = session.its_no

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const result = await importCoreMembers(csvText, filename, importerIts, send)

        // Log activity after import completes
        await admin.from('activity_log').insert({
          performed_by_its: importerIts,
          action: 'csv_import',
          entity_type: 'import_log',
          entity_id: String(result.importLogId),
          metadata: { filename, status: result.status, total: result.totalRows },
        })
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
