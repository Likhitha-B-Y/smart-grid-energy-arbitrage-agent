/**
 * Physical solar irradiance, sun angle, and PV panel output model.
 * Provides realistic clear-sky irradiance and temperature derating formulas.
 */

export interface SolarCalculationParams {
  latitude: number;
  longitude: number;
  dayOfYear: number; // 1 - 365
  hourOfDay: number; // 0 - 23
  cloudCoverPct: number; // 0 - 100
  ambientTempC: number;
  ratedKwp: number;
  systemEfficiencyPct: number;
}

/**
 * Calculates solar position and estimated AC power generation in kW.
 */
export function calculateSolarOutput(params: SolarCalculationParams): {
  solarKw: number;
  sunElevationDeg: number;
  clearSkyIrradianceWm2: number;
  effectiveIrradianceWm2: number;
} {
  const {
    latitude,
    dayOfYear,
    hourOfDay,
    cloudCoverPct,
    ambientTempC,
    ratedKwp,
    systemEfficiencyPct,
  } = params;

  // Solar declination angle delta in radians (Cooper's equation)
  const declination =
    23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear)) * (Math.PI / 180);

  // Solar hour angle omega (approx solar noon at 12:00)
  const hourAngle = (hourOfDay - 12) * 15 * (Math.PI / 180);
  const latRad = latitude * (Math.PI / 180);

  // Solar elevation angle alpha (sin alpha = sin phi * sin delta + cos phi * cos delta * cos omega)
  const sinAlpha =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

  const sunElevationRad = Math.asin(Math.max(-1, Math.min(1, sinAlpha)));
  const sunElevationDeg = sunElevationRad * (180 / Math.PI);

  if (sunElevationDeg <= 0) {
    return {
      solarKw: 0,
      sunElevationDeg: Math.round(sunElevationDeg * 10) / 10,
      clearSkyIrradianceWm2: 0,
      effectiveIrradianceWm2: 0,
    };
  }

  // Clear-sky irradiance model (Kasten-Czeplak / Haurwitz approximation)
  // Io ~ 1367 W/m2 solar constant, atmospheric transmission at zenith ~ 0.75
  const airMass = 1 / (Math.sin(sunElevationRad) + 0.50572 * Math.pow(sunElevationDeg + 6.07995, -1.6364));
  const clearSkyDirect = 1367 * Math.pow(0.72, Math.pow(Math.max(1, airMass), 0.678));
  const clearSkyGlobalWm2 = Math.max(0, clearSkyDirect * Math.sin(sunElevationRad) + 90 * Math.sin(sunElevationRad));

  // Cloud attenuation factor (Kasten and Czeplak model: G / G0 = 1 - 0.75 * (N/8)^3.4)
  const cloudFraction = Math.max(0, Math.min(1, cloudCoverPct / 100));
  const cloudTransmission = 1 - 0.75 * Math.pow(cloudFraction, 3.2);
  const effectiveIrradianceWm2 = Math.max(0, clearSkyGlobalWm2 * cloudTransmission);

  // PV Temperature coefficient: approx -0.4% per deg C above standard testing condition (25 C)
  // Cell temperature estimated via NOCT (Nominal Operating Cell Temp)
  const cellTempC = ambientTempC + (effectiveIrradianceWm2 / 800) * (45 - 20);
  const tempDerate = Math.max(0.75, 1 - 0.004 * Math.max(0, cellTempC - 25));

  // Standard Test Condition (STC) irradiance = 1000 W/m2
  const theoreticalDcKw = ratedKwp * (effectiveIrradianceWm2 / 1000) * tempDerate;
  const acPowerKw = theoreticalDcKw * (systemEfficiencyPct / 100);

  return {
    solarKw: Math.max(0, Math.round(acPowerKw * 100) / 100),
    sunElevationDeg: Math.round(sunElevationDeg * 10) / 10,
    clearSkyIrradianceWm2: Math.round(clearSkyGlobalWm2),
    effectiveIrradianceWm2: Math.round(effectiveIrradianceWm2),
  };
}
