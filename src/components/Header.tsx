import React from 'react';
import {
  SunMedium,
  Zap,
  BatteryCharging,
  UploadCloud,
  Settings,
  Code2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Radio,
  Film,
} from 'lucide-react';
import { SCENARIOS } from '../utils/scenarios';

interface HeaderProps {
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  isWeatherLive: boolean;
  weatherLocation: string;
  onRefreshWeather: () => void;
  isLoadingWeather: boolean;
  onOpenSettings: () => void;
  onOpenCsvModal: () => void;
  onOpenPythonModal: () => void;
  onToggleAiAdvisor: () => void;
  isAiAdvisorOpen: boolean;
  onOpenLiveVoice: () => void;
  onOpenImageToVideo: () => void;
  controlMode: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedScenarioId,
  onSelectScenario,
  isWeatherLive,
  weatherLocation,
  onRefreshWeather,
  isLoadingWeather,
  onOpenSettings,
  onOpenCsvModal,
  onOpenPythonModal,
  onToggleAiAdvisor,
  isAiAdvisorOpen,
  onOpenLiveVoice,
  onOpenImageToVideo,
  controlMode,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Micro-Agent status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <Zap className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                Smart Grid <span className="text-emerald-400">Arbitrage Agent</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LOCAL MICRO-AGENT ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                {weatherLocation}
              </span>
              <span>•</span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] ${
                  isWeatherLive ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {isWeatherLive ? 'Open-Meteo Live API' : 'Calibrated Diurnal Model'}
              </span>
              <button
                onClick={onRefreshWeather}
                disabled={isLoadingWeather}
                title="Refresh Live Weather Forecast"
                className="hover:text-emerald-300 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingWeather ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <span>•</span>
              <span className="text-[11px] text-emerald-400/90 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                {controlMode}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Scenario Picker */}
          <div className="relative">
            <select
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:border-slate-600 transition-colors cursor-pointer"
            >
              <optgroup label="Real-World Market Scenarios">
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </optgroup>
              <option value="custom-csv">📁 Custom Uploaded CSV Data</option>
            </select>
          </div>

          {/* Upload CSV */}
          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-lg transition-colors"
            title="Import Historical or Custom CSV Telemetry"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CSV Data</span>
          </button>

          {/* Battery / System Specs */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-lg transition-colors"
            title="Battery Capacity, C-Rate & Inverter Limits"
          >
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">System Specs</span>
          </button>

          {/* Python Package Exporter */}
          <button
            onClick={onOpenPythonModal}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 px-3 py-2 rounded-lg transition-colors"
            title="Inspect & Download Python Micro-Agent Source Code"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Python Agent</span>
          </button>

          {/* Live Voice API (gemini-3.8-live) */}
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
            title="Real-time Voice Conversation via gemini-3.8-live"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Voice Live</span>
          </button>

          {/* Animate Video (Veo Engine) */}
          <button
            onClick={onOpenImageToVideo}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/60 transition-all cursor-pointer shadow-sm"
            title="Animate Photo into Video using Veo Video Generator"
          >
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Animate Video</span>
          </button>

          {/* AI Advisor Panel Toggle */}
          <button
            onClick={onToggleAiAdvisor}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              isAiAdvisorOpen
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Advisor</span>
          </button>
        </div>
      </div>
    </header>
  );
};
