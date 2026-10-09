/**
 * CSV Data Importer, Validator, and Exporter for Home Energy Telemetry.
 */

import { HourlyEnergyPoint } from '../types/energy';

export interface ParsedCsvRow {
  hour: number;
  timeLabel: string;
  solarKw: number;
  demandKw: number;
  importPrice: number;
  exportPrice: number;
  gridCarbonIntensity?: number;
  temperatureC?: number;
  cloudCoverPct?: number;
}

export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rows: ParsedCsvRow[];
}

/**
 * Parses and validates raw CSV content.
 */
export function parseAndValidateCsv(csvText: string): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: ParsedCsvRow[] = [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return {
      valid: false,
      errors: ['File is empty or contains only a header line.'],
      warnings: [],
      rows: [],
    };
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const findCol = (keywords: string[]) => {
    return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const hourIdx = findCol(['hour', 'time', 'timestamp']);
  const solarIdx = findCol(['solar', 'generation', 'pv']);
  const demandIdx = findCol(['demand', 'consumption', 'load', 'household']);
  const importPriceIdx = findCol(['import_price', 'price', 'tariff', 'buy_price', 'rate']);
  const exportPriceIdx = findCol(['export_price', 'feed_in', 'sell_price', 'export']);
  const carbonIdx = findCol(['carbon', 'emission', 'co2']);
  const tempIdx = findCol(['temp', 'temperature']);
  const cloudIdx = findCol(['cloud', 'cloud_cover']);

  if (solarIdx === -1) errors.push('Missing column for solar generation (e.g., "solar_kw").');
  if (demandIdx === -1) errors.push('Missing column for household demand (e.g., "demand_kw").');
  if (importPriceIdx === -1) warnings.push('No import price column found; using default $0.22/kWh.');

  if (errors.length > 0) {
    return { valid: false, errors, warnings, rows: [] };
  }

  for (let i = 1; i < lines.length && rows.length < 24; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    const rowHour = hourIdx !== -1 ? parseInt(parts[hourIdx], 10) : rows.length;
    const hourVal = isNaN(rowHour) ? rows.length : Math.max(0, Math.min(23, rowHour));

    let solar = solarIdx !== -1 ? parseFloat(parts[solarIdx]) : 0;
    let demand = demandIdx !== -1 ? parseFloat(parts[demandIdx]) : 1.5;
    let impPrice = importPriceIdx !== -1 ? parseFloat(parts[importPriceIdx]) : 0.22;
    let expPrice = exportPriceIdx !== -1 ? parseFloat(parts[exportPriceIdx]) : impPrice * 0.4;
    const carbon = carbonIdx !== -1 ? parseFloat(parts[carbonIdx]) : 320;
    const temp = tempIdx !== -1 ? parseFloat(parts[tempIdx]) : 22;
    const cloud = cloudIdx !== -1 ? parseFloat(parts[cloudIdx]) : 20;

    // Sanitize non-negative values
    if (isNaN(solar) || solar < 0) {
      warnings.push(`Row ${i}: Negative or invalid solar reading set to 0.`);
      solar = 0;
    }
    if (isNaN(demand) || demand < 0) {
      warnings.push(`Row ${i}: Negative or invalid demand reading set to 1.0 kW.`);
      demand = 1.0;
    }
    if (isNaN(impPrice)) impPrice = 0.22;
    if (isNaN(expPrice)) expPrice = 0.08;

    rows.push({
      hour: hourVal,
      timeLabel: `${hourVal.toString().padStart(2, '0')}:00`,
      solarKw: Math.round(solar * 100) / 100,
      demandKw: Math.round(demand * 100) / 100,
      importPrice: Math.round(impPrice * 100) / 100,
      exportPrice: Math.round(expPrice * 100) / 100,
      gridCarbonIntensity: isNaN(carbon) ? 320 : Math.round(carbon),
      temperatureC: isNaN(temp) ? 22 : Math.round(temp),
      cloudCoverPct: isNaN(cloud) ? 20 : Math.round(cloud),
    });
  }

  // Ensure 24 hours
  if (rows.length < 24) {
    warnings.push(`CSV had only ${rows.length} rows; padded remaining hours with standard baseline.`);
    const lastRow = rows[rows.length - 1] || {
      hour: 0,
      timeLabel: '00:00',
      solarKw: 0,
      demandKw: 1.2,
      importPrice: 0.18,
      exportPrice: 0.06,
      gridCarbonIntensity: 350,
      temperatureC: 18,
      cloudCoverPct: 20,
    };
    for (let h = rows.length; h < 24; h++) {
      rows.push({
        ...lastRow,
        hour: h,
        timeLabel: `${h.toString().padStart(2, '0')}:00`,
        solarKw: h >= 7 && h <= 18 ? 3.5 : 0,
      });
    }
  }

  return {
    valid: true,
    errors: [],
    warnings,
    rows: rows.slice(0, 24),
  };
}

/**
 * Generates sample CSV string for users to download and inspect.
 */
export function generateSampleCsvString(): string {
  const headers = [
    'timestamp',
    'hour',
    'solar_kw',
    'demand_kw',
    'import_price_usd',
    'export_price_usd',
    'grid_carbon_g_kwh',
    'ambient_temp_c',
    'cloud_cover_pct',
  ];

  const rows = [
    '2026-10-08 00:00,0,0.00,1.20,0.12,0.05,380,16,10',
    '2026-10-08 01:00,1,0.00,1.05,0.12,0.05,390,15,10',
    '2026-10-08 02:00,2,0.00,0.95,0.12,0.05,400,15,10',
    '2026-10-08 03:00,3,0.00,0.90,0.12,0.05,390,14,10',
    '2026-10-08 04:00,4,0.00,1.00,0.12,0.05,370,14,15',
    '2026-10-08 05:00,5,0.00,1.40,0.14,0.06,350,15,20',
    '2026-10-08 06:00,6,0.30,2.80,0.18,0.08,310,16,20',
    '2026-10-08 07:00,7,1.80,3.20,0.22,0.09,240,18,20',
    '2026-10-08 08:00,8,3.50,2.50,0.22,0.08,180,20,15',
    '2026-10-08 09:00,9,4.80,2.20,0.20,0.07,120,22,10',
    '2026-10-08 10:00,10,5.80,2.10,0.19,0.06,90,24,10',
    '2026-10-08 11:00,11,6.40,2.30,0.18,0.05,75,26,10',
    '2026-10-08 12:00,12,6.50,2.60,0.17,0.05,70,27,10',
    '2026-10-08 13:00,13,6.20,3.00,0.17,0.06,85,28,10',
    '2026-10-08 14:00,14,5.40,3.80,0.22,0.09,140,28,15',
    '2026-10-08 15:00,15,4.10,4.20,0.32,0.18,220,27,15',
    '2026-10-08 16:00,16,2.50,4.50,0.48,0.38,390,25,20',
    '2026-10-08 17:00,17,1.00,4.80,0.54,0.42,460,24,20',
    '2026-10-08 18:00,18,0.10,4.60,0.54,0.40,480,22,25',
    '2026-10-08 19:00,19,0.00,3.90,0.46,0.28,440,21,25',
    '2026-10-08 20:00,20,0.00,3.10,0.34,0.15,400,20,20',
    '2026-10-08 21:00,21,0.00,2.40,0.22,0.08,370,19,20',
    '2026-10-08 22:00,22,0.00,1.80,0.16,0.06,360,18,15',
    '2026-10-08 23:00,23,0.00,1.30,0.12,0.05,370,17,15',
  ];

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Exports optimized schedule to CSV.
 */
export function exportScheduleToCsv(points: HourlyEnergyPoint[]): string {
  const headers = [
    'hour',
    'time',
    'solar_kw',
    'demand_kw',
    'import_price',
    'export_price',
    'agent_action',
    'battery_soc_pct',
    'battery_charge_kw',
    'battery_discharge_kw',
    'grid_import_kw',
    'grid_export_kw',
    'agent_cost_usd',
    'baseline_cost_usd',
    'savings_usd',
    'confidence_pct',
    'rationale',
  ];

  const lines = points.map((p) =>
    [
      p.hour,
      p.timeLabel,
      p.solarKw.toFixed(2),
      p.demandKw.toFixed(2),
      p.importPrice.toFixed(2),
      p.exportPrice.toFixed(2),
      p.agent.action,
      p.agent.batterySocPct.toFixed(1),
      p.agent.batteryChargeKw.toFixed(2),
      p.agent.batteryDischargeKw.toFixed(2),
      p.agent.gridImportKw.toFixed(2),
      p.agent.gridExportKw.toFixed(2),
      p.agent.netCost.toFixed(3),
      p.baseline.netCost.toFixed(3),
      p.agent.netSavingsVsBaseline.toFixed(3),
      p.agent.confidencePct,
      `"${p.agent.rationale.replace(/"/g, '""')}"`,
    ].join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}
