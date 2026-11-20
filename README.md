# Solana Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/s97472091-pixel/makefun-gta6-neon/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solana Bay** is a sun-soaked open-world coastal crime game built from scratch in plain ES modules and Three.js, designed to boot completely offline with zero network requests and no build step.

Play as **Marco Reyes**, an ex-boat mechanic pulled back into the neon underbelly of Solana Bay after the **Pelican Syndicate** burns his harbor slip. Explore four distinct districts on foot or behind the wheel of six vehicle classes, take on a six-mission story campaign, trigger escalating five-star SBPD pursuits, hit the respray bay to lose heat, and stock up at the dockside armory.

## Features

- **Four Coastal Districts**: Coral Promenade (Art Deco beachfront & boardwalk), Alta Glass (downtown financial towers), Harbor Docks (industrial warehouses & marina pier), and Sunset Palms (mid-rise residential & neon strip).
- **Six Vehicle Classes**: Solara Coupe, Bayrunner Sedan, Coastline SUV, Riptide Sports, Dockhand Van, and SBPD Interceptor — with arcade drift physics, handbrake slides, nitro boost, damage states, and explosions.
- **Living City**: Lane-following traffic turning at intersections, strolling boardwalk and sidewalk pedestrians who flee gunshots and drop cash, plus rotating health/armor/cash pickups.
- **Five-Star Police & Combat**: Hitscan firearms (Fists, 9mm Sidearm, Compact SMG, Trench Shotgun), drive-by shooting, hostile gang ambushes, escalating police cruisers with flashing lightbars, dismounting officers, bust timer, and line-of-sight evasion.
- **Six-Mission Story Campaign + Free Roam**: Original characters (Marco Reyes, Elena Navarro, Tito Mendez, Victor Crane), objective beacons, GPS routing, dialogue subtitles, and localStorage autosave.
- **100% Procedural Assets**: CanvasTexture facades, asphalt, crosswalks, neon signs, beach sand, plus WebAudio synthesized engine, weapons, sirens, impacts, and chimes.

## Run Locally

```sh
node serve.ts
```

Then open `http://localhost:8080` in a desktop browser. You can also specify a custom port:

```sh
node serve.ts --port 8210
```

Deterministic showcase views (no input required):
- `?shot=start&seed=1` — Title cover over the live city
- `?shot=play&seed=1` — Active gameplay frame with HUD
- `?shot=end&seed=1` — High-heat pursuit / mission climax frame

## Controls

- **W A S D / Arrow Keys** — Move on foot / Drive
- **Mouse** — Look and aim (click canvas for pointer lock)
- **Left Click** — Fire weapon / Melee / Drive-by
- **Right Click** — Aim zoom
- **F or E** — Enter, steal, or exit vehicles; interact with Respray Bay & Armory
- **Space** — Jump (on foot) / Handbrake drift (driving)
- **Shift** — Sprint (on foot) / Turbo boost (driving)
- **1–4 / Mouse Wheel** — Switch weapons
- **R** — Reload | **H** — Horn | **V** — Mute audio | **M / Esc** — City Map & Pause Menu
