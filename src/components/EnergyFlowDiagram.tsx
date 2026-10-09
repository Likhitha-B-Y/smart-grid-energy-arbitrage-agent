import React from 'react';
import { Sun, Battery, Home, Zap, ArrowRight } from 'lucide-react';
import { HourlyEnergyPoint } from '../types/energy';

interface EnergyFlowDiagramProps {
  currentPoint: HourlyEnergyPoint;
}

export const EnergyFlowDiagram: React.FC<EnergyFlowDiagramProps> = ({ currentPoint }) => {
  const solarKw = currentPoint.solarKw;
  const demandKw = currentPoint.demandKw;
  const solarDirectKw = currentPoint.agent.solarDirectKw;
  const batteryChargeKw = currentPoint.agent.batteryChargeKw;
  const batteryDischargeKw = currentPoint.agent.batteryDischargeKw;
  const gridImportKw = currentPoint.agent.gridImportKw;
  const gridExportKw = currentPoint.agent.gridExportKw;
  const soc = currentPoint.agent.batterySocPct;

  // Active flow flags
  const flowSolarToHome = solarDirectKw > 0.05;
  const flowSolarToBattery = currentPoint.agent.batteryChargeSource === 'SOLAR' && batteryChargeKw > 0.05;
  const flowBatteryToHome = batteryDischargeKw > 0.05;
  const flowGridToHome = gridImportKw > 0.05 && batteryChargeKw === 0;
  const flowGridToBattery = currentPoint.agent.batteryChargeSource === 'GRID' && batteryChargeKw > 0.05;
  const flowSolarToGrid = gridExportKw > 0.05;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-Time Inverter & Energy Bus Schematic
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active power vectors at {currentPoint.timeLabel} • Optimal Dispatch: {currentPoint.agent.action.replace('_', ' ')}
          </p>
        </div>
        <div className="text-xs font-mono bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-400">
          Inverter Load Balance: {(solarDirectKw + batteryDischargeKw + gridImportKw).toFixed(2)} kW = {demandKw.toFixed(2)} kW
        </div>
      </div>

      {/* Grid Layout of Nodes */}
      <div className="relative min-h-[220px] sm:min-h-[260px] bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
        {/* Top Row: Solar & Grid */}
        <div className="flex items-center justify-between">
          {/* Node 1: Solar */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 shadow-lg max-w-[200px] w-full">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Solar PV Array</div>
              <div className="text-lg font-bold font-mono text-amber-400">
                {solarKw.toFixed(2)} <span className="text-xs font-sans text-slate-400">kW</span>
              </div>
            </div>
          </div>

          {/* Central Inverter Gateway Indicator */}
          <div className="hidden md:flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">Hybrid Inverter Bus</span>
          </div>

          {/* Node 2: Utility Grid */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-blue-500/30 rounded-xl p-3 shadow-lg max-w-[200px] w-full justify-end text-right">
            <div>
              <div className="text-xs text-slate-400 font-medium">Utility Grid</div>
              <div
                className={`text-lg font-bold font-mono ${
                  gridExportKw > 0 ? 'text-cyan-400' : gridImportKw > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {gridExportKw > 0
                  ? `-${gridExportKw.toFixed(2)}`
                  : gridImportKw > 0
                  ? `+${gridImportKw.toFixed(2)}`
                  : '0.00'}{' '}
                <span className="text-xs font-sans text-slate-400">kW</span>
              </div>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                gridExportKw > 0
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : gridImportKw > 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dynamic Energy Flow Activity Badges in Middle */}
        <div className="my-4 py-2 px-3 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
          {flowSolarToHome && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span>Solar</span> <ArrowRight className="w-3 h-3 text-amber-400 animate-pulse" /> <span>Home:</span>
              <strong className="font-mono">{solarDirectKw.toFixed(2)} kW</strong>
            </span>
          )}
          {flowSolarToBattery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span>Solar</span> <ArrowRight className="w-3 h-3 text-emerald-400 animate-pulse" /> <span>Battery:</span>
              <strong className="font-mono">{batteryChargeKw.toFixed(2)} kW</strong>
            </span>
          )}
          {flowBatteryToHome && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
              <span>Battery</span> <ArrowRight className="w-3 h-3 text-emerald-400 animate-pulse" /> <span>Home:</span>
              <strong className="font-mono">{batteryDischargeKw.toFixed(2)} kW</strong>
            </span>
          )}
          {flowGridToHome && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <span>Grid</span> <ArrowRight className="w-3 h-3 text-rose-400 animate-pulse" /> <span>Home:</span>
              <strong className="font-mono">{gridImportKw.toFixed(2)} kW</strong>
            </span>
          )}
          {flowGridToBattery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <span>Grid</span> <ArrowRight className="w-3 h-3 text-purple-400 animate-pulse" /> <span>Battery:</span>
              <strong className="font-mono">{batteryChargeKw.toFixed(2)} kW (Pre-Charge)</strong>
            </span>
          )}
          {flowSolarToGrid && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <span>Solar</span> <ArrowRight className="w-3 h-3 text-cyan-400 animate-pulse" /> <span>Grid:</span>
              <strong className="font-mono">{gridExportKw.toFixed(2)} kW</strong>
            </span>
          )}
          {!flowSolarToHome &&
            !flowSolarToBattery &&
            !flowBatteryToHome &&
            !flowGridToHome &&
            !flowGridToBattery &&
            !flowSolarToGrid && (
              <span className="text-slate-500 italic">No active power interchange (System idling)</span>
            )}
        </div>

        {/* Bottom Row: Battery & Household Demand */}
        <div className="flex items-center justify-between">
          {/* Node 3: Battery Storage */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 shadow-lg max-w-[200px] w-full">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Battery className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Battery Storage</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {soc.toFixed(1)}% <span className="text-xs font-sans text-slate-400">SOC</span>
              </div>
            </div>
          </div>

          {/* Node 4: Household Load */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-blue-500/30 rounded-xl p-3 shadow-lg max-w-[200px] w-full justify-end text-right">
            <div>
              <div className="text-xs text-slate-400 font-medium">Household Load</div>
              <div className="text-lg font-bold font-mono text-blue-400">
                {demandKw.toFixed(2)} <span className="text-xs font-sans text-slate-400">kW</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Home className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
