interface LogoProps {
  collapsed?: boolean
}

export function Logo({ collapsed = false }: LogoProps) {
  return (
    <div className="flex items-center" style={{ gap: collapsed ? 0 : 10 }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="#6366f1" />
        <path d="M8 10h16l-5.5 7v5l-5-2.2V17L8 10z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>

      {!collapsed && (
        <span style={{ fontSize: 16, letterSpacing: '-0.3px', lineHeight: 1 }}>
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>Funnel</span>
          <span style={{ fontWeight: 600, color: '#a5b4fc' }}>deck</span>
        </span>
      )}
    </div>
  )
}
