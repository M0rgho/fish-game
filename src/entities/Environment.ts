import { createNoise2D } from 'simplex-noise';
import { GameConfig } from '../config/GameConfig';

export class Environment {
    private scene: Phaser.Scene;
    private config: typeof GameConfig;
    public groundBodies: Phaser.Physics.Arcade.StaticGroup;
    private surfaceLine: Phaser.GameObjects.Graphics;
    private surfaceTime: number = 0;
    private readonly SURFACE_AMPLITUDE = 10;
    private readonly SURFACE_FREQUENCY = 0.02;
    private readonly SURFACE_SPEED = 0.01;


    constructor(scene: Phaser.Scene, config: typeof GameConfig) {
        this.scene = scene;
        this.config = config;

        this.createBackground();
        // add second background layer to get squared color effect
        const bg2 = this.createBackground();
        bg2.setAlpha(0.7);

        this.createGround();
        this.createSurfaceLine();
    }

    private createGround() {
        const width = this.config.worldWidth;
        const height = this.config.worldHeight;
        const graphics = this.scene.add.graphics();

        // Create 2D noise generator function
        const noise2D = createNoise2D();
        const smallNoise2D = createNoise2D();

        // Generate points for the curve
        const points: Phaser.Math.Vector2[] = [];
        const baseY = this.config.worldHeight - this.config.ground.baseHeight;

        // Add starting point at bottom left
        points.push(new Phaser.Math.Vector2(0, height));
        points.push(new Phaser.Math.Vector2(0, baseY));

        // Generate terrain points
        for (let x = 0; x < width; x += this.config.ground.quality) {
            const noiseValue = noise2D(x * this.config.ground.resolution, 0);
            const smallRoughness = smallNoise2D(x, 0);
            const y = baseY + noiseValue * this.config.ground.maxHeight + smallRoughness * this.config.ground.surfraceRoughness;
            points.push(new Phaser.Math.Vector2(x, y));
        }

        // Add ending points to close the shape
        points.push(new Phaser.Math.Vector2(width + 10, points[points.length - 1].y));
        points.push(new Phaser.Math.Vector2(width, height));

        // Create spline curve from points
        const curve = new Phaser.Curves.Spline(points);

        // Draw filled curve
        graphics.fillStyle(0xCBBD93, 0.3);
        graphics.beginPath();
        curve.draw(graphics, 64 * this.config.worldWidth / this.config.windowWidth);
        graphics.closePath();
        graphics.fillPath();
        graphics.setBlendMode(Phaser.BlendModes.SOFT_LIGHT);

        // Create a static group for ground bodies
        this.groundBodies = this.scene.physics.add.staticGroup();

        // Create a static image for the ground shape (color only)
        for (let i = 2; i < points.length - 2; i++) {
            const midY = (points[i].y + points[i + 1].y) / 2 + this.config.ground.quality / 2;
            const midX = (points[i].x + points[i + 1].x) / 2;
            const box = this.scene.add.rectangle(midX, midY, this.config.ground.quality, Math.max(this.config.ground.quality, 10), 0x00ff00, 0.2);
            if (this.config.debug) {
                box.setStrokeStyle(2, 0x00ff00);
            } else {
                box.setVisible(false);
            }
            this.scene.physics.add.existing(box, true);
            this.groundBodies.add(box);
        }
        graphics.setDepth(1.3);
        graphics.setAlpha(0.9);
    }

    private createSurfaceLine() {
        this.surfaceLine = this.scene.add.graphics();
    }

    private createBackground() {
        const graphics = this.scene.add.graphics();

        // Create gradient fill using Phaser's fillGradientStyle
        graphics.fillGradientStyle(
            0x87CEEB,
            0x87CEEB,
            0x00001B,
            0x00001B,
            0.3,
            0.3,
            0.95,
            0.95,
        );

        // Fill the rectangle with the gradient
        graphics.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);

        // Set blend mode for better visual effect
        graphics.setBlendMode(Phaser.BlendModes.MULTIPLY);
        graphics.setDepth(1.5);

        return graphics;
    }

    private updateSurfaceLine() {
        this.surfaceTime += this.SURFACE_SPEED;
        this.surfaceLine.clear();

        // Create a mask shape that covers everything above the wave
        this.surfaceLine.fillStyle(0x87ceeb, 1);
        this.surfaceLine.beginPath();

        // Start from top-left
        this.surfaceLine.moveTo(0, 0);

        // Draw the wave line
        for (let x = 0; x < this.config.worldWidth; x += 5) {
            const y = this.config.surface.height +
                Math.sin(x * this.SURFACE_FREQUENCY + this.surfaceTime) * this.SURFACE_AMPLITUDE +
                Math.sin(x * this.SURFACE_FREQUENCY * 2 + this.surfaceTime * 4) * (this.SURFACE_AMPLITUDE * 0.5)
                + Math.sin(x * 10 + 4 * this.surfaceTime) * 3;
            this.surfaceLine.lineTo(x, y);
        }

        // Complete the shape by going to top-right and back to start
        this.surfaceLine.lineTo(this.config.worldWidth, 0);
        this.surfaceLine.lineTo(0, 0);

        this.surfaceLine.closePath();
        this.surfaceLine.fillPath();
    }



    public update() {
        this.updateSurfaceLine();
    }
}