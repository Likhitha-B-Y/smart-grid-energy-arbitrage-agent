import React, { useState } from 'react';
import { HelpCircle, ChevronRight, Filter } from 'lucide-react';
import { AgentAction, HourlyEnergyPoint } from '../types/energy';

interface HourlyScheduleTableProps {
  points: HourlyEnergyPoint[];
  currentHour: number;
  onSelectHour: (hour: number) => void;
  onOpenExplainModal: (point: HourlyEnergyPoint) => void;
}

export const HourlyScheduleTable: React.FC<HourlyScheduleTableProps> = ({
  points,
  currentHour,
  onSelectHour,
  onOpenExplainModal,
}) => {
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const getActionBadge = (action: AgentAction) => {
    switch (action) {
      case 'CHARGE_BATTERY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CHARGE</span>;
      case 'DISCHARGE_BATTERY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">DISCHARGE</span>;
      case 'SELL_SURPLUS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">EXPORT</span>;
      case 'USE_SOLAR':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">SOLAR ONLY</span>;
      case 'IMPORT_GRID':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">IMPORT</span>;
      case 'HOLD':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">HOLD</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">IDLE</span>;
    }
  };

  const filteredPoints = points.filter((p) => {
    if (actionFilter === 'ALL') return true;
    return p.agent.action === actionFilter;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            24-Hour Dispatch Schedule & Explainable Decision Audit
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to inspect mathematical rationale, energy conservation checks, and financial trade-offs
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Actions (24 Hours)</option>
            <option value="CHARGE_BATTERY">Charge Battery</option>
            <option value="DISCHARGE_BATTERY">Discharge Battery</option>
            <option value="SELL_SURPLUS">Export Surplus</option>
            <option value="HOLD">Hold Reserve</option>
            <option value="IMPORT_GRID">Grid Import</option>
            <option value="USE_SOLAR">Direct Solar</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 text-slate-400 font-medium z-10">
            <tr>
              <th className="py-2.5 px-3">Hour</th>
              <th className="py-2.5 px-3">Solar</th>
              <th className="py-2.5 px-3">Load</th>
              <th className="py-2.5 px-3">Tariff</th>
              <th className="py-2.5 px-3">Agent Action</th>
              <th className="py-2.5 px-3">Battery Flow</th>
              <th className="py-2.5 px-3">SOC %</th>
              <th className="py-2.5 px-3">Grid Flow</th>
              <th className="py-2.5 px-3 text-right">Net Cost</th>
              <th className="py-2.5 px-3 text-right">Savings</th>
              <th className="py-2.5 px-3 text-center">Confidence</th>
              <th className="py-2.5 px-3 text-center">Explain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredPoints.map((p) => {
              const isCurrent = p.hour === currentHour;
              const isCharging = p.agent.batteryChargeKw > 0;
              const isDischarging = p.agent.batteryDischargeKw > 0;
              const isExporting = p.agent.gridExportKw > 0;
              const isImporting = p.agent.gridImportKw > 0;

              return (
                <tr
                  key={p.hour}
                  onClick={() => onSelectHour(p.hour)}
                  className={`cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-semibold text-white'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                      {p.timeLabel}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-amber-300">{p.solarKw.toFixed(1)} kW</td>
                  <td className="py-2 px-3 text-blue-300">{p.demandKw.toFixed(1)} kW</td>
                  <td className="py-2 px-3 text-rose-300">${p.importPrice.toFixed(2)}</td>
                  <td className="py-2 px-3 font-sans whitespace-nowrap">{getActionBadge(p.agent.action)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {isCharging ? (
                      <span className="text-emerald-400">+{p.agent.batteryChargeKw.toFixed(1)} kW</span>
                    ) : isDischarging ? (
                      <span className="text-amber-400">-{p.agent.batteryDischargeKw.toFixed(1)} kW</span>
                    ) : (
                      <span className="text-slate-500">0.0 kW</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-emerald-300 font-bold">{p.agent.batterySocPct.toFixed(0)}%</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {isExporting ? (
                      <span className="text-cyan-300">-{p.agent.gridExportKw.toFixed(1)} kW (exp)</span>
                    ) : isImporting ? (
                      <span className="text-rose-400">+{p.agent.gridImportKw.toFixed(1)} kW (imp)</span>
                    ) : (
                      <span className="text-slate-500">0.0 kW</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={p.agent.netCost < 0 ? 'text-cyan-400' : 'text-slate-200'}>
                      ${p.agent.netCost.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    +${Math.max(0, p.agent.netSavingsVsBaseline).toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {p.agent.confidencePct}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExplainModal(p);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition-colors"
                      title="Inspect Explainable AI Rationale"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
