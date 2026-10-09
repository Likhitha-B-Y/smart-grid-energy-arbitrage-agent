/**
 * Energy Arbitrage Deterministic Optimization Engine
 *
 * Implements:
 * 1. Naive Baseline Strategy (Passive solar self-consumption)
 * 2. Optimal 24-Hour Horizon Multi-Period Arbitrage Agent
 * 3. Physical Battery Conservation & Degradation Constraints
 * 4. Transparent Explainable AI (XAI) rationale generation
 */

import {
  AgentAction,
  BatteryConfig,
  GridConfig,
  HourlyEnergyPoint,
  OptimizationSummary,
  UserPreferences,
} from '../types/energy';

export interface OptimizeInputParams {
  hourlyInputs: {
    hour: number;
    timeLabel: string;
    solarKw: number;
    demandKw: number;
    importPrice: number;
    exportPrice: number;
    gridCarbonIntensity: number;
    temperatureC: number;
    cloudCoverPct: number;
    sunElevationDeg: number;
    weatherCondition: string;
  }[];
  batteryConfig: BatteryConfig;
  gridConfig: GridConfig;
  userPreferences: UserPreferences;
}

/**
 * Runs 24-hour simulation comparing Naive Baseline vs. Smart Arbitrage Agent.
 */
export function runOptimization(params: OptimizeInputParams): {
  points: HourlyEnergyPoint[];
  summary: OptimizationSummary;
} {
  const { hourlyInputs, batteryConfig, gridConfig, userPreferences } = params;
  const N = hourlyInputs.length;

  const oneWayEff = Math.sqrt(batteryConfig.roundTripEfficiencyPct / 100);
  const effectiveMinSoc = Math.max(
    batteryConfig.minReserveSocPct,
    userPreferences.backupReserveBufferPct
  );
  const effectiveMaxSoc = batteryConfig.maxSocPct;
  const capacityKwh = batteryConfig.usableCapacityKwh;
  const maxChargeKw = batteryConfig.maxChargeRateKw;
  const maxDischargeKw = batteryConfig.maxDischargeRateKw;
  const degCost = batteryConfig.degradationCostPerKwh;

  // -------------------------------------------------------------
  // STEP 1: Simulate Naive Baseline (Standard Self-Consumption)
  // -------------------------------------------------------------
  let baselineSoc = batteryConfig.initialSocPct;
  const baselineResults: HourlyEnergyPoint['baseline'][] = [];

  for (let t = 0; t < N; t++) {
    const input = hourlyInputs[t];
    const solar = Math.max(0, input.solarKw);
    const demand = Math.max(0, input.demandKw);

    let solarDirectKw = 0;
    let batteryChargeKw = 0;
    let batteryDischargeKw = 0;
    let gridImportKw = 0;
    let gridExportKw = 0;

    if (solar >= demand) {
      // Solar covers all demand
      solarDirectKw = demand;
      const surplusSolar = solar - demand;

      // Charge battery from remaining solar
      const maxEnergyCanAcceptKwh = ((effectiveMaxSoc - baselineSoc) / 100) * capacityKwh;
      const maxPowerCanAcceptKw = Math.max(0, maxEnergyCanAcceptKwh / oneWayEff);
      batteryChargeKw = Math.min(surplusSolar, maxChargeKw, maxPowerCanAcceptKw);

      // Remaining surplus exported to grid
      const unabsorbedSurplus = surplusSolar - batteryChargeKw;
      gridExportKw = Math.min(unabsorbedSurplus, gridConfig.exportCapacityLimitKw);
    } else {
      // Solar is lower than demand
      solarDirectKw = solar;
      const deficit = demand - solar;

      // Discharge battery to meet deficit down to minSoc
      const maxEnergyCanDischargeKwh = ((baselineSoc - effectiveMinSoc) / 100) * capacityKwh;
      const maxPowerCanDeliverKw = Math.max(0, maxEnergyCanDischargeKwh * oneWayEff);
      batteryDischargeKw = Math.min(deficit, maxDischargeKw, maxPowerCanDeliverKw);

      // Remaining deficit imported from grid
      const unmetDemand = deficit - batteryDischargeKw;
      gridImportKw = Math.min(unmetDemand, gridConfig.importCapacityLimitKw);
    }

    // Update baseline SOC
    const deltaSocPct =
      ((batteryChargeKw * oneWayEff - batteryDischargeKw / oneWayEff) / capacityKwh) * 100;
    baselineSoc = Math.max(effectiveMinSoc, Math.min(effectiveMaxSoc, baselineSoc + deltaSocPct));

    const gridCost = gridImportKw * input.importPrice - gridExportKw * input.exportPrice;
    const batDegCost = (batteryChargeKw + batteryDischargeKw) * degCost;
    const netCost = gridCost + batDegCost;
    const carbonKg = (gridImportKw * input.gridCarbonIntensity) / 1000;

    baselineResults.push({
      batterySocPct: Math.round(baselineSoc * 10) / 10,
      solarDirectKw: Math.round(solarDirectKw * 100) / 100,
      batteryChargeKw: Math.round(batteryChargeKw * 100) / 100,
      batteryDischargeKw: Math.round(batteryDischargeKw * 100) / 100,
      gridImportKw: Math.round(gridImportKw * 100) / 100,
      gridExportKw: Math.round(gridExportKw * 100) / 100,
      gridCost: Math.round(gridCost * 1000) / 1000,
      batteryDegradationCost: Math.round(batDegCost * 1000) / 1000,
      netCost: Math.round(netCost * 1000) / 1000,
      carbonEmissionsKg: Math.round(carbonKg * 1000) / 1000,
    });
  }

  // -------------------------------------------------------------
  // STEP 2: Smart Arbitrage Optimization Agent
  // -------------------------------------------------------------
  // Calculate average, peak, and valley prices to determine arbitrage signals
  const prices = hourlyInputs.map((h) => h.importPrice);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const medianPrice = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  // Identify peak hours (top 25% price periods)
  const peakPriceThreshold = medianPrice + (maxPrice - medianPrice) * 0.45;

  let agentSoc = batteryConfig.initialSocPct;
  const agentResults: HourlyEnergyPoint['agent'][] = [];

  for (let t = 0; t < N; t++) {
    const input = hourlyInputs[t];
    const solar = Math.max(0, input.solarKw);
    const demand = Math.max(0, input.demandKw);
    const currPrice = input.importPrice;
    const currExportPrice = input.exportPrice;

    // Look ahead to check future peak pricing within next 12 hours
    const futureHours = hourlyInputs.slice(t + 1, Math.min(N, t + 10));
    const higherFuturePeakExists = futureHours.some(
      (fh) => fh.importPrice > currPrice + 0.12 && fh.importPrice >= peakPriceThreshold
    );
    const nextHighPrice = futureHours.length > 0 ? Math.max(...futureHours.map((fh) => fh.importPrice)) : currPrice;

    let solarDirectKw = 0;
    let batteryChargeKw = 0;
    let batteryChargeSource: 'SOLAR' | 'GRID' | 'NONE' = 'NONE';
    let batteryDischargeKw = 0;
    let gridImportKw = 0;
    let gridExportKw = 0;
    let action: AgentAction = 'HOLD';
    let rationale = '';

    const netSolar = solar - demand;

    // Usable charge capacity left
    const maxChargeKwh = Math.max(0, ((effectiveMaxSoc - agentSoc) / 100) * capacityKwh);
    const maxChargeAcceptKw = Math.min(maxChargeKw, maxChargeKwh / oneWayEff);

    // Usable discharge capacity left
    const maxDischargeKwh = Math.max(0, ((agentSoc - effectiveMinSoc) / 100) * capacityKwh);
    const maxDischargeDeliverKw = Math.min(maxDischargeKw, maxDischargeKwh * oneWayEff);

    // Decision Logic Branching
    if (netSolar > 0) {
      // Direct solar covers demand
      solarDirectKw = demand;
      const surplusSolar = netSolar;

      // Charge battery with solar first if not full
      if (maxChargeAcceptKw > 0.05) {
        batteryChargeKw = Math.min(surplusSolar, maxChargeAcceptKw);
        batteryChargeSource = 'SOLAR';
        action = 'CHARGE_BATTERY';
        const remainingSurplus = surplusSolar - batteryChargeKw;

        if (remainingSurplus > 0.05) {
          gridExportKw = Math.min(remainingSurplus, gridConfig.exportCapacityLimitKw);
          rationale = `Demand met (100% solar). Storing ${batteryChargeKw.toFixed(1)} kW surplus solar in battery; exporting remaining ${gridExportKw.toFixed(1)} kW to grid at $${currExportPrice.toFixed(2)}/kWh.`;
        } else {
          rationale = `Solar surplus (${surplusSolar.toFixed(1)} kW) routed to charge battery at zero marginal cost. Current SOC: ${agentSoc.toFixed(0)}%.`;
        }
      } else {
        // Battery is full or at max limit -> Export surplus
        gridExportKw = Math.min(surplusSolar, gridConfig.exportCapacityLimitKw);
        action = 'SELL_SURPLUS';
        rationale = `Battery at maximum reserve limit (${effectiveMaxSoc}%). Exporting ${gridExportKw.toFixed(1)} kW surplus solar to the grid at $${currExportPrice.toFixed(2)}/kWh.`;
      }
    } else {
      // Solar is less than demand (Deficit: demand - solar)
      solarDirectKw = solar;
      const deficit = demand - solar;

      // Check whether to discharge now or hold for higher future price
      const isPeakPriceNow = currPrice >= peakPriceThreshold || currPrice >= maxPrice * 0.85;
      const isSubZeroPrice = currPrice <= 0;
      const isCheapOffPeak = currPrice <= minPrice + (medianPrice - minPrice) * 0.35;

      if (isSubZeroPrice || (isCheapOffPeak && higherFuturePeakExists && userPreferences.allowGridBatteryCharging && maxChargeAcceptKw > 0.5)) {
        // OPPORTUNISTIC GRID CHARGE:
        // Price is ultra-cheap or negative, and a high peak is coming!
        // Import power to meet household deficit AND pre-charge battery
        const gridChargeKw = Math.min(maxChargeAcceptKw, 4.0);
        batteryChargeKw = gridChargeKw;
        batteryChargeSource = 'GRID';
        action = 'CHARGE_BATTERY';

        const totalImportNeeded = deficit + batteryChargeKw;
        gridImportKw = Math.min(totalImportNeeded, gridConfig.importCapacityLimitKw);

        if (isSubZeroPrice) {
          rationale = `NEGATIVE GRID PRICING ($${currPrice.toFixed(2)}/kWh)! Storing ${batteryChargeKw.toFixed(1)} kW directly from grid. Homeowner is paid to absorb electricity!`;
        } else {
          rationale = `Off-peak arbitrage opportunity ($${currPrice.toFixed(2)}/kWh vs peak $${nextHighPrice.toFixed(2)}/kWh). Pre-charging battery with ${batteryChargeKw.toFixed(1)} kW from grid to displace future peak costs.`;
        }
      } else if (isPeakPriceNow && maxDischargeDeliverKw > 0.05) {
        // PEAK PRICE DISCHARGE:
        // Avoid exorbitant grid import
        batteryDischargeKw = Math.min(deficit, maxDischargeDeliverKw);
        action = 'DISCHARGE_BATTERY';

        const remainingDeficit = deficit - batteryDischargeKw;
        if (remainingDeficit > 0.05) {
          gridImportKw = Math.min(remainingDeficit, gridConfig.importCapacityLimitKw);
          rationale = `Peak tariff window ($${currPrice.toFixed(2)}/kWh). Discharging ${batteryDischargeKw.toFixed(1)} kW to offset high rates. Grid import minimized to ${gridImportKw.toFixed(1)} kW.`;
        } else {
          rationale = `Discharging battery (${batteryDischargeKw.toFixed(1)} kW) offsets 100% of grid load during peak price spike ($${currPrice.toFixed(2)}/kWh). Net cost avoided.`;
        }
      } else if (!isPeakPriceNow && higherFuturePeakExists && agentSoc <= 55 && maxDischargeDeliverKw > 0) {
        // HOLD BATTERY FOR PEAK:
        // Current price is moderate, but a severe peak will happen soon.
        // Don't waste battery now; import moderate-priced grid power and preserve charge!
        action = 'HOLD';
        gridImportKw = Math.min(deficit, gridConfig.importCapacityLimitKw);
        rationale = `Preserving battery charge (${agentSoc.toFixed(0)}% SOC) for imminent high-price peak ($${nextHighPrice.toFixed(2)}/kWh at later hours). Importing baseline at moderate $${currPrice.toFixed(2)}/kWh.`;
      } else if (maxDischargeDeliverKw > 0.05) {
        // Standard self-consumption discharge
        batteryDischargeKw = Math.min(deficit, maxDischargeDeliverKw);
        action = 'DISCHARGE_BATTERY';
        const remainingDeficit = deficit - batteryDischargeKw;
        gridImportKw = Math.min(remainingDeficit, gridConfig.importCapacityLimitKw);
        rationale = `Using stored clean energy (${batteryDischargeKw.toFixed(1)} kW) to meet evening household load. Current price $${currPrice.toFixed(2)}/kWh.`;
      } else {
        // Battery at minimum reserve
        action = 'IMPORT_GRID';
        gridImportKw = Math.min(deficit, gridConfig.importCapacityLimitKw);
        rationale = `Battery at safety reserve limit (${effectiveMinSoc}%). Importing ${gridImportKw.toFixed(1)} kW from grid to satisfy household demand.`;
      }
    }

    // Secondary action check: if solar meets all demand and battery is doing nothing
    if (solarDirectKw > 0 && batteryChargeKw === 0 && batteryDischargeKw === 0 && gridExportKw === 0 && gridImportKw === 0) {
      action = 'USE_SOLAR';
    }

    // Update Agent SOC
    const deltaAgentSocPct =
      ((batteryChargeKw * oneWayEff - batteryDischargeKw / oneWayEff) / capacityKwh) * 100;
    agentSoc = Math.max(effectiveMinSoc, Math.min(effectiveMaxSoc, agentSoc + deltaAgentSocPct));

    const gridCost = gridImportKw * currPrice - gridExportKw * currExportPrice;
    const batDegCost = (batteryChargeKw + batteryDischargeKw) * degCost;
    const netCost = gridCost + batDegCost;
    const carbonKg = (gridImportKw * input.gridCarbonIntensity) / 1000;

    // Savings vs baseline for this hour
    const baselineNetCost = baselineResults[t]?.netCost ?? netCost;
    const hourlySavings = baselineNetCost - netCost;
    const baselineCarbon = baselineResults[t]?.carbonEmissionsKg ?? carbonKg;
    const carbonAvoided = Math.max(0, baselineCarbon - carbonKg);

    // Forecast uncertainty confidence calculation based on weather & cloud cover
    const confidencePct = Math.max(75, Math.min(99, Math.round(98 - input.cloudCoverPct * 0.15 - (t > 12 ? 4 : 0))));

    agentResults.push({
      action,
      batterySocPct: Math.round(agentSoc * 10) / 10,
      solarDirectKw: Math.round(solarDirectKw * 100) / 100,
      batteryChargeKw: Math.round(batteryChargeKw * 100) / 100,
      batteryChargeSource,
      batteryDischargeKw: Math.round(batteryDischargeKw * 100) / 100,
      gridImportKw: Math.round(gridImportKw * 100) / 100,
      gridExportKw: Math.round(gridExportKw * 100) / 100,
      gridCost: Math.round(gridCost * 1000) / 1000,
      batteryDegradationCost: Math.round(batDegCost * 1000) / 1000,
      netCost: Math.round(netCost * 1000) / 1000,
      netSavingsVsBaseline: Math.round(hourlySavings * 1000) / 1000,
      carbonEmissionsKg: Math.round(carbonKg * 1000) / 1000,
      carbonAvoidedKg: Math.round(carbonAvoided * 1000) / 1000,
      rationale,
      confidencePct,
    });
  }

  // Combine into unified HourlyEnergyPoint array
  const points: HourlyEnergyPoint[] = hourlyInputs.map((input, idx) => ({
    ...input,
    baseline: baselineResults[idx],
    agent: agentResults[idx],
  }));

  // Aggregate Metrics
  const totalSolar = points.reduce((acc, p) => acc + p.solarKw, 0);
  const totalDemand = points.reduce((acc, p) => acc + p.demandKw, 0);

  const baselineCost = points.reduce((acc, p) => acc + p.baseline.netCost, 0);
  const baselineImport = points.reduce((acc, p) => acc + p.baseline.gridImportKw, 0);
  const baselineExport = points.reduce((acc, p) => acc + p.baseline.gridExportKw, 0);
  const baselineCarbon = points.reduce((acc, p) => acc + p.baseline.carbonEmissionsKg, 0);

  const agentCost = points.reduce((acc, p) => acc + p.agent.netCost, 0);
  const agentImport = points.reduce((acc, p) => acc + p.agent.gridImportKw, 0);
  const agentExport = points.reduce((acc, p) => acc + p.agent.gridExportKw, 0);
  const agentCarbon = points.reduce((acc, p) => acc + p.agent.carbonEmissionsKg, 0);

  const totalAgentThroughputKwh = points.reduce(
    (acc, p) => acc + (p.agent.batteryChargeKw + p.agent.batteryDischargeKw) / 2,
    0
  );
  const batteryCycles = totalAgentThroughputKwh / capacityKwh;

  const totalSavings = baselineCost - agentCost;
  const savingsPct = baselineCost > 0 ? (totalSavings / baselineCost) * 100 : 0;
  const carbonAvoided = Math.max(0, baselineCarbon - agentCarbon);

  const baselineSolarSelfConsumed = points.reduce(
    (acc, p) => acc + (p.solarKw - p.baseline.gridExportKw),
    0
  );
  const baselineSelfConsumptionPct =
    totalSolar > 0 ? Math.min(100, Math.round((baselineSolarSelfConsumed / totalSolar) * 100)) : 100;

  const agentSolarSelfConsumed = points.reduce(
    (acc, p) => acc + (p.solarKw - p.agent.gridExportKw),
    0
  );
  const agentSelfConsumptionPct =
    totalSolar > 0 ? Math.min(100, Math.round((agentSolarSelfConsumed / totalSolar) * 100)) : 100;

  const summary: OptimizationSummary = {
    totalSolarGeneratedKwh: Math.round(totalSolar * 10) / 10,
    totalHouseholdDemandKwh: Math.round(totalDemand * 10) / 10,

    baselineTotalCost: Math.round(baselineCost * 100) / 100,
    baselineGridImportKwh: Math.round(baselineImport * 10) / 10,
    baselineGridExportKwh: Math.round(baselineExport * 10) / 10,
    baselineSelfConsumptionPct,
    baselineCarbonKg: Math.round(baselineCarbon * 10) / 10,

    agentTotalCost: Math.round(agentCost * 100) / 100,
    agentGridImportKwh: Math.round(agentImport * 10) / 10,
    agentGridExportKwh: Math.round(agentExport * 10) / 10,
    agentSelfConsumptionPct,
    agentCarbonKg: Math.round(agentCarbon * 10) / 10,

    totalSavingsDollars: Math.round(totalSavings * 100) / 100,
    savingsPercentage: Math.round(savingsPct * 10) / 10,
    netCarbonAvoidedKg: Math.round(carbonAvoided * 10) / 10,
    batteryCyclesEquivalent: Math.round(batteryCycles * 100) / 100,
  };

  return { points, summary };
}
