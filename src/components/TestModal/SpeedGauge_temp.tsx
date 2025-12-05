import React from 'react';

interface SpeedGaugeProps {
  currentSpeed: number;
  maxSpeed?: number;
  label: string;
  description?: string;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ 
  currentSpeed, 
  maxSpeed = 300, 
  label,
  description 
}) => {
  // Calculate needle angle (0-180 degrees for semicircle)
  const angle = Math.min((currentSpeed / maxSpeed) * 180, 180);
  
  // Calculate progress percentage for the arc
  const progressPercentage = Math.min((currentSpeed / maxSpeed) * 100, 100);
  
  // Determine speed unit and format
  const getSpeedDisplay = () => {
    if (label?.includes('Latency') || label?.includes('Load') || label?.includes('Streaming')) {
      return { value: currentSpeed.toFixed(0), unit: 'ms' };
    }
    return { value: currentSpeed.toFixed(2), unit: 'Mbps' };
  };
  
  const { value, unit } = getSpeedDisplay();

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto">
      {/* SVG Speedometer */}
      <div className="relative w-full aspect-square max-w-[240px]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 30 150 A 70 70 0 0 1 170 150"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="18"
            strokeLinecap="round"
          />
          
          {/* Progress arc with gradient */}
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          
          <path
            d="M 30 150 A 70 70 0 0 1 170 150"
            fill="none"
            stroke="url(#speedGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset={220 - (220 * progressPercentage) / 100}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          
          {/* Center dot */}
          <circle cx="100" cy="150" r="6" fill="#1f2937" />
          
          {/* Needle */}
          <line
            x1="100"
            y1="150"
            x2="100"
            y2="92"
            stroke="#1f2937"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              transformOrigin: '100px 150px',
              transform: `rotate(${angle - 90}deg)`,
              transition: 'transform 0.5s ease'
            }}
          />
          
          {/* Scale markers */}
          {[0, 45, 90, 135, 180].map((deg) => (
            <line
              key={deg}
              x1={100 + 56 * Math.cos((deg - 90) * Math.PI / 180)}
              y1={150 + 56 * Math.sin((deg - 90) * Math.PI / 180)}
              x2={100 + 64 * Math.cos((deg - 90) * Math.PI / 180)}
              y2={150 + 64 * Math.sin((deg - 90) * Math.PI / 180)}
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </svg>
        
        {/* Speed value display */}
        <div className="absolute top-[58%] left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-3xl font-bold text-gray-900 leading-none">
            {value}
          </div>
          <div className="text-xs font-medium text-gray-500 mt-1">
            {unit}
          </div>
        </div>
        
        {/* Min/Max labels */}
        <div className="absolute bottom-7 left-3 text-[10px] text-gray-400 font-medium">0</div>
        <div className="absolute bottom-7 right-3 text-[10px] text-gray-400 font-medium">{maxSpeed}</div>
      </div>
      
      {/* Label */}
      <div className="mt-3 text-center px-2">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
};
