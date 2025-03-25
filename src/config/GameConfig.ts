export class GameConfig {
    private static instance: GameConfig;
    
    public windowWidth = 800;
    public windowHeight = 600;
    public debug = false;

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