export class GameConfig {
    private static instance: GameConfig;
    
    public windowWidth = 800;
    public windowHeight = 600;
    public worldWidth = 4000;  // 5x larger than window
    public worldHeight = 3000; // 5x larger than window
    public debug = false;
    public cameraLerpX = 0.1;  // Smooth camera follow (lower = smoother)
    public cameraLerpY = 0.1;  // Smooth camera follow (lower = smoother)

    private constructor() {}

    static getInstance(): GameConfig {
        if (!GameConfig.instance) {
            GameConfig.instance = new GameConfig();
        }
        return GameConfig.instance;
    }

    toggleDebug(): void {
        this.debug = !this.debug;
    }
} 