import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Masool/Musaid System',
  description: 'Mufaddal Mohallah Kuwait',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
