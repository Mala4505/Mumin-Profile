import { createClient } from '@/lib/supabase/server'
import type { SessionUser, AppMetadata } from '@/lib/types/app'

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient()

  // getUser() makes a server-side request to validate the token — required for security.
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Our custom_access_token_hook injects role/its_no/etc. into the JWT's app_metadata
  // claim. However, supabase.auth.getUser() returns raw_app_meta_data from the database
  // (not the JWT claims), so those fields would be missing if read from user.app_metadata.
  // We decode the JWT directly to read the hook-injected claims.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null

  // Decode JWT payload (base64url segment → JSON)
  const payloadB64 = session.access_token.split('.')[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
  const meta = (payload.app_metadata ?? {}) as AppMetadata

  return {
    supabase_auth_id: user.id,
    its_no: meta.its_no,
    role: meta.role,
    sector_ids: meta.sector_ids ?? [],
    subsector_ids: meta.subsector_ids ?? [],
    must_change_password: meta.must_change_password ?? false,
  }
}
