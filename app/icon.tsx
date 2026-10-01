import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f1a',
          borderRadius: '20%',
          border: '24px solid #c8a951',
        }}
      >
        <div style={{ fontSize: 300, color: '#c8a951' }}>⚔</div>
      </div>
    ),
    { ...size }
  );
}
