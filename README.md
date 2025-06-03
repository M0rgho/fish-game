# Fish Game
A simple underwater game where you play as a shark swimming through a procedurally generated ocean environment. Hunt schools of fish and avoid obstacles.

![screenshot](./images/screenshot.png)

## Game specification

The game takes place in an ocean, where fish continuously respawn each time they're eaten by a shark. Your goal is to eat 500 fish as quickly as possible. The size of the world is dynamic and adapts to the window size.

### Features:
- Dynamic fish AI with boid flocking behavior
- Procedurally generated terrain with rocks, kelp, and coral
- Water surface effects
- Physics-based movement and collisions
- Ambient jellyfishes
- Atmospheric underwater environment with depth gradients and particle effects
- Smooth camera movement

### Controls:
- Move arrow keys
- Hold SPACE to sprint (uses stamina)
- Release SPACE to recover stamina

## Debug options
Type "debugfish" to display debug options.


## Deployment
The game is deployed and playable at: https://m0rgho.github.io/fish-game/


## How to run locally:
1. Install:
```
npm install
```
2. Start dev server:
```
npm run dev
```

## Technologies used
- Typescript
- Phaser.js 3
- Simplex-noise
- Custom QuadTree implementation 

---
Mikołaj Maślak, Szymon Głomski
