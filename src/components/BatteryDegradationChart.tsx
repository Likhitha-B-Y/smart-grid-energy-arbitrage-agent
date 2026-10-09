import React, { useState, useMemo } from 'react';
import {
  Battery,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { HourlyEnergyPoint, BatteryConfig, OptimizationSummary } from '../types/energy';

interface BatteryDegradationChartProps {
  points: HourlyEnergyPoint[];
  currentHour: number;
  onSelectHour: (hour: number) => void;
  batteryConfig: BatteryConfig;
  summary: OptimizationSummary;
}

export type ViewMetric = 'CUMULATIVE_COST' | 'CUMULATIVE_THROUGHPUT' | 'HOURLY_INCREMENTAL';
export type OverlayMode = 'OVERLAY_DUAL' | 'DELTA_DIFFERENCE' | 'AGENT_ONLY';

export const BatteryDegradationChart: React.FC<BatteryDegradationChartProps> = ({
  points,
  currentHour,
  onSelectHour,
  batteryConfig,
  summary,
}) => {
  const [viewMetric, setViewMetric] = useState<ViewMetric>('CUMULATIVE_COST');
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('OVERLAY_DUAL');
  const [baselineType, setBaselineType] = useState<'PASSIVE' | 'NO_ARBITRAGE'>('PASSIVE');
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  // Compute 24-hour cumulative arrays
  const degradationData = useMemo(() => {
    let cumAgentCost = 0;
    let cumBaselineCost = 0;
    let cumAgentThroughput = 0;
    let cumBaselineThroughput = 0;

    return points.map((p) => {
      const agentHourlyCost = p.agent.batteryDegradationCost;
      // In NO_ARBITRAGE mode, baseline only charges from solar (capped at solar excess)
      const baselineHourlyCost =
        baselineType === 'NO_ARBITRAGE'
          ? Math.min(p.baseline.batteryDegradationCost, p.solarKw * batteryConfig.degradationCostPerKwh)
          : p.baseline.batteryDegradationCost;

      const agentHourlyThroughput = p.agent.batteryChargeKw + p.agent.batteryDischargeKw;
      const baselineHourlyThroughput = p.baseline.batteryChargeKw + p.baseline.batteryDischargeKw;

      cumAgentCost += agentHourlyCost;
      cumBaselineCost += baselineHourlyCost;
      cumAgentThroughput += agentHourlyThroughput;
      cumBaselineThroughput += baselineHourlyThroughput;

      const costDelta = cumAgentCost - cumBaselineCost;
      const throughputDelta = cumAgentThroughput - cumBaselineThroughput;

      return {
        hour: p.hour,
        timeLabel: p.timeLabel,
        agentHourlyCost,
        baselineHourlyCost,
        cumAgentCost: Math.round(cumAgentCost * 1000) / 1000,
        cumBaselineCost: Math.round(cumBaselineCost * 1000) / 1000,
        costDelta: Math.round(costDelta * 1000) / 1000,
        agentHourlyThroughput: Math.round(agentHourlyThroughput * 100) / 100,
        baselineHourlyThroughput: Math.round(baselineHourlyThroughput * 100) / 100,
        cumAgentThroughput: Math.round(cumAgentThroughput * 100) / 100,
        cumBaselineThroughput: Math.round(cumBaselineThroughput * 100) / 100,
        throughputDelta: Math.round(throughputDelta * 100) / 100,
        action: p.agent.action,
        chargeKw: p.agent.batteryChargeKw,
        dischargeKw: p.agent.batteryDischargeKw,
      };
    });
  }, [points, baselineType, batteryConfig.degradationCostPerKwh]);

  // Aggregate daily metrics
  const totalAgentDegCost = degradationData[23]?.cumAgentCost || 0;
  const totalBaselineDegCost = degradationData[23]?.cumBaselineCost || 0;
  const netDegCostDelta = totalAgentDegCost - totalBaselineDegCost;

  const totalAgentThroughputKwh = degradationData[23]?.cumAgentThroughput || 0;
  const totalBaselineThroughputKwh = degradationData[23]?.cumBaselineThroughput || 0;

  // Cycles & Lifespan projections
  const cyclesTodayAgent = totalAgentThroughputKwh / (2 * batteryConfig.usableCapacityKwh);
  const cyclesTodayBaseline = totalBaselineThroughputKwh / (2 * batteryConfig.usableCapacityKwh);
  const ratedLifetimeCycles = 6000; // Standard LFP residential rating
  const projectedYearsLifeAgent =
    cyclesTodayAgent > 0.05
      ? Math.min(25, Math.max(5, ratedLifetimeCycles / (cyclesTodayAgent * 365)))
      : 25;
  const projectedYearsLifeBaseline =
    cyclesTodayBaseline > 0.05
      ? Math.min(25, Math.max(5, ratedLifetimeCycles / (cyclesTodayBaseline * 365)))
      : 25;

  // Economics
  const grossSavings = summary.totalSavingsDollars + totalAgentDegCost;
  const netFinancialValueAdded = summary.totalSavingsDollars;
  const wearPayoffRatio =
    Math.abs(netDegCostDelta) > 0.001
      ? (grossSavings / Math.max(0.01, totalAgentDegCost)).toFixed(1)
      : (grossSavings / Math.max(0.01, totalAgentDegCost)).toFixed(1);

  // SVG Chart Geometry
  const width = 800;
  const height = 270;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Dynamic scale calculation
  const isDeltaMode = overlayMode === 'DELTA_DIFFERENCE';
  const showBaseline = overlayMode === 'OVERLAY_DUAL';

  const { maxVal, minVal } = useMemo(() => {
    if (isDeltaMode) {
      if (viewMetric === 'CUMULATIVE_COST') {
        const deltas = degradationData.map((d) => d.costDelta);
        const maxD = Math.max(0.02, ...deltas);
        const minD = Math.min(-0.02, ...deltas);
        const absMax = Math.max(Math.abs(maxD), Math.abs(minD));
        const ceiling = Math.ceil(absMax * 20) / 20;
        return { maxVal: ceiling, minVal: -ceiling };
      } else if (viewMetric === 'CUMULATIVE_THROUGHPUT') {
        const deltas = degradationData.map((d) => d.throughputDelta);
        const maxD = Math.max(0.5, ...deltas);
        const minD = Math.min(-0.5, ...deltas);
        const absMax = Math.max(Math.abs(maxD), Math.abs(minD));
        const ceiling = Math.ceil(absMax);
        return { maxVal: ceiling, minVal: -ceiling };
      } else {
        const deltas = degradationData.map((d) => d.agentHourlyCost - d.baselineHourlyCost);
        const absMax = Math.max(0.01, ...deltas.map(Math.abs));
        const ceiling = Math.ceil(absMax * 100) / 100;
        return { maxVal: ceiling, minVal: -ceiling };
      }
    } else {
      if (viewMetric === 'CUMULATIVE_COST') {
        const maxC = Math.max(
          0.05,
          ...degradationData.map((d) => Math.max(d.cumAgentCost, showBaseline ? d.cumBaselineCost : 0))
        );
        return { maxVal: Math.ceil(maxC * 12) / 10, minVal: 0 };
      } else if (viewMetric === 'CUMULATIVE_THROUGHPUT') {
        const maxT = Math.max(
          1,
          ...degradationData.map((d) => Math.max(d.cumAgentThroughput, showBaseline ? d.cumBaselineThroughput : 0))
        );
        return { maxVal: Math.ceil(maxT), minVal: 0 };
      } else {
        const maxH = Math.max(
          0.02,
          ...degradationData.map((d) => Math.max(d.agentHourlyCost, showBaseline ? d.baselineHourlyCost : 0))
        );
        return { maxVal: Math.ceil(maxH * 100) / 100, minVal: 0 };
      }
    }
  }, [isDeltaMode, viewMetric, degradationData, showBaseline]);

  const getX = (hour: number) => padding.left + (hour / 23) * chartW;
  const getY = (val: number) => {
    const range = maxVal - minVal || 0.1;
    return padding.top + chartH - ((val - minVal) / range) * chartH;
  };

  // Paths
  const agentPath = useMemo(() => {
    return degradationData
      .map((d, idx) => {
        const x = getX(d.hour);
        const yVal =
          viewMetric === 'CUMULATIVE_COST'
            ? d.cumAgentCost
            : viewMetric === 'CUMULATIVE_THROUGHPUT'
            ? d.cumAgentThroughput
            : d.agentHourlyCost;
        const y = getY(yVal);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [degradationData, viewMetric, maxVal, minVal]);

  const baselinePath = useMemo(() => {
    if (!showBaseline) return '';
    return degradationData
      .map((d, idx) => {
        const x = getX(d.hour);
        const yVal =
          viewMetric === 'CUMULATIVE_COST'
            ? d.cumBaselineCost
            : viewMetric === 'CUMULATIVE_THROUGHPUT'
            ? d.cumBaselineThroughput
            : d.baselineHourlyCost;
        const y = getY(yVal);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [degradationData, viewMetric, maxVal, minVal, showBaseline]);

  // Delta Path for Difference mode
  const deltaPath = useMemo(() => {
    if (!isDeltaMode) return '';
    return degradationData
      .map((d, idx) => {
        const x = getX(d.hour);
        const yVal =
          viewMetric === 'CUMULATIVE_COST'
            ? d.costDelta
            : viewMetric === 'CUMULATIVE_THROUGHPUT'
            ? d.throughputDelta
            : d.agentHourlyCost - d.baselineHourlyCost;
        const y = getY(yVal);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [degradationData, isDeltaMode, viewMetric, maxVal, minVal]);

  // Shaded polygon between Agent and Baseline (Difference Ribbon)
  const differenceRibbonPath = useMemo(() => {
    if (!showBaseline) return '';
    const pointsForward = degradationData.map((d) => {
      const yVal =
        viewMetric === 'CUMULATIVE_COST'
          ? d.cumAgentCost
          : viewMetric === 'CUMULATIVE_THROUGHPUT'
          ? d.cumAgentThroughput
          : d.agentHourlyCost;
      return `${getX(d.hour).toFixed(1)} ${getY(yVal).toFixed(1)}`;
    });

    const pointsBackward = [...degradationData].reverse().map((d) => {
      const yVal =
        viewMetric === 'CUMULATIVE_COST'
          ? d.cumBaselineCost
          : viewMetric === 'CUMULATIVE_THROUGHPUT'
          ? d.cumBaselineThroughput
          : d.baselineHourlyCost;
      return `${getX(d.hour).toFixed(1)} ${getY(yVal).toFixed(1)}`;
    });

    return `M ${pointsForward.join(' L ')} L ${pointsBackward.join(' L ')} Z`;
  }, [degradationData, showBaseline, viewMetric, maxVal, minVal]);

  const activeHourIndex = hoverHour !== null ? hoverHour : currentHour;
  const activeData = degradationData[activeHourIndex] || degradationData[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur flex flex-col">
      {/* Header & Primary Overlay Mode Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Battery className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-white">
              Cumulative Battery Degradation & Longevity Comparison
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Electrochemical wear model ($0.04/kWh cycled) • Toggle overlay modes to evaluate economic cycling vs baseline
          </p>
        </div>

        {/* Feature Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Overlay Mode Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
              <span>Overlay:</span>
            </span>

            <button
              onClick={() => setOverlayMode('OVERLAY_DUAL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                overlayMode === 'OVERLAY_DUAL'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Overlay Smart Agent and Passive Baseline curves with differential wear ribbon"
            >
              Dual Overlay
            </button>

            <button
              onClick={() => setOverlayMode('DELTA_DIFFERENCE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                overlayMode === 'DELTA_DIFFERENCE'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualize net delta difference (Added wear vs preserved cell life)"
            >
              Delta Curve
            </button>

            <button
              onClick={() => setOverlayMode('AGENT_ONLY')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                overlayMode === 'AGENT_ONLY'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show only the current optimized smart agent"
            >
              Agent Only
            </button>
          </div>

          {/* Baseline Strategy Selector Dropdown */}
          {overlayMode !== 'AGENT_ONLY' && (
            <select
              value={baselineType}
              onChange={(e) => setBaselineType(e.target.value as 'PASSIVE' | 'NO_ARBITRAGE')}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              title="Choose comparator baseline model"
            >
              <option value="PASSIVE">Baseline: Passive Self-Consumption</option>
              <option value="NO_ARBITRAGE">Baseline: No Grid Arbitrage (Solar Only)</option>
            </select>
          )}

          {/* Metric Unit Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMetric('CUMULATIVE_COST')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMetric === 'CUMULATIVE_COST'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cost ($)
            </button>
            <button
              onClick={() => setViewMetric('CUMULATIVE_THROUGHPUT')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMetric === 'CUMULATIVE_THROUGHPUT'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Throughput (kWh)
            </button>
            <button
              onClick={() => setViewMetric('HOURLY_INCREMENTAL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMetric === 'HOURLY_INCREMENTAL'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rate ($/h)
            </button>
          </div>
        </div>
      </div>

      {/* Comparative Strategy KPI Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-xs">
        {/* Metric 1: Smart Agent Total Wear */}
        <div className="bg-slate-950/70 border border-emerald-500/30 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Smart Agent Wear
            </span>
            <span className="font-mono text-emerald-300 text-[10px]">Active</span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-mono font-extrabold text-base text-white">
              ${totalAgentDegCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              ({totalAgentThroughputKwh.toFixed(1)} kWh)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Cycle Rate:</span>
            <span className="font-mono text-emerald-400">{cyclesTodayAgent.toFixed(2)} EFC/day</span>
          </div>
        </div>

        {/* Metric 2: Baseline Strategy Wear */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {baselineType === 'PASSIVE' ? 'Passive Baseline' : 'No-Arbitrage'}
            </span>
            <span className="font-mono text-slate-500 text-[10px]">Reference</span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-mono font-extrabold text-base text-slate-200">
              ${totalBaselineDegCost.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              ({totalBaselineThroughputKwh.toFixed(1)} kWh)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Cycle Rate:</span>
            <span className="font-mono text-slate-300">{cyclesTodayBaseline.toFixed(2)} EFC/day</span>
          </div>
        </div>

        {/* Metric 3: Comparative Wear Delta */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            Net Cycling Delta
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span
              className={`font-mono font-extrabold text-base ${
                netDegCostDelta > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {netDegCostDelta >= 0 ? `+$${netDegCostDelta.toFixed(2)}` : `-$${Math.abs(netDegCostDelta).toFixed(2)}`}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({netDegCostDelta >= 0 ? '+' : ''}{(totalAgentThroughputKwh - totalBaselineThroughputKwh).toFixed(1)} kWh)
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {netDegCostDelta > 0
              ? 'Additional cycling for grid arbitrage'
              : 'Cycling suppressed by intelligent holding'}
          </span>
        </div>

        {/* Metric 4: Wear Justification ROI */}
        <div className="bg-slate-950/70 border border-teal-500/30 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-teal-400" />
            Arbitrage / Wear Return
          </span>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="font-mono font-extrabold text-base text-teal-300">
              {wearPayoffRatio}x ROI
            </span>
            <span className="text-[10px] text-teal-400 font-semibold font-mono">
              +${netFinancialValueAdded.toFixed(2)} net
            </span>
          </div>
          <span className="text-[10px] text-teal-400/80">
            Every $1 of cell aging earned ${wearPayoffRatio} in savings
          </span>
        </div>
      </div>

      {/* SVG Canvas with Dual Overlay & Differential Ribbon */}
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
            {/* Gradient for Agent */}
            <linearGradient id="agentDegradationGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Differential ribbon pattern between Agent and Baseline */}
            <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>

            {/* Delta curve gradient */}
            <linearGradient id="deltaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
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

          {/* Zero line for Delta mode */}
          {isDeltaMode && (
            <line
              x1={padding.left}
              y1={getY(0)}
              x2={width - padding.right}
              y2={getY(0)}
              stroke="#64748b"
              strokeWidth="1.5"
            />
          )}

          {/* Left Y-axis labels */}
          <text
            x={padding.left - 8}
            y={padding.top + 5}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {viewMetric === 'CUMULATIVE_THROUGHPUT' ? `${maxVal.toFixed(0)} kWh` : `$${maxVal.toFixed(2)}`}
          </text>
          <text
            x={padding.left - 8}
            y={padding.top + chartH / 2}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {viewMetric === 'CUMULATIVE_THROUGHPUT'
              ? `${((maxVal + minVal) / 2).toFixed(1)} kWh`
              : `$${((maxVal + minVal) / 2).toFixed(2)}`}
          </text>
          <text
            x={padding.left - 8}
            y={padding.top + chartH}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {viewMetric === 'CUMULATIVE_THROUGHPUT' ? `${minVal.toFixed(0)} kWh` : `$${minVal.toFixed(2)}`}
          </text>

          {/* X-axis time labels */}
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

          {/* DIFFERENCE RIBBON in Dual Overlay Mode */}
          {showBaseline && differenceRibbonPath && (
            <path d={differenceRibbonPath} fill="url(#ribbonGrad)" />
          )}

          {/* BASELINE OVERLAY LINE (Amber / Gold Dashed) */}
          {showBaseline && baselinePath && (
            <path
              d={baselinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.2"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          )}

          {/* SMART AGENT LINE (Solid Emerald) */}
          {!isDeltaMode && agentPath && (
            <>
              <path
                d={`${agentPath} L ${getX(23)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`}
                fill="url(#agentDegradationGrad)"
              />
              <path
                d={agentPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          )}

          {/* DELTA CURVE (In Delta Difference Mode) */}
          {isDeltaMode && deltaPath && (
            <>
              <path
                d={`${deltaPath} L ${getX(23)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`}
                fill="url(#deltaGrad)"
              />
              <path
                d={deltaPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Current Hour / Hover Marker */}
          <line
            x1={getX(activeHourIndex)}
            y1={padding.top}
            x2={getX(activeHourIndex)}
            y2={padding.top + chartH}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="2 2"
          />

          {/* Hover dot for Agent */}
          {!isDeltaMode && (
            <circle
              cx={getX(activeHourIndex)}
              cy={getY(
                viewMetric === 'CUMULATIVE_COST'
                  ? activeData.cumAgentCost
                  : viewMetric === 'CUMULATIVE_THROUGHPUT'
                  ? activeData.cumAgentThroughput
                  : activeData.agentHourlyCost
              )}
              r="5"
              fill="#10b981"
              stroke="#020617"
              strokeWidth="2"
            />
          )}

          {/* Hover dot for Baseline */}
          {showBaseline && (
            <circle
              cx={getX(activeHourIndex)}
              cy={getY(
                viewMetric === 'CUMULATIVE_COST'
                  ? activeData.cumBaselineCost
                  : viewMetric === 'CUMULATIVE_THROUGHPUT'
                  ? activeData.cumBaselineThroughput
                  : activeData.baselineHourlyCost
              )}
              r="4.5"
              fill="#f59e0b"
              stroke="#020617"
              strokeWidth="2"
            />
          )}

          {/* Hover dot for Delta mode */}
          {isDeltaMode && (
            <circle
              cx={getX(activeHourIndex)}
              cy={getY(
                viewMetric === 'CUMULATIVE_COST'
                  ? activeData.costDelta
                  : viewMetric === 'CUMULATIVE_THROUGHPUT'
                  ? activeData.throughputDelta
                  : activeData.agentHourlyCost - activeData.baselineHourlyCost
              )}
              r="5"
              fill="#06b6d4"
              stroke="#020617"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Synchronized Hourly Inspection Strip */}
      <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
            {activeData.timeLabel}
          </span>
          <span className="text-slate-300 font-semibold">
            Action: <strong className="text-emerald-400">{activeData.action.replace('_', ' ')}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Agent value */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Smart Agent:</span>
            <span className="text-emerald-300 font-bold">
              ${activeData.cumAgentCost.toFixed(3)}
            </span>
          </div>

          {/* Baseline value */}
          {showBaseline && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-400">Baseline Overlay:</span>
              <span className="text-amber-300 font-semibold">
                ${activeData.cumBaselineCost.toFixed(3)}
              </span>
            </div>
          )}

          {/* Delta value */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-400">Overlay Delta:</span>
            <span
              className={`font-semibold ${
                activeData.costDelta > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {activeData.costDelta >= 0 ? `+$${activeData.costDelta.toFixed(3)}` : `-$${Math.abs(activeData.costDelta).toFixed(3)}`}
            </span>
          </div>

          {/* Active Flow Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Hour Flow:</span>
            <span className="text-slate-200">
              {activeData.chargeKw > 0
                ? `Charge +${activeData.chargeKw.toFixed(1)} kW`
                : activeData.dischargeKw > 0
                ? `Discharge -${activeData.dischargeKw.toFixed(1)} kW`
                : 'Idling (0 Wear)'}
            </span>
          </div>
        </div>
      </div>

      {/* Overlay Analysis Takeaway Explainer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {overlayMode === 'OVERLAY_DUAL' && (
            <span>
              <strong>Dual Overlay Insight:</strong> The shaded ribbon highlights the difference in cycling intensity. Notice that the Smart Agent pre-charges from cheap or negative tariffs and selectively discharges during extreme price spikes, accepting a tiny delta in battery wear to generate substantial net peak bill savings.
            </span>
          )}
          {overlayMode === 'DELTA_DIFFERENCE' && (
            <span>
              <strong>Delta Curve Insight:</strong> Positive values indicate intervals where the arbitrage agent added battery throughput (pre-charging for upcoming peaks), while negative/flat segments show where intelligent holding suppressed unnecessary cycling.
            </span>
          )}
          {overlayMode === 'AGENT_ONLY' && (
            <span>
              <strong>Standalone Mode:</strong> Visualizing the isolated electrochemical degradation accumulation of the active Smart Arbitrage Agent.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
