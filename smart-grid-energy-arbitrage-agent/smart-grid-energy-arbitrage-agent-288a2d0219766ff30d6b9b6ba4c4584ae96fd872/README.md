# Smart Grid Energy Arbitrage Agent

A browser-based dashboard for exploring how rooftop solar, a home battery, household electricity use, and changing electricity prices interact over a 24-hour day.

## Features

- **Easy view** presents recommendations and energy results in plain language, including estimated savings, solar production, household use, battery charge, electricity bought or sent back, emissions, an hourly price chart, and a day plan.
- **Technical view** exposes the detailed charts, dispatch schedule, battery-degradation analysis, and system controls.
- **Day scenarios and time slider** let you explore example weather and electricity-price conditions and see how recommendations change by hour.
- **Energy data upload** accepts CSV spreadsheets with hourly readings. The upload dialog includes a sample file. It does not accept photos or other image files.
- **Battery settings** let you adjust the battery and system assumptions used by the simulation.
- **Ask about my plan** opens the energy advisor. A Gemini API key is needed for online AI responses; without one, the advisor uses its offline response.

Voice chat, video animation, and image explanation are not part of the current dashboard.

## Run locally

Install Node.js, open a terminal in the folder containing `package.json`, then install dependencies and start Vite.

In Windows PowerShell:

```powershell
npm.cmd install --legacy-peer-deps
npm.cmd run dev
```

In other terminals:

```sh
npm install --legacy-peer-deps
npm run dev
```

Open <http://localhost:3000/> in your browser. Keep the terminal running while using the app.

The legacy peer-dependency flag is needed because the current Vite and esbuild versions declared in the package manifest have a peer-version mismatch.

## Checks

In Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run build
```

In other terminals:

```sh
npm run lint
npm run build
```

`lint` runs the TypeScript check. `build` creates the production frontend in `dist/`.

## AI advisor configuration

Online Gemini responses require `GEMINI_API_KEY` to be available to the server process. Configure it through your hosting platform's secret manager or your local server environment. Never commit API keys; `.env` files are ignored by Git.

## Important

This app is a planning and simulation tool. Solar production, prices, costs, savings, battery behavior, and emissions are estimates based on the selected scenario and assumptions. The dashboard does not control solar panels, batteries, or utility equipment, and its estimates are not a utility bill.
