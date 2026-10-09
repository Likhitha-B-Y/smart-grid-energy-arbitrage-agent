/**
 * Weather Service: Connects to the public Open-Meteo API or falls back to
 * physical clear-sky and meteorological modeling.
 */

export interface HourlyWeatherForecast {
  hour: number;
  timeString: string;
  temperatureC: number;
  cloudCoverPct: number;
  directNormalIrradianceWm2: number;
  diffuseRadiationWm2: number;
  globalHorizontalWm2: number;
  weatherCode: number;
  weatherDescription: string;
}

export interface WeatherFetchResult {
  isLiveApi: boolean;
  sourceLabel: string;
  cityName: string;
  hourly: HourlyWeatherForecast[];
  timestamp: string;
}

/**
 * Weather condition description helper
 */
export function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Mostly Sunny';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain / Drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly Cloudy';
}

/**
 * Fetch 24-hour weather forecast for the specified coordinates
 */
export async function fetchHourlyWeatherForecast(
  latitude: number,
  longitude: number,
  cityName: string = 'Current Location'
): Promise<WeatherFetchResult> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,cloud_cover,direct_normal_irradiance,diffuse_radiation,shortwave_radiation_instant,weather_code&forecast_days=2&timezone=auto`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo returned status ${response.status}`);
    }

    const data = await response.json();
    const times: string[] = data.hourly?.time || [];
    const temps: number[] = data.hourly?.temperature_2m || [];
    const clouds: number[] = data.hourly?.cloud_cover || [];
    const directIrradiance: number[] = data.hourly?.direct_normal_irradiance || [];
    const diffuseIrradiance: number[] = data.hourly?.diffuse_radiation || [];
    const shortwave: number[] = data.hourly?.shortwave_radiation_instant || [];
    const weatherCodes: number[] = data.hourly?.weather_code || [];

    // Slice first 24 hours of forecast
    const hourlyForecasts: HourlyWeatherForecast[] = [];
    const maxHours = Math.min(24, times.length);

    for (let i = 0; i < maxHours; i++) {
      const code = weatherCodes[i] ?? 1;
      hourlyForecasts.push({
        hour: i,
        timeString: times[i] ? times[i].substring(11, 16) : `${i.toString().padStart(2, '0')}:00`,
        temperatureC: Math.round((temps[i] ?? 20) * 10) / 10,
        cloudCoverPct: Math.round(clouds[i] ?? 20),
        directNormalIrradianceWm2: Math.round(directIrradiance[i] ?? 0),
        diffuseRadiationWm2: Math.round(diffuseIrradiance[i] ?? 0),
        globalHorizontalWm2: Math.round(shortwave[i] ?? (directIrradiance[i] || 0) + (diffuseIrradiance[i] || 0)),
        weatherCode: code,
        weatherDescription: getWeatherDescription(code),
      });
    }

    return {
      isLiveApi: true,
      sourceLabel: 'Live Open-Meteo API (Solar & Weather Forecast)',
      cityName,
      hourly: hourlyForecasts,
      timestamp: new Date().toISOString(),
    };
  } catch {
    // Graceful offline fallback with realistic diurnal curve
    return getSyntheticForecast(cityName);
  }
}

/**
 * High-fidelity synthetic 24h weather model for offline / testing mode
 */
export function getSyntheticForecast(cityName: string, cloudBiasPct: number = 20): WeatherFetchResult {
  const hourly: HourlyWeatherForecast[] = [];

  for (let h = 0; h < 24; h++) {
    // Diurnal temperature curve: minimum at 06:00, maximum at 15:00
    const tempCurve = Math.sin(((h - 9) / 12) * Math.PI);
    const tempC = 16 + 8 * Math.max(-0.5, tempCurve);

    // Diurnal cloud fluctuations with some variation around midday
    const clouds = Math.max(5, Math.min(95, cloudBiasPct + (h >= 11 && h <= 15 ? 15 * Math.sin(h) : 0)));

    // Synthetic solar irradiance curve peaking at 12:30
    let ghi = 0;
    if (h >= 6 && h <= 19) {
      const solarAngleFactor = Math.sin(((h - 6) / 13) * Math.PI);
      const clearSkyMax = 950 * Math.max(0, solarAngleFactor);
      ghi = clearSkyMax * (1 - 0.7 * (clouds / 100));
    }

    const weatherCode = clouds > 75 ? 3 : clouds > 40 ? 2 : 0;

    hourly.push({
      hour: h,
      timeString: `${h.toString().padStart(2, '0')}:00`,
      temperatureC: Math.round(tempC * 10) / 10,
      cloudCoverPct: Math.round(clouds),
      directNormalIrradianceWm2: Math.round(ghi * 0.7),
      diffuseRadiationWm2: Math.round(ghi * 0.3),
      globalHorizontalWm2: Math.round(ghi),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
    });
  }

  return {
    isLiveApi: false,
    sourceLabel: 'Physical Diurnal Simulation (Offline / Calibrated Model)',
    cityName,
    hourly,
    timestamp: new Date().toISOString(),
  };
}
