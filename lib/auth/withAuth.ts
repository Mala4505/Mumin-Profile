import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { resolveScope, resolveUmoorScope } from '@/lib/auth/resolveScope'
import type { SessionUser, Role } from '@/lib/types/app'

export interface AuthContext {
  session: SessionUser
  /** null = unrestricted (SuperAdmin/Admin). number[] = allowed subsector_ids. */
  scopedSubsectorIds: number[] | null
  /** null = unrestricted (all roles except UmoorCoordinator). number[] = allowed profile_category ids. */
  scopedCategoryIds: number[] | null
}

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
  routeCtx?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

export function withAuth(allowedRoles: Role[], handler: AuthHandler) {
  return async function (
    req: NextRequest,
    routeCtx?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const scopedSubsectorIds = await resolveScope(session)
    const scopedCategoryIds = resolveUmoorScope(session)
    return handler(req, { session, scopedSubsectorIds, scopedCategoryIds }, routeCtx)
  }
}
