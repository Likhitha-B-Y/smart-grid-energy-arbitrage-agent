/**
 * Predefined realistic test scenarios for energy arbitrage evaluation.
 */

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Summer' | 'Winter' | 'Spring' | 'Extreme Events';
  tariffType: string;
  defaultCloudCover: number;
  // 24 hour demand profile in kW
  baseDemandProfile: number[];
  // 24 hour import price profile in $/kWh
  importPriceProfile: number[];
  // 24 hour export price profile in $/kWh
  exportPriceProfile: number[];
  // Grid carbon profile gCO2/kWh
  gridCarbonProfile: number[];
  notes: string;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'summer-extreme-tou',
    name: 'Summer Peak TOU (California / Texas Style)',
    description: 'High solar generation midday with extreme evening peak price surge ($0.12 off-peak vs $0.54 peak 17:00-21:00) and heavy air conditioning demand.',
    category: 'Summer',
    tariffType: '3-Tier Time-Of-Use',
    defaultCloudCover: 10,
    baseDemandProfile: [
      1.1, 1.0, 0.9, 0.9, 1.0, 1.4, 2.8, 3.2, 2.5, 2.2, 2.1, 2.3, 2.6, 3.0, 3.8, 4.2, 4.5, 4.8, 4.6, 3.9, 3.1, 2.4, 1.8, 1.3
    ],
    importPriceProfile: [
      0.12, 0.12, 0.12, 0.12, 0.12, 0.14, 0.18, 0.22, 0.22, 0.20, 0.19, 0.18, 0.17, 0.17, 0.22, 0.32, 0.48, 0.54, 0.54, 0.46, 0.34, 0.22, 0.16, 0.12
    ],
    exportPriceProfile: [
      0.05, 0.05, 0.05, 0.05, 0.05, 0.06, 0.08, 0.09, 0.08, 0.07, 0.06, 0.05, 0.05, 0.06, 0.09, 0.18, 0.38, 0.42, 0.40, 0.28, 0.15, 0.08, 0.06, 0.05
    ],
    gridCarbonProfile: [
      380, 390, 400, 390, 370, 350, 310, 240, 180, 120, 90, 75, 70, 85, 140, 220, 390, 460, 480, 440, 400, 370, 360, 370
    ],
    notes: 'Agent should charge battery with excess solar between 10:00-14:00, then discharge during 17:00-21:00 peak to offset high prices and grid emissions.',
  },
  {
    id: 'spring-negative-wholesale',
    name: 'Spring Duck Curve & Negative Pricing',
    description: 'Renewable overproduction in the afternoon drives wholesale grid prices negative (-$0.04/kWh). The grid pays you to consume energy!',
    category: 'Spring',
    tariffType: 'Dynamic Wholesale (e.g. Octopus Agile / ERCOT)',
    defaultCloudCover: 5,
    baseDemandProfile: [
      1.2, 1.0, 0.9, 0.8, 0.9, 1.5, 2.4, 2.6, 2.2, 1.9, 1.8, 1.9, 2.0, 2.1, 2.2, 2.5, 3.2, 3.8, 4.0, 3.5, 2.8, 2.1, 1.6, 1.3
    ],
    importPriceProfile: [
      0.14, 0.12, 0.11, 0.10, 0.11, 0.15, 0.24, 0.28, 0.16, 0.08, 0.02, -0.04, -0.05, -0.02, 0.04, 0.12, 0.29, 0.42, 0.38, 0.28, 0.22, 0.18, 0.15, 0.14
    ],
    exportPriceProfile: [
      0.06, 0.05, 0.05, 0.04, 0.05, 0.08, 0.14, 0.16, 0.06, 0.01, -0.01, -0.05, -0.06, -0.03, 0.01, 0.06, 0.18, 0.28, 0.24, 0.16, 0.10, 0.08, 0.07, 0.06
    ],
    gridCarbonProfile: [
      320, 330, 340, 330, 310, 290, 220, 160, 90, 45, 25, 15, 10, 20, 40, 110, 280, 390, 410, 370, 320, 310, 310, 310
    ],
    notes: 'Agent must stop exporting during negative pricing to avoid penalties, and opportunistically grid-charge the battery when prices are sub-zero.',
  },
  {
    id: 'winter-cloudy-heatpump',
    name: 'Winter Overcast with Heat Pump Spikes',
    description: 'Low solar yield (85% cloud cover) with morning and evening heating loads. Arbitrage relies on off-peak overnight grid charging to survive peak periods.',
    category: 'Winter',
    tariffType: 'Standard Time-Of-Use',
    defaultCloudCover: 85,
    baseDemandProfile: [
      2.8, 2.7, 2.6, 2.6, 2.9, 3.8, 5.2, 5.6, 4.4, 3.2, 2.8, 2.6, 2.7, 2.9, 3.4, 4.2, 5.8, 6.2, 5.9, 4.8, 3.9, 3.4, 3.1, 2.9
    ],
    importPriceProfile: [
      0.11, 0.11, 0.11, 0.11, 0.11, 0.14, 0.26, 0.38, 0.32, 0.22, 0.20, 0.20, 0.19, 0.19, 0.22, 0.34, 0.44, 0.46, 0.42, 0.32, 0.22, 0.16, 0.13, 0.11
    ],
    exportPriceProfile: [
      0.05, 0.05, 0.05, 0.05, 0.05, 0.06, 0.12, 0.18, 0.14, 0.09, 0.08, 0.08, 0.08, 0.08, 0.09, 0.15, 0.22, 0.24, 0.20, 0.14, 0.09, 0.07, 0.06, 0.05
    ],
    gridCarbonProfile: [
      410, 420, 430, 420, 400, 380, 440, 460, 420, 380, 350, 340, 330, 350, 380, 450, 510, 530, 500, 460, 430, 420, 410, 410
    ],
    notes: 'Because solar is weak, naive systems deplete early. The smart agent charges overnight at $0.11/kWh to shave the 07:00 and 18:00 heating peaks.',
  },
  {
    id: 'storm-watch-emergency',
    name: 'Severe Weather / Storm Watch Reserve',
    description: 'Incoming storm alert. The homeowner demands a 60% minimum battery backup reserve for grid resilience while minimizing energy costs before landfall.',
    category: 'Extreme Events',
    tariffType: 'Peak Demand & Resiliency Tariff',
    defaultCloudCover: 70,
    baseDemandProfile: [
      1.4, 1.3, 1.2, 1.2, 1.4, 1.8, 2.6, 2.8, 2.4, 2.1, 2.0, 2.2, 2.4, 2.6, 3.2, 3.6, 4.2, 4.5, 4.3, 3.6, 2.8, 2.2, 1.8, 1.5
    ],
    importPriceProfile: [
      0.15, 0.15, 0.15, 0.15, 0.15, 0.18, 0.25, 0.30, 0.28, 0.22, 0.20, 0.20, 0.19, 0.21, 0.28, 0.36, 0.45, 0.48, 0.44, 0.35, 0.25, 0.18, 0.16, 0.15
    ],
    exportPriceProfile: [
      0.07, 0.07, 0.07, 0.07, 0.07, 0.08, 0.12, 0.14, 0.12, 0.09, 0.08, 0.08, 0.08, 0.09, 0.12, 0.18, 0.24, 0.26, 0.22, 0.16, 0.11, 0.08, 0.07, 0.07
    ],
    gridCarbonProfile: [
      390, 400, 400, 390, 380, 360, 340, 310, 270, 220, 190, 180, 180, 200, 250, 330, 440, 470, 460, 410, 380, 380, 380, 390
    ],
    notes: 'Safety constraints lock battery SOC above 60%. Optimization operates strictly within the remaining 40% usable window to prevent emergency outage vulnerability.',
  },
];
