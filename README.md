# Solana Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solana Bay is a 3D open-world coastal crime game built with plain ES modules and vendored Three.js, playable completely offline in a desktop browser with zero external network requests.

Play as Dante Vega, an ex-harbor wheelman taking back the coast from Hector Salgado's Marea Roja syndicate across four sun-drenched districts: **Miramar Strip**, **Alba Financial**, **Calle Verde**, and **Puerto Ferro**.

## Features

- **Open-World Coastal City**: A 6x6 city block grid with procedural Art Deco hotels, glass skyscrapers, stucco streetscapes, industrial shipping yards, a palm-lined beachfront boardwalk, golden sand beach, and Coral Key Marina Pier.
- **Vehicles & Living Traffic**: Six vehicle classes (Solara GT, Vaquero V8, Palma LX, Cabo XL, Brutus Cargo, SBPD Interceptor) with arcade drift physics, nitro boost, intersection-turning traffic, carjacking, damage states, and explosions.
- **On-Foot & Drive-By Combat**: Articulated low-poly character with walk/sprint/jump, Fists, M9 Coastal pistol, Viper SMG, and Breacher 12G shotgun, hitscan tracers, hostile syndicate AI, and pickups.
- **5-Star SBPD Pursuits**: Escalating police cruisers with flashing lightbars and sirens, dismounting officers, close-range bust timers, out-of-sight evasion countdowns, and wanted-clearing resprays at El Sol Customs.
- **6-Mission Story & Free Roam**: Full six-mission narrative chain with dialogue subtitles, GPS routing, objective beacons, El Sol Customs respray garage, Ironworks Armory, localStorage career saves, and procedural WebAudio SFX.

## Run Locally

Start the local static server from the repository root (Node.js 22+):

```sh
node serve.ts
```

Then open `http://localhost:8080` in Chrome or any modern desktop browser. To use a custom port:

```sh
node serve.ts --port 8210
```

### Controls

- **W A S D / Arrows**: Move on foot or drive
- **Mouse**: Look and aim (click viewport for Pointer Lock)
- **Left Click**: Shoot / melee punch / drive-by
- **Right Click**: Zoom aim
- **F / E**: Enter, steal, or exit vehicle / interact
- **Space**: Jump (on foot) / Handbrake drift (in vehicle)
- **Shift**: Sprint (on foot) / Nitro boost (in vehicle)
- **1–4 / Mouse Wheel**: Switch weapons
- **R**: Reload · **H**: Horn · **V**: Mute audio · **M / Esc**: Full city map & menu
