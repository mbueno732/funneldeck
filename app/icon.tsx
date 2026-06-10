import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#6366f1',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
          <path d="M8 10h16l-5.5 7v5l-5-2.2V17L8 10z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
