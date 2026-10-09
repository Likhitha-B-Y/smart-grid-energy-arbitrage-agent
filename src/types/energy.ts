/**
 * Energy Arbitrage Agent Data Types and System Interfaces
 */

export type AgentAction =
  | 'USE_SOLAR'
  | 'CHARGE_BATTERY'
  | 'DISCHARGE_BATTERY'
  | 'SELL_SURPLUS'
  | 'IMPORT_GRID'
  | 'HOLD';

export interface BatteryConfig {
  usableCapacityKwh: number;        // Usable capacity in kWh (e.g., 13.5 kWh)
  maxChargeRateKw: number;          // Max continuous charge in kW (e.g., 5.0 kW)
  maxDischargeRateKw: number;       // Max continuous discharge in kW (e.g., 5.0 kW)
  roundTripEfficiencyPct: number;   // Round-trip efficiency % (e.g., 92%)
  minReserveSocPct: number;         // Minimum safety backup buffer (e.g., 15%)
  maxSocPct: number;                // Maximum upper limit to prevent cell stress (e.g., 95%)
  initialSocPct: number;            // Starting SOC for simulation (e.g., 40%)
  degradationCostPerKwh: number;    // Amortized cycle degradation cost $/kWh (e.g., $0.04)
}

export interface SolarSystemConfig {
  ratedCapacityKwp: number;         // Rated DC panel size in kWp (e.g., 6.6 kWp)
  inverterCapacityKw: number;       // Max AC inverter throughput (e.g., 6.0 kW)
  tiltDegrees: number;              // Roof tilt (e.g., 30 deg)
  azimuthDegrees: number;           // Azimuth (180 = South in North Hemisphere)
  systemEfficiencyPct: number;      // Inverter & DC wiring efficiency (e.g., 85%)
  latitude: number;
  longitude: number;
  cityName: string;
}

export interface GridConfig {
  importCapacityLimitKw: number;    // Grid service connection limit (e.g., 12.0 kW)
  exportCapacityLimitKw: number;    // Utility solar export backfeed limit (e.g., 5.0 kW)
  feedInTariffRate: number;         // Flat feed-in tariff export rate $/kWh if not wholesale
  useDynamicExportPrice: boolean;   // Whether export price tracks wholesale or fixed tariff
  carbonIntensityAvgGpkwh: number;  // Base grid emissions in grams CO2 / kWh
}

export interface HourlyEnergyPoint {
  hour: number;                     // 0 to 23
  timeLabel: string;                // "00:00", "01:00", etc.
  solarKw: number;                  // Forecasted solar generation
  demandKw: number;                 // Forecasted household consumption
  importPrice: number;              // Grid electricity purchase price $/kWh
  exportPrice: number;              // Export feed-in compensation price $/kWh
  gridCarbonIntensity: number;      // Grid carbon factor gCO2/kWh
  temperatureC: number;
  cloudCoverPct: number;
  sunElevationDeg: number;
  weatherCondition: string;

  // Baseline Strategy Result (Naive Self-Consumption: solar -> home -> battery -> grid)
  baseline: {
    batterySocPct: number;
    solarDirectKw: number;
    batteryChargeKw: number;
    batteryDischargeKw: number;
    gridImportKw: number;
    gridExportKw: number;
    gridCost: number;               // Import cost - export revenue
    batteryDegradationCost: number;
    netCost: number;
    carbonEmissionsKg: number;
  };

  // Smart Arbitrage Agent Result (Optimal foresight LP/DP)
  agent: {
    action: AgentAction;
    batterySocPct: number;
    solarDirectKw: number;
    batteryChargeKw: number;
    batteryChargeSource: 'SOLAR' | 'GRID' | 'NONE';
    batteryDischargeKw: number;
    gridImportKw: number;
    gridExportKw: number;
    gridCost: number;               // Import cost - export revenue
    batteryDegradationCost: number;
    netCost: number;
    netSavingsVsBaseline: number;
    carbonEmissionsKg: number;
    carbonAvoidedKg: number;
    rationale: string;
    confidencePct: number;
  };
}

export interface OptimizationSummary {
  totalSolarGeneratedKwh: number;
  totalHouseholdDemandKwh: number;

  baselineTotalCost: number;
  baselineGridImportKwh: number;
  baselineGridExportKwh: number;
  baselineSelfConsumptionPct: number;
  baselineCarbonKg: number;

  agentTotalCost: number;
  agentGridImportKwh: number;
  agentGridExportKwh: number;
  agentSelfConsumptionPct: number;
  agentCarbonKg: number;

  totalSavingsDollars: number;
  savingsPercentage: number;
  netCarbonAvoidedKg: number;
  batteryCyclesEquivalent: number;
}

export interface UserPreferences {
  optimizationMode: 'COST_MINIMIZER' | 'MAX_SELF_CONSUMPTION' | 'CARBON_MINIMIZER' | 'BALANCED';
  backupReserveBufferPct: number;   // Extra emergency buffer during severe weather
  allowGridBatteryCharging: boolean; // Allow charging battery from grid off-peak
  allowExportFromBattery: boolean;  // Allow discharging battery directly to grid during extreme price spikes
  inverterControlMode: 'RECOMMENDATION_ONLY' | 'SIMULATION' | 'AUTONOMOUS_CONTROL';
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: string;
  text: string;
  metricsSnapshot?: {
    estSavings: number;
    activeAction: string;
    batterySoc: number;
  };
}
