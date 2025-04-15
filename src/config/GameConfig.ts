export const GameConfig = {
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  worldWidth: window.innerWidth * 8,
  worldHeight: window.innerHeight * 4,
  debug: false,

  camera: {
    lerpX: 0.1,
    lerpY: 0.1,
  },

  ground: {
    baseHeight: 200,
    quality: 40,
    resolution: 0.001,
    maxHeight: 200,
    surfraceRoughness: 10,
  },

  surface: {
    height: 500,
  },

  boids: {
    count: 2000,
    minSize: 10,
    maxSize: 25,
    maxSpeed: 2,
    maxForce: 0.05,
    collisionRadius: 20,
  },
};
