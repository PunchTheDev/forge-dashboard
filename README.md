# forge-dashboard

Live leaderboard and 3D part viewer for the [Forge](https://github.com/PunchTheDev/forge) competitive CAD benchmark on Gittensor subnet 74.

## Features

- **Live leaderboard** — ranked by mass, auto-refreshes every 15s
- **SOTA over time** — step chart showing best score history
- **3D STEP viewer** — interactive WebGL viewer of submitted parts (occt-import-js)
- **Submission queue** — recent attempts with pass/fail status
- **Reproduce button** — one-click commands to verify any score locally

## Setup

Requires [forge-api](https://github.com/PunchTheDev/forge-api) running locally.

```bash
git clone https://github.com/PunchTheDev/forge-dashboard
cd forge-dashboard
npm install

# Start forge-api first (see forge-api README)
# Then:
npm run dev
```

Open http://localhost:5173.

## Configuration

```bash
cp .env.example .env
# Set VITE_API_URL if your forge-api runs elsewhere
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Architecture

```
src/
  lib/api.ts          — typed API client (reads from forge-api)
  hooks/useApi.ts     — polling fetch hook with auto-refresh
  components/
    App.tsx           — root layout, spec selection, state
    HeroStats.tsx     — SOTA mass / stress / submissions banner
    Leaderboard.tsx   — ranked table with stress bar
    SotaChart.tsx     — recharts step curve
    StepViewer.tsx    — Three.js + occt-import-js STEP renderer
    SubmissionPanel.tsx — recent submission log
    SpecCard.tsx      — problem selector card
```

## License

MIT
