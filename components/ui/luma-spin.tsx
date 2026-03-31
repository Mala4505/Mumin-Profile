interface LumaSpinProps {
  size?: number
  color?: string
}

export function LumaSpin({ size = 65, color = '#F59E0B' }: LumaSpinProps) {
  return (
    <div
      className="relative aspect-square"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <span
        className="absolute rounded-[50px] luma-blade"
        style={{ boxShadow: `inset 0 0 0 3px ${color}` }}
      />
      <span
        className="absolute rounded-[50px] luma-blade-delayed"
        style={{ boxShadow: `inset 0 0 0 3px ${color}` }}
      />
    </div>
  )
}
