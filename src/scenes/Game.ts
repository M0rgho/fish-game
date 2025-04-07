import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Boid } from '../entities/Boid';
import { Shark } from '../entities/Shark';

export class Game extends Scene
{
    private boids: Boid[] = [];
    private camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    msg_text : Phaser.GameObjects.Text;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private shark: Shark;
    private config: GameConfig;
    private eatenFishCounter: number = 0;
    private counterText: Phaser.GameObjects.Text;
    private worldBorder: Phaser.GameObjects.Rectangle;
    private seaBottom: Phaser.GameObjects.Graphics;
    private seed: number = 12345; // Fixed seed for consistent terrain
    private readonly TERRAIN_POINTS = 100; // Number of points for smooth terrain
    private readonly TERRAIN_AMPLITUDE = 100; // How much the terrain can vary
    private readonly TERRAIN_SMOOTHNESS = 0.1; // How smooth the terrain is (lower = smoother)

    constructor ()
    {
        super({
            key: 'Game',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false
                }
            }
        });
        this.config = GameConfig.getInstance();
    }

    private seededRandom(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    private generateTerrainPoints(): Phaser.Math.Vector2[] {
        const points: Phaser.Math.Vector2[] = [];
        const baseHeight = this.config.worldHeight - 200; // Base height from bottom
        let lastHeight = baseHeight;
        
        for (let i = 0; i <= this.TERRAIN_POINTS; i++) {
            const x = (i / this.TERRAIN_POINTS) * this.config.worldWidth;
            
            // Generate smooth height variation
            const random = this.seededRandom();
            const heightVariation = (random - 0.5) * this.TERRAIN_AMPLITUDE;
            const targetHeight = baseHeight + heightVariation;
            
            // Smooth interpolation between last height and target height
            lastHeight += (targetHeight - lastHeight) * this.TERRAIN_SMOOTHNESS;
            
            points.push(new Phaser.Math.Vector2(x, lastHeight));
        }
        
        return points;
    }

    private drawSeaBottom(): void {
        if (!this.seaBottom) {
            this.seaBottom = this.add.graphics();
        }
        
        this.seaBottom.clear();
        this.seaBottom.lineStyle(4, 0x006400); // Dark green color
        
        const points = this.generateTerrainPoints();
        
        // Draw the line
        this.seaBottom.beginPath();
        this.seaBottom.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.seaBottom.lineTo(points[i].x, points[i].y);
        }
        
        this.seaBottom.strokePath();
        
        // Fill the bottom area with the same color as the line
        this.seaBottom.fillStyle(0x006400, 0.5); // Same green color with transparency
        this.seaBottom.beginPath();
        this.seaBottom.moveTo(0, this.config.worldHeight);
        this.seaBottom.lineTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.seaBottom.lineTo(points[i].x, points[i].y);
        }
        
        this.seaBottom.lineTo(this.config.worldWidth, this.config.worldHeight);
        this.seaBottom.closePath();
        this.seaBottom.fill();
    }

    preload() {
        this.load.image('shark', 'assets/shark_silhouette.svg');
        this.load.image('fish', 'assets/fish.svg');
        this.load.image('clown_fish', 'assets/clown_fish.svg');
    }

    create ()
    {
        // Set up the world bounds
        this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
        
        // Set up the camera
        this.camera = this.cameras.main;
        this.camera.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
        
        // Create gradient background for the entire world
        const gradientTexture = this.textures.createCanvas('gradient', this.config.worldWidth, this.config.worldHeight);
        if (!gradientTexture) {
            console.error('Failed to create gradient texture');
            return;
        }
        
        const context = gradientTexture.getContext();
        if (!context) {
            console.error('Failed to get gradient context');
            return;
        }
        
        const gradient = context.createLinearGradient(0, 0, 0, this.config.worldHeight);
        gradient.addColorStop(0, '#87CEEB'); // Light blue
        gradient.addColorStop(1, '#00008B'); // Dark blue
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);
        
        gradientTexture.refresh();
        
        this.add.image(this.config.worldWidth/2, this.config.worldHeight/2, 'gradient');

        // Create world border
        this.worldBorder = this.add.rectangle(
            this.config.worldWidth/2,
            this.config.worldHeight/2,
            this.config.worldWidth,
            this.config.worldHeight
        );
        this.worldBorder.setStrokeStyle(4, 0x000000);
        this.worldBorder.setFillStyle(0x000000, 0);

        // Draw the sea bottom
        this.drawSeaBottom();

        // Create initial boids spread across the larger world
        for (let i = 0; i < 500; i++) {
            this.boids.push(new Boid(
                this,
                Phaser.Math.Between(0, this.config.worldWidth),
                Phaser.Math.Between(0, this.config.worldHeight)
            ));
        }

        // Create shark in the center of the world
        this.shark = new Shark(this, this.config.worldWidth/2, this.config.worldHeight/2);
        
        // Setup keyboard controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();

            // Add debug toggle
            this.input.keyboard.on('keydown-D', () => {
                this.config.toggleDebug();
                if (this.physics.world.debugGraphic) {
                    this.physics.world.debugGraphic.setVisible(this.config.debug);
                }
            });
        }

        // Add counter text in top right (relative to camera)
        this.counterText = this.add.text(
            this.cameras.main.width - 20,
            20,
            'Eaten Fish: 0',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(1, 0);
        this.counterText.setScrollFactor(0); // Keep counter fixed on screen
    }

    update() {
        // Update shark first
        this.shark.update(this.cursors);
        
        // Update all boids with shark reference
        this.boids.forEach(boid => boid.update(this.shark));

        // Smooth camera follow
        const targetX = this.shark.getPosition().x;
        const targetY = this.shark.getPosition().y;
        
        this.camera.scrollX += (targetX - this.camera.scrollX - this.cameras.main.width/2) * this.config.cameraLerpX;
        this.camera.scrollY += (targetY - this.camera.scrollY - this.cameras.main.height/2) * this.config.cameraLerpY;

        // Spawn new boids if population drops below 500
        if (this.boids.length < 500) {
            this.boids.push(new Boid(
                this,
                Phaser.Math.Between(0, this.config.worldWidth),
                Phaser.Math.Between(0, this.config.worldHeight)
            ));
        }
    }

    incrementEatenFishCounter() {
        this.eatenFishCounter++;
        this.counterText.setText(`Eaten Fish: ${this.eatenFishCounter}`);
    }
}
