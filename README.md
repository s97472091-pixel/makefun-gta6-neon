[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLANA BAY

**Solana Bay** is a complete 3D open-world coastal crime game built in plain ES modules with Three.js (vendored offline, zero network requests, no build step).

Play as **Mateo Reyes** across four sun-drenched coastal districts—**Miramar Strip**, **Downtown Corona**, **Sunset Docks**, and **Palma Heights**—stealing cars, outrunning 5-star SBPD pursuits, and rising through six story missions to take the coast from kingpin **Dante Solis** and **Captain Harlan Vance**.

## Features

- **Sun-Soaked Coastal Open World**: Art-Deco neon hotels on Miramar Strip, glass towers in Downtown Corona, shipping yards and Marina Pier in Sunset Docks, hillside stucco villas in Palma Heights, golden beachfront, boardwalk, and animated ocean.
- **Vehicles & Traffic**: Six original vehicle classes (*Solara GT*, *Miramar Convertible*, *Vega Muscle*, *Palma SUV*, *Harbor Van*, *SBPD Interceptor*, plus tactical *SBPD Enforcer* vans and *SBPD Patrol Chopper*), AI lane traffic, carjacking, handbrake drifting, nitro boost, and stunt jump ramps.
- **Living City & 5-Star Wanted System**: Articulated pedestrians who stroll sidewalks and flee danger, witness heat reporting, escalating 5-star SBPD chases with interceptors, dismounting officers, roadblocks, SWAT vans, an overhead searchlight helicopter, line-of-sight evasion, and Vega's Respray Garage to wipe heat.
- **Story Missions & Combat**: Six connected story missions with Rico Vega, Elena Marisol, and Kira Chen; four weapons (Fists, 9mm Pistol, Viper SMG, Breaker Shotgun) with drive-by shooting, zoom aim, and Kira's Coastal Armory; hidden cash briefcases and stunt jumps.
- **Polish & Offline Audio**: Live rotating radar minimap, full city map pause menu, procedural Web Audio engine/siren/gunfire/fanfare synthesizer, golden-hour atmospheric sky shader, and `localStorage` career saves.

## Run Locally

Requires Node 22+ (no install or build step):

```bash
node serve.ts
```

Open `http://localhost:8080` in desktop Chrome.

### Deterministic Screenshot Modes

- Cover / Title: `http://localhost:8080/?shot=start&seed=1`
- Live Action / Chase: `http://localhost:8080/?shot=play&seed=1`
- Mission Complete: `http://localhost:8080/?shot=end&seed=1`

### Build Submission Dossier

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
