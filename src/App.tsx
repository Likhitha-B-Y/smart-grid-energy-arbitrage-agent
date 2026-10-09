/**
 * Smart Grid Energy Arbitrage Agent - Primary Application Entry
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, RefreshCw, SunMedium, CloudRain, ShieldCheck } from 'lucide-react';
import {
  BatteryConfig,
  SolarSystemConfig,
  GridConfig,
  UserPreferences,
  HourlyEnergyPoint,
} from './types/energy';
import { SCENARIOS } from './utils/scenarios';
import { fetchHourlyWeatherForecast, WeatherFetchResult } from './utils/weatherService';
import { calculateSolarOutput } from './utils/solarPhysics';
import { runOptimization } from './utils/optimizer';
import { exportScheduleToCsv, ParsedCsvRow } from './utils/csvParser';

import { Header } from './components/Header';
import { LiveSimulationBar } from './components/LiveSimulationBar';
import { MetricCards } from './components/MetricCards';
import { EnergyFlowDiagram } from './components/EnergyFlowDiagram';
import { OptimizationChart } from './components/OptimizationChart';
import { BatteryDegradationChart } from './components/BatteryDegradationChart';
import { StrategyComparisonCard } from './components/StrategyComparisonCard';
import { HourlyScheduleTable } from './components/HourlyScheduleTable';
import { DecisionExplainModal } from './components/DecisionExplainModal';
import { BatterySettingsModal } from './components/BatterySettingsModal';
import { CsvDataUploadModal } from './components/CsvDataUploadModal';
import { PythonPackageViewer } from './components/PythonPackageViewer';
import { AiEnergyAdvisor } from './components/AiEnergyAdvisor';
import { LiveVoiceConversationModal } from './components/LiveVoiceConversationModal';
import { ImageToVideoModal } from './components/ImageToVideoModal';

export default function App() {
  // Scenario state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('summer-extreme-tou');
  const [customCsvRows, setCustomCsvRows] = useState<ParsedCsvRow[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');

  // Hardware and Preference Configurations
  const [batteryConfig, setBatteryConfig] = useState<BatteryConfig>({
    usableCapacityKwh: 13.5,
    maxChargeRateKw: 5.0,
    maxDischargeRateKw: 5.0,
    roundTripEfficiencyPct: 92,
    minReserveSocPct: 15,
    maxSocPct: 95,
    initialSocPct: 35,
    degradationCostPerKwh: 0.04,
  });

  const [solarConfig, setSolarConfig] = useState<SolarSystemConfig>({
    ratedCapacityKwp: 6.6,
    inverterCapacityKw: 6.0,
    tiltDegrees: 30,
    azimuthDegrees: 180,
    systemEfficiencyPct: 85,
    latitude: 37.77,
    longitude: -122.41,
    cityName: 'San Francisco, CA',
  });

  const [gridConfig, setGridConfig] = useState<GridConfig>({
    importCapacityLimitKw: 12.0,
    exportCapacityLimitKw: 6.0,
    feedInTariffRate: 0.08,
    useDynamicExportPrice: true,
    carbonIntensityAvgGpkwh: 340,
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    optimizationMode: 'COST_MINIMIZER',
    backupReserveBufferPct: 15,
    allowGridBatteryCharging: true,
    allowExportFromBattery: false,
    inverterControlMode: 'RECOMMENDATION_ONLY',
  });

  // Weather service state
  const [weatherData, setWeatherData] = useState<WeatherFetchResult | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Simulation controls state
  const [currentHour, setCurrentHour] = useState<number>(12); // Default to solar noon
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5);
  const [activeChartTab, setActiveChartTab] = useState<'DISPATCH' | 'DEGRADATION' | 'BOTH'>('DISPATCH');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isImageToVideoOpen, setIsImageToVideoOpen] = useState(false);
  const [explainPoint, setExplainPoint] = useState<HourlyEnergyPoint | null>(null);

  // Fetch weather forecast
  const loadWeather = useCallback(async () => {
    setIsLoadingWeather(true);
    const result = await fetchHourlyWeatherForecast(
      solarConfig.latitude,
      solarConfig.longitude,
      solarConfig.cityName
    );
    setWeatherData(result);
    setIsLoadingWeather(false);
  }, [solarConfig.latitude, solarConfig.longitude, solarConfig.cityName]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // Real-time playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Active scenario definition
  const activeScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  }, [selectedScenarioId]);

  // Compute 24-hour inputs and deterministic optimization
  const { points, summary } = useMemo(() => {
    const hourlyInputs = [];

    for (let h = 0; h < 24; h++) {
      if (customCsvRows && customCsvRows.length >= 24 && selectedScenarioId === 'custom-csv') {
        // Use custom uploaded CSV
        const row = customCsvRows[h];
        hourlyInputs.push({
          hour: h,
          timeLabel: row.timeLabel,
          solarKw: row.solarKw,
          demandKw: row.demandKw,
          importPrice: row.importPrice,
          exportPrice: row.exportPrice,
          gridCarbonIntensity: row.gridCarbonIntensity ?? 340,
          temperatureC: row.temperatureC ?? 22,
          cloudCoverPct: row.cloudCoverPct ?? 20,
          sunElevationDeg: 45,
          weatherCondition: 'Custom Uploaded Data',
        });
      } else {
        // Compute from Scenario + Solar Physics / Weather Forecast
        const weatherH = weatherData?.hourly[h];
        const cloudCover = weatherH ? weatherH.cloudCoverPct : activeScenario.defaultCloudCover;
        const tempC = weatherH ? weatherH.temperatureC : 22;

        const solarPhys = calculateSolarOutput({
          latitude: solarConfig.latitude,
          longitude: solarConfig.longitude,
          dayOfYear: 180, // Mid summer / representative
          hourOfDay: h,
          cloudCoverPct: cloudCover,
          ambientTempC: tempC,
          ratedKwp: solarConfig.ratedCapacityKwp,
          systemEfficiencyPct: solarConfig.systemEfficiencyPct,
        });

        hourlyInputs.push({
          hour: h,
          timeLabel: `${h.toString().padStart(2, '0')}:00`,
          solarKw: solarPhys.solarKw,
          demandKw: activeScenario.baseDemandProfile[h] ?? 1.5,
          importPrice: activeScenario.importPriceProfile[h] ?? 0.2,
          exportPrice: activeScenario.exportPriceProfile[h] ?? 0.08,
          gridCarbonIntensity: activeScenario.gridCarbonProfile[h] ?? 320,
          temperatureC: tempC,
          cloudCoverPct: cloudCover,
          sunElevationDeg: solarPhys.sunElevationDeg,
          weatherCondition: weatherH?.weatherDescription || 'Sunny / Clear',
        });
      }
    }

    return runOptimization({
      hourlyInputs,
      batteryConfig,
      gridConfig,
      userPreferences,
    });
  }, [
    selectedScenarioId,
    customCsvRows,
    activeScenario,
    weatherData,
    solarConfig,
    batteryConfig,
    gridConfig,
    userPreferences,
  ]);

  const currentPoint = points[currentHour] || points[0];

  const handleDownloadCsvSchedule = () => {
    const csvStr = exportScheduleToCsv(points);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `optimized_energy_schedule_${selectedScenarioId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadCsvData = (rows: ParsedCsvRow[], filename: string) => {
    setCustomCsvRows(rows);
    setCustomFileName(filename);
    setSelectedScenarioId('custom-csv');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={(id) => setSelectedScenarioId(id)}
        isWeatherLive={!!weatherData?.isLiveApi}
        weatherLocation={weatherData?.cityName || solarConfig.cityName}
        onRefreshWeather={loadWeather}
        isLoadingWeather={isLoadingWeather}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onToggleAiAdvisor={() => setIsAiAdvisorOpen(!isAiAdvisorOpen)}
        isAiAdvisorOpen={isAiAdvisorOpen}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenImageToVideo={() => setIsImageToVideoOpen(true)}
        controlMode={userPreferences.inverterControlMode.replace('_', ' ')}
      />

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        {/* Scenario Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              Active Scenario: <strong className="text-emerald-400 font-bold">{selectedScenarioId === 'custom-csv' ? `Custom Data (${customFileName})` : activeScenario.name}</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              {selectedScenarioId === 'custom-csv' ? 'Loaded from user CSV file' : activeScenario.description}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadCsvSchedule}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Export Full 24h Optimized Schedule to CSV"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export Schedule CSV</span>
            </button>
          </div>
        </div>

        {/* 24-Hour Interactive Timeline Scrubber & Player */}
        <LiveSimulationBar
          currentHour={currentHour}
          onHourChange={(h) => setCurrentHour(h)}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={(s) => setPlaybackSpeed(s)}
          currentPoint={currentPoint}
        />

        {/* Real-Time Telemetry Gauges */}
        <MetricCards
          currentPoint={currentPoint}
          summary={summary}
          batteryConfig={batteryConfig}
        />

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Visual Energy Flow & Baseline Benchmark */}
          <div className="lg:col-span-5 space-y-4">
            <EnergyFlowDiagram currentPoint={currentPoint} />
            <StrategyComparisonCard summary={summary} />
          </div>

          {/* Right Column: Multi-Variable Chart, Battery Degradation Chart & 24h Hourly Dispatch Table */}
          <div className="lg:col-span-7 space-y-4">
            {/* Chart Mode Tabs */}
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveChartTab('DISPATCH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeChartTab === 'DISPATCH'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SunMedium className="w-3.5 h-3.5" />
                  <span>24h Power & Tariff Dispatch</span>
                </button>
                <button
                  onClick={() => setActiveChartTab('DEGRADATION')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeChartTab === 'DEGRADATION'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Cumulative Battery Degradation Cost</span>
                </button>
              </div>

              <button
                onClick={() => setActiveChartTab(activeChartTab === 'BOTH' ? 'DISPATCH' : 'BOTH')}
                className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeChartTab === 'BOTH'
                    ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Stack both charts vertically for simultaneous comparison"
              >
                <span>{activeChartTab === 'BOTH' ? 'Single View' : 'Stack Both Charts'}</span>
              </button>
            </div>

            {/* Power & Tariff Dispatch Chart */}
            {(activeChartTab === 'DISPATCH' || activeChartTab === 'BOTH') && (
              <OptimizationChart
                points={points}
                currentHour={currentHour}
                onSelectHour={(h) => setCurrentHour(h)}
              />
            )}

            {/* Cumulative Battery Degradation Cost Line Chart */}
            {(activeChartTab === 'DEGRADATION' || activeChartTab === 'BOTH') && (
              <BatteryDegradationChart
                points={points}
                currentHour={currentHour}
                onSelectHour={(h) => setCurrentHour(h)}
                batteryConfig={batteryConfig}
                summary={summary}
              />
            )}

            <HourlyScheduleTable
              points={points}
              currentHour={currentHour}
              onSelectHour={(h) => setCurrentHour(h)}
              onOpenExplainModal={(pt) => setExplainPoint(pt)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Smart Grid Energy Arbitrage Agent • Deterministic Safety-Critical Optimization Engine
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero-Loss Conservation Laws & Battery Reserve Interlocks Enforced
          </span>
        </div>
      </footer>

      {/* Modals & Slide-out Panels */}
      {explainPoint && (
        <DecisionExplainModal
          point={explainPoint}
          onClose={() => setExplainPoint(null)}
          batteryConfig={batteryConfig}
        />
      )}

      {isSettingsOpen && (
        <BatterySettingsModal
          batteryConfig={batteryConfig}
          solarConfig={solarConfig}
          userPreferences={userPreferences}
          onSave={(newB, newS, newP) => {
            setBatteryConfig(newB);
            setSolarConfig(newS);
            setUserPreferences(newP);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isCsvModalOpen && (
        <CsvDataUploadModal
          onLoadCsvData={handleLoadCsvData}
          onClose={() => setIsCsvModalOpen(false)}
        />
      )}

      {isPythonModalOpen && (
        <PythonPackageViewer onClose={() => setIsPythonModalOpen(false)} />
      )}

      <AiEnergyAdvisor
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        currentPoint={currentPoint}
        summary={summary}
        scenarioName={selectedScenarioId === 'custom-csv' ? 'Custom Uploaded Data' : activeScenario.name}
      />

      <LiveVoiceConversationModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentPoint={currentPoint}
      />

      <ImageToVideoModal
        isOpen={isImageToVideoOpen}
        onClose={() => setIsImageToVideoOpen(false)}
      />
    </div>
  );
}
