import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { AppMetadata } from '@/lib/types/app'

function decodeJwtAppMetadata(accessToken: string): Partial<AppMetadata> {
  try {
    const payloadB64 = accessToken.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
    return (payload.app_metadata ?? {}) as AppMetadata
  } catch {
    return {}
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and getUser().
  // This call refreshes the session and writes updated tokens back to cookies.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isChangePasswordRoute = pathname.startsWith('/change-password')
  const isPublicApiRoute = pathname.startsWith('/api/auth/')

  // Redirect unauthenticated users to login
  if (!user && !isLoginRoute && !isChangePasswordRoute && !isPublicApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Our custom_access_token_hook injects role/its_no into JWT app_metadata claims.
    // user.app_metadata from getUser() is raw_app_meta_data (database), not JWT claims.
    // Use getSession() to get the access token and decode it for the hook-injected claims.
    const { data: { session } } = await supabase.auth.getSession()
    const appMeta = session?.access_token
      ? decodeJwtAppMetadata(session.access_token)
      : {}

    // Force password change if flagged in JWT
    if (appMeta.must_change_password && !isChangePasswordRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/change-password'
      return NextResponse.redirect(url)
    }

    // Role-based route protection
    const role = appMeta.role
    // /admin pages: SuperAdmin only
    if (pathname.startsWith('/admin') && role !== 'SuperAdmin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // /import pages: all staff except Mumin
    if (pathname.startsWith('/import') && role === 'Mumin') {
      const url = request.nextUrl.clone()
      url.pathname = '/members'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
