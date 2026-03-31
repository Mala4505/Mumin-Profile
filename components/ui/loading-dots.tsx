interface LoadingDotsProps {
  size?: number
  color?: string
  children?: React.ReactNode
}

const delays = ['0s', '0.2s', '0.4s']

export function LoadingDots({ size = 4, color = 'currentColor', children }: LoadingDotsProps) {
  return (
    <span className="inline-flex items-center">
      {children && <span className="mr-2">{children}</span>}
      {delays.map((delay, i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            height: size,
            width: size,
            marginLeft: i > 0 ? size * 0.75 : 0,
            backgroundColor: color,
            animation: `loading 1.4s linear infinite`,
            animationDelay: delay,
          }}
        />
      ))}
    </span>
  )
}
