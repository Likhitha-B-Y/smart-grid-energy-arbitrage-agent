import React from 'react';
import {
  Sun,
  Home,
  Battery,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  Leaf,
  Sparkles,
} from 'lucide-react';
import { HourlyEnergyPoint, OptimizationSummary, BatteryConfig } from '../types/energy';

interface MetricCardsProps {
  currentPoint: HourlyEnergyPoint;
  summary: OptimizationSummary;
  batteryConfig: BatteryConfig;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  currentPoint,
  summary,
  batteryConfig,
}) => {
  const soc = currentPoint.agent.batterySocPct;
  const usableKwhRemaining = ((soc - batteryConfig.minReserveSocPct) / 100) * batteryConfig.usableCapacityKwh;
  const isCharging = currentPoint.agent.batteryChargeKw > 0;
  const isDischarging = currentPoint.agent.batteryDischargeKw > 0;

  const isImporting = currentPoint.agent.gridImportKw > 0;
  const isExporting = currentPoint.agent.gridExportKw > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Solar Generation */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Solar Generation</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
            {currentPoint.solarKw.toFixed(2)}
            <span className="text-xs font-sans text-slate-400">kW</span>
          </div>
          <div className="text-[11px] text-amber-300/80 mt-0.5">
            Sun: {currentPoint.sunElevationDeg > 0 ? `${currentPoint.sunElevationDeg}° elev` : 'Night (0°)'}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>24h Yield:</span>
          <span className="font-mono font-semibold text-slate-200">
            {summary.totalSolarGeneratedKwh} kWh
          </span>
        </div>
      </div>

      {/* 2. Household Demand */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Household Load</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Home className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
            {currentPoint.demandKw.toFixed(2)}
            <span className="text-xs font-sans text-slate-400">kW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Coverage: {currentPoint.solarKw >= currentPoint.demandKw ? '100% Solar Direct' : 'Solar + Storage/Grid'}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>24h Total:</span>
          <span className="font-mono font-semibold text-slate-200">
            {summary.totalHouseholdDemandKwh} kWh
          </span>
        </div>
      </div>

      {/* 3. Battery State of Charge */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Battery SOC</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Battery className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
            {soc.toFixed(1)}%
            <span className="text-xs font-sans text-slate-400">
              ({Math.max(0, usableKwhRemaining).toFixed(1)} kWh)
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {isCharging
                ? `+${currentPoint.agent.batteryChargeKw.toFixed(1)}kW`
                : isDischarging
                ? `-${currentPoint.agent.batteryDischargeKw.toFixed(1)}kW`
                : 'IDLE'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>Reserve Limit:</span>
          <span className="font-mono font-semibold text-slate-300">{batteryConfig.minReserveSocPct}%</span>
        </div>
      </div>

      {/* 4. Grid Power Flow */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Grid Interchange</span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              isExporting
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                : isImporting
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isExporting ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : isImporting ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : (
              <span className="text-xs font-mono font-bold">0</span>
            )}
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
            {isExporting
              ? `-${currentPoint.agent.gridExportKw.toFixed(2)}`
              : isImporting
              ? `+${currentPoint.agent.gridImportKw.toFixed(2)}`
              : '0.00'}
            <span className="text-xs font-sans text-slate-400">kW</span>
          </div>
          <div
            className={`text-[11px] font-semibold mt-0.5 ${
              isExporting ? 'text-cyan-300' : isImporting ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {isExporting ? 'Selling to Grid' : isImporting ? 'Importing from Grid' : 'Grid Isolated (Zero Draw)'}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>Tariff:</span>
          <span className="font-mono font-semibold text-amber-300">
            ${currentPoint.importPrice.toFixed(2)}/kWh
          </span>
        </div>
      </div>

      {/* 5. Cost & Savings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">24h Net Savings</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
            ${summary.totalSavingsDollars.toFixed(2)}
            <span className="text-xs font-sans text-emerald-300/80">
              ({summary.savingsPercentage.toFixed(0)}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span>Agent: ${summary.agentTotalCost.toFixed(2)} vs ${summary.baselineTotalCost.toFixed(2)}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>Self-Consumption:</span>
          <span className="font-mono font-semibold text-emerald-300">
            {summary.agentSelfConsumptionPct}%
          </span>
        </div>
      </div>

      {/* 6. Carbon Emissions Avoided */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Avoided Carbon</span>
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Leaf className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-teal-300 flex items-baseline gap-1">
            {summary.netCarbonAvoidedKg.toFixed(1)}
            <span className="text-xs font-sans text-slate-400">kg CO₂</span>
          </div>
          <div className="text-[11px] text-teal-400/80 mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Equivalent to {(summary.netCarbonAvoidedKg * 0.05).toFixed(1)} trees/yr</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex justify-between">
          <span>Emissions:</span>
          <span className="font-mono font-semibold text-slate-300">
            {summary.agentCarbonKg.toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  );
};
