interface StatusBadgeProps {
  valor: string
  cor?: string | null
  size?: 'sm' | 'md'
}

export function StatusBadge({ valor, cor, size = 'sm' }: StatusBadgeProps) {
  const bg     = cor ? `${cor}22` : '#6b728022'
  const text   = cor ?? '#9ca3af'
  const border = cor ? `${cor}44` : '#6b728044'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
      style={{ backgroundColor: bg, color: text, border: `1px solid ${border}` }}
    >
      {valor}
    </span>
  )
}
