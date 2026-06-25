# Bonewake Adventure

A standalone **walkable, dark-fantasy RPG** set in the Bonewake world: the plague
has won, the undead rule, and a Vanguard cell hunts the lost cure. Explore towns
and crypts on foot, recruit a party, trigger turn-based battles, and chase the
Cure-Research metaplot.

Built from the Bonewake asset + combat foundation (the gacha game lives in a
separate repo, [`roiify/bonewake`](https://github.com/roiify/bonewake)). This
project keeps the combat engine, sprite library, and hero/enemy data, and ships
**only the Adventure** — no summon/tower/collection meta.

- **Live:** https://roiify.github.io/bonewake-adventure/
- **Stack:** React 19 + Vite + Zustand + Dexie (IndexedDB) + Tailwind + PWA
- **Design bible:** [`docs/RPG_DESIGN.md`](docs/RPG_DESIGN.md)

## Dev

    npm install
    npm run dev        # http://localhost:5173/
    npm run build      # tsc + vite build

The overworld engine lives in `src/lib/adventure/`, maps in
`src/data/adventure/maps/`, and the Adventure save store in
`src/store/adventure.ts`. Battles reuse `src/lib/combat.ts` via the
`/battle/play/adv` handoff.
