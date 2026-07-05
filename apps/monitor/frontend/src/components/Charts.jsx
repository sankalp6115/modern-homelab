import React from 'react';
import "./../styles/style.css"
// Custom SVG Sparkline for real-time history curves
export const Sparkline = ({
  data = [],
  strokeColor = '#00f2fe',
  gradientId = 'sparkline-grad',
  max = 100
}) => {
  const width = 300;
  const height = 90;
  const padding = 5;

  if (!data || data.length < 2) {
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <text x="50%" y="50%" textAnchor="middle" fill="#64748b" fontSize="12">
          Awaiting stats...
        </text>
      </svg>
    );
  }

  // Determine points coordinates
  const activeWidth = width - padding * 2;
  const activeHeight = height - padding * 2;
  const xStep = activeWidth / (data.length - 1);

  const points = data.map((val, idx) => {
    const x = padding + idx * xStep;
    // Scale y coordinates: 0 is at bottom (y=height), max is at top (y=0)
    const normalizedVal = Math.min(Math.max(val, 0), max);
    const y = padding + activeHeight - (normalizedVal / max) * activeHeight;
    return { x, y };
  });

  // Generate path string (simple line path or smooth bezier)
  const linePath = points.reduce((pathStr, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${pathStr} L ${p.x} ${p.y}`;
  }, '');

  // Generate closed path for gradient fill
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const fillPath = `${linePath} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
        </linearGradient>
      </defs>

      {/* Area Fill */}
      <path d={fillPath} fill={`url(#${gradientId})`} />

      {/* Stroke Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulsing indicator on the latest point */}
      {points.length > 0 && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="4"
          fill={strokeColor}
          style={{ filter: 'drop-shadow(0px 0px 4px ' + strokeColor + ')' }}
        />
      )}
    </svg>
  );
};

// Custom Radial Gauge Chart
export const CircularProgress = ({
  percent = 0,
  size = 120,
  strokeWidth = 10,
  color = '#00f2fe',
  label = '%'
}) => {
  const roundedPercent = Math.round(percent);
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  // Calculate offset (invert to make it fill clockwise starting from top)
  const offset = circumference - (Math.min(Math.max(roundedPercent, 0), 100) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4facfe" />
            <stop offset="100%" stopColor="#00f2fe" />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={color === '#00f2fe' ? 'url(#circleGrad)' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      {/* Center Label */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: size > 100 ? '1.5rem' : '1.1rem',
          fontWeight: 700,
          color: '#f8fafc',
          lineHeight: 1
        }}>
          {roundedPercent}
        </span>
        <span style={{
          fontSize: '0.68rem',
          color: '#64748b',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginTop: 2
        }}>
          {label}
        </span>
      </div>
    </div>
  );
};
