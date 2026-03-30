import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const umoor = [
    'Deeniyah', 'Talimiyah', 'Kharejiyah', 'Dakheliyah',
    'Sehhat', 'Faizul Mawaidil Burhaniyah',
    'Mawarid Bashariyah', 'Iqtesaadiyah',
    'Maliyah', 'Amlaak', 'Marafiq Burhaniyah', 'Qaza',
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — decorative, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy flex-col justify-between p-12 relative overflow-hidden">
        {/* Top: branding */}
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">Mumin System</div>
          <div className="text-white/60 text-sm mt-1">Dawoodi Bohra Community Register</div>
        </div>

        {/* Middle: decorative statement */}
        <div>
          {/* Amber accent line */}
          <div className="w-12 h-1 bg-amber-400 rounded mb-6" aria-hidden="true" />
          <h2 className="text-white text-3xl font-bold leading-tight mb-3">
            Community Management<br />System
          </h2>
          <p className="text-white/60 text-base">
            Dawoodi Bohra Community Register
          </p>

          {/* Decorative stacked lines */}
          <div className="flex flex-col gap-2 mt-8" aria-hidden="true">
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/20 flex-1" />
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/5 flex-1" />
              <div className="w-1 h-1 rounded-full bg-amber-400/30" />
            </div>
          </div>
        </div>

        {/* Bottom: 12 Umoor grid — 2 columns */}
        <div className="grid grid-cols-2 gap-2" aria-label="Departments">
          {umoor.map(u => (
            <div
              key={u}
              className="flex items-center gap-2 text-white/70 bg-white/[0.08] rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              {u}
            </div>
          ))}
        </div>

        {/* Subtle amber glow at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-amber-400/5 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile: show app name + subtitle */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-bold text-navy">Mumin System</div>
            <div className="text-muted-foreground text-sm mt-1">
              Dawoodi Bohra Community Register
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
