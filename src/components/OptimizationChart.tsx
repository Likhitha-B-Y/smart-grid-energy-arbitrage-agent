import React, { useState } from 'react';
import { HourlyEnergyPoint } from '../types/energy';

interface OptimizationChartProps {
  points: HourlyEnergyPoint[];
  currentHour: number;
  onSelectHour: (hour: number) => void;
}

export const OptimizationChart: React.FC<OptimizationChartProps> = ({
  points,
  currentHour,
  onSelectHour,
}) => {
  const [showSolar, setShowSolar] = useState(true);
  const [showDemand, setShowDemand] = useState(true);
  const [showSoc, setShowSoc] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  // Chart dimensions
  const width = 800;
  const height = 280;
  const padding = { top: 25, right: 45, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max scales
  const maxKw = Math.max(
    8,
    ...points.map((p) => Math.max(p.solarKw, p.demandKw, p.agent.batteryChargeKw, p.agent.batteryDischargeKw))
  );
  const maxPrice = Math.max(0.4, ...points.map((p) => p.importPrice));
  const minPrice = Math.min(0, ...points.map((p) => p.importPrice));

  const getX = (hour: number) => padding.left + (hour / 23) * chartW;
  const getYKw = (val: number) => padding.top + chartH - (Math.max(0, val) / maxKw) * chartH;
  const getYSoc = (val: number) => padding.top + chartH - (Math.max(0, Math.min(100, val)) / 100) * chartH;
  const getYPrice = (val: number) => {
    const range = maxPrice - minPrice || 0.1;
    return padding.top + chartH - ((val - minPrice) / range) * chartH;
  };

  // Build SVG path strings
  const buildPath = (valFn: (p: HourlyEnergyPoint) => number, yFn: (v: number) => number) => {
    return points
      .map((p, idx) => {
        const x = getX(p.hour);
        const y = yFn(valFn(p));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const solarPath = buildPath((p) => p.solarKw, getYKw);
  const demandPath = buildPath((p) => p.demandKw, getYKw);
  const socPath = buildPath((p) => p.agent.batterySocPct, getYSoc);
  const pricePath = buildPath((p) => p.importPrice, getYPrice);

  const activeHourIndex = hoverHour !== null ? hoverHour : currentHour;
  const activePoint = points[activeHourIndex] || points[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur flex flex-col">
      {/* Chart Header & Series Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            24-Hour Horizon Dispatch & Multi-Variable Optimization
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any hour to scrub simulation • Synchronized price arbitrage & battery dynamics
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setShowSolar(!showSolar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showSolar
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Solar (kW)</span>
          </button>

          <button
            onClick={() => setShowDemand(!showDemand)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showDemand
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span>Demand (kW)</span>
          </button>

          <button
            onClick={() => setShowSoc(!showSoc)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showSoc
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Battery SOC (%)</span>
          </button>

          <button
            onClick={() => setShowPrice(!showPrice)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              showPrice
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <span>Tariff ($/kWh)</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const hour = Math.max(0, Math.min(23, Math.round(relX * 23)));
            setHoverHour(hour);
          }}
          onMouseLeave={() => setHoverHour(null)}
          onClick={() => {
            if (hoverHour !== null) onSelectHour(hoverHour);
          }}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + chartH * pct;
            return (
              <line
                key={idx}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Left Y-axis ticks (kW) */}
          <text x={padding.left - 8} y={padding.top + 5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {maxKw.toFixed(0)}kW
          </text>
          <text x={padding.left - 8} y={padding.top + chartH / 2} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {(maxKw / 2).toFixed(0)}kW
          </text>
          <text x={padding.left - 8} y={padding.top + chartH} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            0kW
          </text>

          {/* Right Y-axis ticks (SOC %) */}
          <text x={width - padding.right + 8} y={padding.top + 5} fill="#10b981" fontSize="10" textAnchor="start" fontFamily="monospace">
            100%
          </text>
          <text x={width - padding.right + 8} y={padding.top + chartH / 2} fill="#10b981" fontSize="10" textAnchor="start" fontFamily="monospace">
            50%
          </text>
          <text x={width - padding.right + 8} y={padding.top + chartH} fill="#10b981" fontSize="10" textAnchor="start" fontFamily="monospace">
            0%
          </text>

          {/* X-axis labels */}
          {[0, 4, 8, 12, 16, 20, 23].map((h) => (
            <text
              key={h}
              x={getX(h)}
              y={height - 10}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {h.toString().padStart(2, '0')}:00
            </text>
          ))}

          {/* Solar Area & Line */}
          {showSolar && (
            <>
              <path d={`${solarPath} L ${getX(23)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`} fill="url(#solarGrad)" />
              <path d={solarPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {/* Demand Area & Line */}
          {showDemand && (
            <>
              <path d={`${demandPath} L ${getX(23)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`} fill="url(#demandGrad)" />
              <path d={demandPath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 3" />
            </>
          )}

          {/* Electricity Tariff Line */}
          {showPrice && (
            <path d={pricePath} fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" />
          )}

          {/* Battery SOC Line */}
          {showSoc && (
            <path d={socPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          )}

          {/* Current Hour Vertical Marker */}
          <line
            x1={getX(activeHourIndex)}
            y1={padding.top}
            x2={getX(activeHourIndex)}
            y2={padding.top + chartH}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
          <circle
            cx={getX(activeHourIndex)}
            cy={getYSoc(activePoint.agent.batterySocPct)}
            r="5"
            fill="#10b981"
            stroke="#020617"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Synchronized Hourly Tooltip Strip */}
      <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
            {activePoint.timeLabel}
          </span>
          <span className="font-semibold text-emerald-400">
            Action: {activePoint.agent.action.replace('_', ' ')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">Solar:</span>
            <span className="text-amber-300 font-semibold">{activePoint.solarKw.toFixed(2)} kW</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-slate-400">Load:</span>
            <span className="text-blue-300 font-semibold">{activePoint.demandKw.toFixed(2)} kW</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">SOC:</span>
            <span className="text-emerald-300 font-semibold">{activePoint.agent.batterySocPct.toFixed(1)}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span className="text-slate-400">Tariff:</span>
            <span className="text-rose-300 font-semibold">${activePoint.importPrice.toFixed(2)}/kWh</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Net Cost:</span>
            <span className={activePoint.agent.netCost <= 0 ? 'text-emerald-400 font-semibold' : 'text-slate-200'}>
              ${activePoint.agent.netCost.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
