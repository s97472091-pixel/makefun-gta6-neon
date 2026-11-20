# Solana Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solana Bay is a sun-soaked coastal open-world crime game built with Three.js and plain browser ES modules. Roam five distinct districts — from palm-lined Miramar Coast and the lantern-lit Pasar Senja night market to downtown Solana Core, industrial Puerto Bravo, and hillside Altura Heights — on foot or behind the wheel of six vehicle classes.

## Features

- Five-district 3D open world with beachfront boardwalk, marina pier, Pasar Senja night market stalls and hanging lanterns, day/night cycle, traffic, and pedestrians.
- Six-mission, two-act story campaign featuring original characters, multi-stage objectives, mission rating medals (Gold/Silver/Bronze), and post-campaign free roam.
- Three recruitable crew members with canvas portraits and active tactical abilities on keys Z, X, and C (Swap Plates, Quick Fix, Eyes Out).
- Five-star SBPD police response with pursuit cruisers, dismounting officers, a 4+ star helicopter, and a live tactical dispatch panel.
- Four checkpoint street races, five weapon slots with combat and drive-by shooting, twenty hidden Golden Herons, district reputation, RP rank progression, procedural WebAudio radio stations and SFX, and three save slots.

## Run Locally

Start the local server (Node 22+, no dependencies or build step):

```sh
node serve.ts
```

Then open `http://localhost:8080/index.html` in a desktop browser.

Deterministic showcase views:
- `http://localhost:8080/index.html?shot=cover&seed=1`
- `http://localhost:8080/index.html?shot=night&seed=1`
- `http://localhost:8080/index.html?shot=stats&seed=1`
- `http://localhost:8080/index.html?shot=title&seed=1`
