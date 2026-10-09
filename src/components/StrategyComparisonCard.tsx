import React from 'react';
import { DollarSign, CheckCircle2, TrendingDown, Leaf, ShieldAlert } from 'lucide-react';
import { OptimizationSummary } from '../types/energy';

interface StrategyComparisonCardProps {
  summary: OptimizationSummary;
}

export const StrategyComparisonCard: React.FC<StrategyComparisonCardProps> = ({ summary }) => {
  const estMonthlySavings = summary.totalSavingsDollars * 30;
  const estYearlySavings = summary.totalSavingsDollars * 365;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Empirical Benchmark: Naive Baseline vs. Smart Arbitrage Agent
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluated under identical solar irradiance, household load profile, and tariff structure
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{summary.savingsPercentage.toFixed(1)}% Cost Reduction</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Strategy A: Passive Baseline
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                Standard Inverter Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Naive self-consumption: stores excess solar only when available; drains battery immediately whenever demand exceeds solar without price foresight.
            </p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total 24h Electricity Cost:</span>
                <span className="font-mono font-bold text-white text-base">
                  ${summary.baselineTotalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grid Import (Purchased):</span>
                <span className="font-mono text-slate-200">{summary.baselineGridImportKwh.toFixed(1)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grid Export (Surplus Sold):</span>
                <span className="font-mono text-slate-200">{summary.baselineGridExportKwh.toFixed(1)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Solar Self-Consumption:</span>
                <span className="font-mono text-slate-200">{summary.baselineSelfConsumptionPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grid Carbon Footprint:</span>
                <span className="font-mono text-slate-300">{summary.baselineCarbonKg.toFixed(1)} kg CO₂</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            Limitation: Depletes battery during shoulder rates, leaving zero reserve when expensive evening peak arrives.
          </div>
        </div>

        {/* Smart Agent Card */}
        <div className="bg-gradient-to-b from-slate-900 to-emerald-950/20 border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-emerald-950/30">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Strategy B: Smart Arbitrage Agent
              </span>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                Predictive Dynamic Optimization
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Multi-period price lookahead: pre-charges during off-peak/negative prices, holds battery for peak spikes, avoids cycling when degradation exceeds spread.
            </p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Total 24h Electricity Cost:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-base">
                  ${summary.agentTotalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grid Import (Purchased):</span>
                <span className="font-mono text-emerald-300">{summary.agentGridImportKwh.toFixed(1)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grid Export (Surplus Sold):</span>
                <span className="font-mono text-emerald-300">{summary.agentGridExportKwh.toFixed(1)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Solar Self-Consumption:</span>
                <span className="font-mono text-emerald-300 font-semibold">{summary.agentSelfConsumptionPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Avoided Carbon Emissions:</span>
                <span className="font-mono text-teal-300 font-semibold">
                  -{summary.netCarbonAvoidedKg.toFixed(1)} kg CO₂
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-slate-300">Projected Savings:</span>
            <span className="font-mono font-bold text-emerald-400">
              ~${estMonthlySavings.toFixed(1)} /mo • ~${estYearlySavings.toFixed(0)} /yr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
