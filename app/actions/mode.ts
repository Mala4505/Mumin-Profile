'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const OPTS = { httpOnly: true, path: '/', sameSite: 'lax' as const, maxAge: 86400 }

export async function switchToUserView() {
  (await cookies()).set('login_mode', 'user', OPTS)
  redirect('/dashboard')
}

export async function switchToAdminView() {
  (await cookies()).delete('login_mode')
  redirect('/dashboard')
}