export const GameConfig = {
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  worldWidth: window.innerWidth * 8,
  worldHeight: window.innerHeight * 3,
  debug: false,
  disableSharkInteraction: false,
  infiniteStamina: false,

  camera: {
    lerpX: 0.1,
    lerpY: 0.1,
  },

  ground: {
    baseHeight: 300,
    quality: 40,
    resolution: 0.001,
    maxHeight: 300,
    surfraceRoughness: 10,
  },

  surface: {
    height: 500,
  },

  boids: {
    count: 400,
    minSize: 10,
    maxSize: 25,
    maxSpeed: 2,
    maxForce: 0.05,
    collisionRadius: 20,
  },
};
