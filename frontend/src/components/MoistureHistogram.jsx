// Moisture Distribution Chart Component
import React from 'react';

export default function MoistureHistogram({ distribution = [] }) {
  if (!distribution || distribution.length === 0) {
    return <div style={{ color: '#72837F', fontSize: '0.85rem' }}>No data available.</div>;
  }

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  // Color mapping based on agricultural urgency
  const getBarColor = (range) => {
    switch (range) {
      case '0-20%':
        return '#9B2C2C'; // Severe stress
      case '20-40%':
        return '#C05621'; // Low moisture
      case '40-60%':
        return '#B7791F'; // Moderate
      case '60-80%':
        return '#2E6F54'; // Adequate
      case '80-100%':
        return '#1E423B'; // High moisture
      default:
        return '#E5C690';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '170px', padding: '10px 0 20px 0' }}>
        {distribution.map((bucket, idx) => {
          const heightPercent = (bucket.count / maxCount) * 100;
          const barColor = getBarColor(bucket.range);

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-forest)', marginBottom: '4px' }}>
                {bucket.count}
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(heightPercent, 4)}%`,
                  backgroundColor: barColor,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.4s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                }}
                title={`${bucket.label}: ${bucket.count} plots`}
              />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#657874',
                  marginTop: '8px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {bucket.range}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.7rem', color: '#556B65' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#9B2C2C' }}></span>
          Severe (&lt;20%)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#C05621' }}></span>
          Low (20-40%)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#B7791F' }}></span>
          Moderate (40-60%)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#2E6F54' }}></span>
          Adequate (&gt;60%)
        </span>
      </div>
    </div>
  );
}
