# BasebaLLM — Defensive Baseball Scheduler

A web-based tool for generating and managing defensive baseball game schedules. Built with Vue 3 + Vuetify 3 + Vite.

## Features

- **Roster management** — Add players with jersey numbers and position priorities (high / could / off) for `1B`, `2B`, `3B`, `SS`, and `OF`
- **Automated schedule generation** — Most-constrained-first position assignment with a seeded PRNG for variance across runs
- **Leniency slider** (1–5) — Controls how strictly position priorities are enforced when filling slots
- **Manual P/C assignment** — Assign pitchers and catchers per inning before generating; inning chips disable across slots to prevent double-booking
- **Absent players** — Mark players unavailable for a given game; they are excluded from scheduling and P/C dropdowns
- **Fair sit rotation** — Players sit in fewest-sits-first order; ties broken by who sat earliest
- **Drag & drop editing** — Swap players between positions and innings directly on the schedule table
  - **Algorithm mode** — Pins the swap and regenerates forward from that inning to maintain fairness
  - **Manual mode** — Raw cell swaps with no regeneration
- **Sit fairness warnings** — Alerts when the rotation violates the "no one sits twice before everyone sits once" rule
- **Save / Load / Delete schedules** — Schedules are persisted to `localStorage` with full state including P/C assignments and absent players
- **Prev / Next navigation** — Step through saved schedules from the schedule table toolbar
- **Saved Schedules page** — List view with clickable name links and double-click to view

## Stack

| | |
|---|---|
| Framework | Vue 3 (Options API) |
| UI | Vuetify 3 |
| Build | Vite 4 |
| Icons | Material Design Icons (CDN) |
| Persistence | `localStorage` |

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173` (or next available port).

```bash
npm run build    # production build → dist/
npm run dev      # preview production build
```

## Usage

1. **Roster** — Add players and set their position priorities using the colored buttons on each card
2. **Home** — Set the number of innings and leniency, mark any absent players, assign pitchers/catchers per inning, then click **Generate Schedule**
3. **Drag & drop** — Rearrange the generated table; toggle **Manual** mode for raw swaps
4. **Save** — Name and save the schedule; revisit it anytime from the **Schedules** page

## Project Structure

```
src/
  App.vue       # Single-file component — all UI and logic
  main.js       # Vue + Vuetify bootstrap
public/
index.html
vite.config.js
```
