import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Query & Buy — AI marketplace for the UAE'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Brand OpenGraph/social-share image, generated at the edge. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f241c',
          color: '#f6f8f7',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: '12px solid #1c3d30',
              background: '#f6f8f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1c3d30',
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            Q&amp;B
          </div>
          <div style={{ fontSize: 92, fontWeight: 600, letterSpacing: -2 }}>Query &amp; Buy</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: '#b9c7bf', fontFamily: 'Helvetica, sans-serif' }}>
          AI marketplace for the UAE
        </div>
      </div>
    ),
    { ...size },
  )
}
