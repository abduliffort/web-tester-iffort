import React, { useMemo } from "react";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";

interface SpeedGaugeProps {
  currentSpeed: number;
  maxSpeed?: number;
  label: string;
  description?: string;
}

// Helper: Move outside component to avoid recreation
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
};

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  currentSpeed,
  maxSpeed = 100,
  label,
  description, // kept if you want to use it later
}) => {
  // 1. Memoize display logic
  const { valueDisplay, unit } = useMemo(() => {
    const isLatency =
      label?.includes("Latency") ||
      label?.includes("Load") ||
      label?.includes("Streaming");

    return {
      valueDisplay: currentSpeed.toFixed(isLatency ? 0 : 2),
      unit: isLatency ? "ms" : "Mbps",
    };
  }, [currentSpeed, label]);

  // clamp the value so Gauge arc never exceeds the configured range
  const clampedValue = useMemo(
    () => Math.max(0, Math.min(currentSpeed, maxSpeed)),
    [currentSpeed, maxSpeed]
  );

  // 2. Configuration for Geometry (Normalized to a 200x200 box)
  const CX = 100;
  const CY = 125;
  const RADIUS = 80; // Fits inside 200x200 nicely
  const START_ANGLE = -120;
  const END_ANGLE = 120;

  // 3. Generate Ticks (Memoized)
  const ticks = useMemo(() => {
    const totalTicks = 10;
    return Array.from({ length: totalTicks + 1 }, (_, i) => {
      // Interpolate angle
      const angle = START_ANGLE + (i / totalTicks) * (END_ANGLE - START_ANGLE);

      // Calculate positions relative to CX, CY
      const outer = polarToCartesian(CX, CY, RADIUS + 10, angle);
      const inner = polarToCartesian(CX, CY, RADIUS + 2, angle);

      // Text position (slightly further out)
      const textPos = polarToCartesian(CX, CY, RADIUS - 10, angle);

      const labelValue = (i * (maxSpeed / totalTicks)).toFixed(0);

      return {
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
        tx: textPos.x,
        ty: textPos.y,
        labelValue,
        showLabel: i % 2 === 0, // Show every other label
      };
    });
  }, [maxSpeed]);

  return (
    <div className="flex flex-col items-center justify-center w-full relative max-sm:mt-[2.5rem]">
      {/* Container for the Gauge + Overlays 
        Using aspect-ratio ensures the SVG overlay and the MUI Canvas 
        scale at the exact same rate.
      */}
      <div className="absolute right-0 top-[45%] h-[55%] w-[2px] bg-white mr-4 hidden sm:block " />
      <div className="relative w-full max-w-[450px] max-md:max-w-[310px] aspect-[1/0.8]">
        {/* MUI Gauge */}
        <Gauge
          value={clampedValue} // <-- use clamped value here
          valueMin={0}
          valueMax={maxSpeed}
          startAngle={START_ANGLE}
          endAngle={END_ANGLE}
          sx={{
            width: "100% !important", // Force fit container
            height: "100% !important",
            [`& .${gaugeClasses.valueText}`]: {
              fontSize: "clamp(1rem, 5vw, 1.5rem)", // Responsive font
              fontWeight: 700,
              transform: "translate(0px, -10px)", // Nudge up slightly
            },
            [`& .${gaugeClasses.valueText} text`]: {
              fill: "#ffffff !important",
            },
            [`& .${gaugeClasses.valueArc}`]: {
              fill: "#4FAEAF",
            },
            [`& .${gaugeClasses.referenceArc}`]: {
              fill: "#e5e7eb",
            },
          }}
          text={() => valueDisplay}
        />

        {/* SVG Overlay (Ticks & Decor) - Absolutely positioned over Gauge */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 200 200"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Ticks */}
          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="#e5e7eb"
                strokeOpacity="0.3"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {tick.showLabel && (
                <text
                  x={tick.tx}
                  y={tick.ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#9ca3af"
                  fontSize="10"
                  fontWeight="500"
                >
                  {tick.labelValue}
                </text>
              )}
            </g>
          ))}

          {/* Decorative Inner Arc (Under Text) */}
          <path
            d={describeArc(CX, CY, 45, -120, 120)}
            fill="none"
            stroke="#ffffff"
            // strokeOpacity="0.3"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`translate(0, 10)`} // Minor visual nudge
          />
        </svg>

        {/* Unit Label (Positioned via CSS grid/flex logic relative to container) */}
        <div className="absolute bottom-[20%] left-0 w-full text-center pointer-events-none">
          <span className="text-white font-semibold text-sm sm:text-[13px]">
            {unit}
          </span>
        </div>
      </div>

      {/* Divider Line (Refactored)
       */}
      {/* <hr className="text-white bg-white" /> */}
      <hr className="w-full block sm:hidden" />
    </div>
  );
};
