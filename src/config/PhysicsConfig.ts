export class PhysicsConfig {
    private static instance: PhysicsConfig;

    // Water settings
    public readonly WATER_SURFACE_HEIGHT = 200;
    public readonly WATER_COLOR = 0x0066ff;
    public readonly WATER_ALPHA = 0.3;
    public readonly WATER_LINE_COLOR = 0x0099ff;

    // Physics constants
    public readonly GRAVITY = 0.2;
    public readonly WATER_RESISTANCE = 0.92;
    public readonly AIR_DRAG = 0.99;

    private constructor() {}

    public static getInstance(): PhysicsConfig {
        if (!PhysicsConfig.instance) {
            PhysicsConfig.instance = new PhysicsConfig();
        }
        return PhysicsConfig.instance;
    }
} 