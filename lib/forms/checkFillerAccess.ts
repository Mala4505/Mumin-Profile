import { FillerAccess } from '@/lib/types/forms'
import { SessionUser } from '@/lib/types/app'

export function isAuthorizedFiller(filler_access: FillerAccess, session: SessionUser): boolean {
  // SuperAdmin / Admin are global-scope roles — they can always bulk-fill any form,
  // whether or not the form creator ticked their box in the access step. The audience
  // and existing-values routes already treat them this way (isAdmin short-circuit);
  // this keeps the fill page and respond route consistent.
  if (session.role === 'SuperAdmin' || session.role === 'Admin') return true

  for (const f of filler_access.fillers) {
    if (f.type === 'role' && f.value === session.role) return true
    if (f.type === 'specific_masool' && f.value.includes(String(session.its_no))) return true
    if (f.type === 'specific_musaid' && f.value.includes(String(session.its_no))) return true
    if (f.type === 'self' && session.role === 'Mumin') return true
    if (f.type === 'hof' && session.is_hof) return true
  }
  return false
}
