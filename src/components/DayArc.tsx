import React, { useMemo } from 'react';

interface DayArcProps {
  theme?: 'day' | 'night';
}

export const DayArc: React.FC<DayArcProps> = ({ theme = 'day' }) => {
  const arcData = useMemo(() => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const w = 340;
    const cx = 170;
    const cy = 86;
    const r = 78;

    const startAngle = 200;
    const endAngle = -20;
    const frac = Math.max(0, Math.min(1, hours / 24));
    const angle = startAngle + (endAngle - startAngle) * frac;
    const rad = (angle * Math.PI) / 180;
    const px = cx + r * Math.cos(rad);
    const py = cy - r * Math.sin(rad) * 0.62;

    const pointAt = (fracV: number): [number, number] => {
      const a = startAngle + (endAngle - startAngle) * fracV;
      const rr = (a * Math.PI) / 180;
      return [cx + r * Math.cos(rr), cy - r * Math.sin(rr) * 0.62];
    };

    const p0 = pointAt(0);
    const p1 = pointAt(1);
    const path = `M${p0[0]},${p0[1]} Q ${cx},-10 ${p1[0]},${p1[1]}`;

    const isNightTime = hours < 6 || hours > 20.5;
    const bodyColor = isNightTime ? '#E5A95A' : hours < 10 ? '#E28E58' : hours < 17 ? '#4FA98A' : '#D97C6C';
    const bodySymbol = isNightTime ? '☾' : '☀';

    const labels = [
      { t: 0.06, l: '06h' },
      { t: 0.31, l: '12h' },
      { t: 0.56, l: '18h' },
      { t: 0.81, l: '24h' },
    ].map(lp => {
      const p = pointAt(lp.t);
      return { x: p[0], y: p[1] + 16, label: lp.l };
    });

    return {
      px,
      py,
      path,
      bodyColor,
      bodySymbol,
      labels,
    };
  }, []);

  return (
    <div className="w-full flex justify-center select-none py-1">
      <svg
        viewBox="0 0 340 92"
        className="w-full max-w-[340px] h-[78px] overflow-visible"
        aria-hidden="true"
      >
        {/* Track path */}
        <path
          d={arcData.path}
          fill="none"
          stroke={theme === 'night' ? 'rgba(111,227,196,0.2)' : 'rgba(47,111,94,0.18)'}
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Hour labels */}
        {arcData.labels.map(({ x, y, label }) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            fill={theme === 'night' ? '#96A8A0' : '#8C8672'}
            fontSize="9.5"
            fontWeight="500"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}

        {/* Orbiting Celestial Body (Sun/Moon) */}
        <g transform={`translate(${arcData.px}, ${arcData.py})`}>
          {/* Subtle glow */}
          <circle
            r="12"
            fill={arcData.bodyColor}
            opacity="0.25"
            className="animate-pulse"
          />
          <circle
            r="8.5"
            fill={arcData.bodyColor}
            stroke={theme === 'night' ? '#111714' : '#F7F4EC'}
            strokeWidth="1.5"
          />
          <text
            y="3.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="bold"
          >
            {arcData.bodySymbol}
          </text>
        </g>
      </svg>
    </div>
  );
};
