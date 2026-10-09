import React, { useState } from 'react';
import { X, BatteryCharging, Save, Shield, RotateCcw } from 'lucide-react';
import { BatteryConfig, SolarSystemConfig, UserPreferences } from '../types/energy';

interface BatterySettingsModalProps {
  batteryConfig: BatteryConfig;
  solarConfig: SolarSystemConfig;
  userPreferences: UserPreferences;
  onSave: (
    newBattery: BatteryConfig,
    newSolar: SolarSystemConfig,
    newPrefs: UserPreferences
  ) => void;
  onClose: () => void;
}

export const BatterySettingsModal: React.FC<BatterySettingsModalProps> = ({
  batteryConfig,
  solarConfig,
  userPreferences,
  onSave,
  onClose,
}) => {
  const [bConfig, setBConfig] = useState<BatteryConfig>({ ...batteryConfig });
  const [sConfig, setSConfig] = useState<SolarSystemConfig>({ ...solarConfig });
  const [prefs, setPrefs] = useState<UserPreferences>({ ...userPreferences });

  const handleReset = () => {
    setBConfig({
      usableCapacityKwh: 13.5,
      maxChargeRateKw: 5.0,
      maxDischargeRateKw: 5.0,
      roundTripEfficiencyPct: 92,
      minReserveSocPct: 15,
      maxSocPct: 95,
      initialSocPct: 40,
      degradationCostPerKwh: 0.04,
    });
    setSConfig({
      ratedCapacityKwp: 6.6,
      inverterCapacityKw: 6.0,
      tiltDegrees: 30,
      azimuthDegrees: 180,
      systemEfficiencyPct: 85,
      latitude: 37.77,
      longitude: -122.41,
      cityName: 'San Francisco, CA',
    });
  };

  const handleSave = () => {
    onSave(bConfig, sConfig, prefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Hardware Specs & Arbitrage Parameters
              </h2>
              <span className="text-xs text-slate-400">
                Configure battery chemistry, inverter C-rate, and control policies
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="py-4 space-y-5 text-xs">
          {/* Section 1: Battery Hardware */}
          <div>
            <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              Battery Energy Storage System (BESS)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Usable Capacity (kWh)</label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="50"
                  value={bConfig.usableCapacityKwh}
                  onChange={(e) =>
                    setBConfig({ ...bConfig, usableCapacityKwh: parseFloat(e.target.value) || 10 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Max Charge / Discharge Rate (kW)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="20"
                  value={bConfig.maxChargeRateKw}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 5;
                    setBConfig({ ...bConfig, maxChargeRateKw: val, maxDischargeRateKw: val });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Min Backup Reserve SOC (%)</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={bConfig.minReserveSocPct}
                  onChange={(e) =>
                    setBConfig({ ...bConfig, minReserveSocPct: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Reserved for blackout resiliency</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Round-Trip Efficiency (%)</label>
                <input
                  type="number"
                  min="70"
                  max="98"
                  value={bConfig.roundTripEfficiencyPct}
                  onChange={(e) =>
                    setBConfig({
                      ...bConfig,
                      roundTripEfficiencyPct: parseInt(e.target.value, 10) || 90,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Includes inverter and cell DC resistance</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Cycle Degradation Cost ($/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.20"
                  value={bConfig.degradationCostPerKwh}
                  onChange={(e) =>
                    setBConfig({
                      ...bConfig,
                      degradationCostPerKwh: parseFloat(e.target.value) || 0.04,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Amortized cell replacement cost</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Starting Simulation SOC (%)</label>
                <input
                  type="number"
                  min="10"
                  max="95"
                  value={bConfig.initialSocPct}
                  onChange={(e) =>
                    setBConfig({ ...bConfig, initialSocPct: parseInt(e.target.value, 10) || 40 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Solar PV Array */}
          <div className="pt-3 border-t border-slate-800">
            <h3 className="font-bold text-sm text-slate-200 mb-3">Solar Photovoltaic (PV) Array</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Rated Panel Capacity (kWp)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="30"
                  value={sConfig.ratedCapacityKwp}
                  onChange={(e) =>
                    setSConfig({ ...sConfig, ratedCapacityKwp: parseFloat(e.target.value) || 6.6 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">DC-AC System Efficiency (%)</label>
                <input
                  type="number"
                  min="60"
                  max="95"
                  value={sConfig.systemEfficiencyPct}
                  onChange={(e) =>
                    setSConfig({
                      ...sConfig,
                      systemEfficiencyPct: parseInt(e.target.value, 10) || 85,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Inverter Policy & Authorization */}
          <div className="pt-3 border-t border-slate-800">
            <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Safety & Inverter Dispatch Authorization
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={prefs.allowGridBatteryCharging}
                  onChange={(e) =>
                    setPrefs({ ...prefs, allowGridBatteryCharging: e.target.checked })
                  }
                  className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <span className="text-slate-200 font-medium block">
                    Allow Grid Battery Charging (Economic Arbitrage)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Permits the agent to pre-charge from the utility grid during off-peak or negative price intervals
                  </span>
                </div>
              </label>

              <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                <label className="text-slate-300 font-medium block mb-1">Inverter Dispatch Authorization Mode</label>
                <select
                  value={prefs.inverterControlMode}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      inverterControlMode: e.target.value as UserPreferences['inverterControlMode'],
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                >
                  <option value="RECOMMENDATION_ONLY">
                    Recommendation Only (Advisory - Zero Inverter Commands Sent)
                  </option>
                  <option value="SIMULATION">
                    Simulation Sandbox Mode (Virtual Battery Emulator)
                  </option>
                  <option value="AUTONOMOUS_CONTROL">
                    Autonomous Control (User Authorized via Local Modbus / SunSpec API)
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply & Re-optimize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
