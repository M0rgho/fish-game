export const GameConfig = {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    worldWidth: window.innerWidth * 4,
    worldHeight: window.innerHeight * 2,
    debug: false,

    camera: {
        lerpX: 0.1,
        lerpY: 0.1
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
    }
}