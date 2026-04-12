import { FillerAccess } from '@/lib/types/forms'
import { SessionUser } from '@/lib/types/app'

export function isAuthorizedFiller(filler_access: FillerAccess, session: SessionUser): boolean {
  for (const f of filler_access.fillers) {
    if (f.type === 'role' && f.value === session.role) return true
    if (f.type === 'specific_masool' && f.value.includes(String(session.its_no))) return true
    if (f.type === 'specific_musaid' && f.value.includes(String(session.its_no))) return true
    if (f.type === 'self' && session.role === 'Mumin') return true
  }
  return false
}
