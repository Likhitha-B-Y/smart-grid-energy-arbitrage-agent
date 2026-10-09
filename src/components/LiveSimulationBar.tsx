import React from 'react';
import { Play, Pause, FastForward, RotateCcw, Clock, Zap } from 'lucide-react';
import { AgentAction, HourlyEnergyPoint } from '../types/energy';

interface LiveSimulationBarProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentPoint: HourlyEnergyPoint;
}

export const LiveSimulationBar: React.FC<LiveSimulationBarProps> = ({
  currentHour,
  onHourChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  currentPoint,
}) => {
  const getActionColor = (action: AgentAction) => {
    switch (action) {
      case 'CHARGE_BATTERY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DISCHARGE_BATTERY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'SELL_SURPLUS':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'USE_SOLAR':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'IMPORT_GRID':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HOLD':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Playback Controls & Current Time */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePlay}
              className={`p-2 rounded-lg font-semibold transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              }`}
              title={isPlaying ? 'Pause Simulation' : 'Start Real-Time Simulation Ticker'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => onHourChange(0)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Reset to 00:00 (Midnight)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            {[1, 5, 20].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Current Hour Pill */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-sm text-slate-100">
              {currentHour.toString().padStart(2, '0')}:00
            </span>
            <span className="text-[11px] text-slate-500">Day View</span>
          </div>

          {/* Current Active Action Pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getActionColor(
              currentPoint.agent.action
            )}`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{currentPoint.agent.action.replace('_', ' ')}</span>
          </div>
        </div>

        {/* 24-Hour Scrubber Bar */}
        <div className="w-full lg:flex-1 flex flex-col gap-1 px-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>00:00 (Off-Peak)</span>
            <span>12:00 (Solar Peak)</span>
            <span>17:00 (Grid Peak TOU)</span>
            <span>23:00</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={currentHour}
              onChange={(e) => onHourChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Jump Shortcuts */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-500">Quick Jump:</span>
          <button
            onClick={() => onHourChange(3)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
          >
            03:00 Night
          </button>
          <button
            onClick={() => onHourChange(12)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-700 text-[11px]"
          >
            12:00 Solar
          </button>
          <button
            onClick={() => onHourChange(18)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-[11px]"
          >
            18:00 Peak
          </button>
        </div>
      </div>
    </div>
  );
};
