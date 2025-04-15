import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Boid } from '../entities/Boid';
import { Shark } from '../entities/Shark';
import { createNoise2D } from 'simplex-noise';

export class Game extends Scene
{
    private camera: Phaser.Cameras.Scene2D.Camera;
    private background: Phaser.GameObjects.Graphics;
    private msg_text : Phaser.GameObjects.Text;
    private shark: Shark;
    private config: typeof GameConfig;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private fullscreenKey: Phaser.Input.Keyboard.Key;
    private groundBodies: Phaser.Physics.Arcade.StaticGroup;
    private surfaceLine: Phaser.GameObjects.Graphics;
    private surfaceTime: number = 0;
    private readonly SURFACE_AMPLITUDE = 10;
    private readonly SURFACE_FREQUENCY = 0.02;
    private readonly SURFACE_SPEED = 0.01;

    private boids: Boid[] = [];
    private eatenFishCounter: number = 0;
    private counterText: Phaser.GameObjects.Text;
    // private worldBorder: Phaser.GameObjects.Rectangle;
    // private seaBottom: Phaser.GameObjects.Graphics;
    // private seed: number = 12345; // Fixed seed for consistent terrain
    // private readonly TERRAIN_POINTS = 100; // Number of points for smooth terrain
    // private readonly TERRAIN_AMPLITUDE = 100; // How much the terrain can vary
    // private readonly TERRAIN_SMOOTHNESS = 0.1; // How smooth the terrain is (lower = smoother)

    constructor ()
    {
        super({
            key: 'Game',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: GameConfig.debug,
                    debugShowBody: true,
                    debugShowVelocity: true,
                    debugBodyColor: 0x00ff00
                }
            },
        });
        this.config = GameConfig;
    }

    // private seededRandom(): number {
    //     this.seed = (this.seed * 9301 + 49297) % 233280;
    //     return this.seed / 233280;
    // }

    preload() {
        this.load.image('shark', 'assets/shark_silhouette.svg');
        this.load.image('fish', 'assets/fish.svg');
        this.load.image('clown_fish', 'assets/clown_fish.svg');
    }

    private createGround() {
        const width = this.config.worldWidth;
        const height = this.config.worldHeight;
        const graphics = this.add.graphics();

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
        this.groundBodies = this.physics.add.staticGroup();

        // Create a static image for the ground shape (color only)
        for(let i = 2; i < points.length - 2; i++) {
            const midY = (points[i].y + points[i+1].y) / 2 + this.config.ground.quality/2;
            const midX = (points[i].x + points[i+1].x) / 2;
            const box = this.add.rectangle(midX, midY, this.config.ground.quality, Math.max(this.config.ground.quality, 10), 0x00ff00, 0.2);
            if(this.config.debug) {
                box.setStrokeStyle(2, 0x00ff00);
            } else {
                box.setVisible(false)
            }
            this.physics.add.existing(box, true);
            this.groundBodies.add(box);
        }
        graphics.setDepth(1.3);
        graphics.setAlpha(0.9);
    }

    private createBackground() {
       const graphics = this.add.graphics();
        
        // Create gradient fill using Phaser's fillGradientStyle
        graphics.fillGradientStyle(
            0x87CEEB,
            0x87CEEB,
            0x00001B,
            0x00001B,
            0.3,
            0.3,
            0.9,
            0.9,
        );
        
        // Fill the rectangle with the gradient
        graphics.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);
        
        // Set blend mode for better visual effect
        graphics.setBlendMode(Phaser.BlendModes.MULTIPLY);
        graphics.setDepth(1.5);

        return graphics;
    }

    private createSurfaceLine() {
        this.surfaceLine = this.add.graphics();
        this.surfaceLine.setDepth(0.5); // Lower depth so fish can be above it
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

    create ()
    {
        // Set up the world bounds
        this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
        this.physics.world.fixedStep = false;
        
        // Set up the camera with smoother follow
        this.camera = this.cameras.main;
        this.camera.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
        this.camera.setLerp(0.1, 0.1); // Smoother camera follow
        this.camera.setDeadzone(100, 100); // Add deadzone to prevent micro-movements
        this.camera.setFollowOffset(0, 0); // Center the camera on the shark
        
        

        // // Create world border
        // this.worldBorder = this.add.rectangle(
        //     this.config.worldWidth/2,
        //     this.config.worldHeight/2,
        //     this.config.worldWidth,
        //     this.config.worldHeight
        // );
        // this.worldBorder.setStrokeStyle(4, 0x000000);
        // this.worldBorder.setFillStyle(0x000000, 0);

        // // Draw the sea bottom
        // this.drawSeaBottom();
        
    


        // // Create shark in the center of the world
        this.shark = new Shark(this, 100, this.config.surface.height + 100);
        this.shark.getSprite().setDepth(1.4);
        this.background = this.createBackground();

        // Create circular mask that follows the shark
        const maskCircle = this.add.circle(0, 0, 300, 0x000000, 0).setVisible(false);
        const mask = maskCircle.createGeometryMask();
        mask.setInvertAlpha(true);
        this.background.setMask(mask);

        // Store shark sprite reference and bind update handler
        const sharkSprite = this.shark.getSprite();
        this.events.on('update', () => maskCircle.setPosition(sharkSprite.x, sharkSprite.y));

        this.createGround();
        this.createSurfaceLine();
        const bg2 = this.createBackground();
        bg2.setAlpha(0.8);

        
        // // Create initial boids spread across the larger world
        for (let i = 0; i < 500; i++) {
            const boid = new Boid(
                this,
                Phaser.Math.Between(0, this.config.worldWidth),
                Phaser.Math.Between(100, this.config.worldHeight - this.config.ground.baseHeight - 200)
            )
            boid.getSprite().setDepth(1); // Set fish depth higher than surface line
            this.boids.push(boid);
            // Add collision callback to make boid turn slightly when hitting ground
            this.physics.add.collider(boid.getSprite(), this.groundBodies, () => {
                const randomTurn = Phaser.Math.FloatBetween(-0.2, 0.2);
                boid.getSprite().body.velocity.rotate(randomTurn);
            });
        }
        

        
        // Add collision between shark and ground

        
        
        this.physics.add.collider(this.shark.getSprite(), this.groundBodies);

        
        // // Setup keyboard controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();

            // Add debug toggle
            // this.input.keyboard.on('keydown-D', () => {
            //     this.config.toggleDebug();
            //     if (this.physics.world.debugGraphic) {
            //         this.physics.world.debugGraphic.setVisible(this.config.debug);
            //     }
            // });
        }

        // // Add counter text in top right (relative to camera)
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
        this.counterText.setScrollFactor(0);
        this.counterText.setDepth(3);

        // Add fullscreen toggle key
        this.fullscreenKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.fullscreenKey.on('down', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });

        // Add overlap between shark and boids (instead of collision)
        for (const boid of this.boids) {
            const overlap = this.physics.add.overlap(this.shark.getSprite(), boid.getSprite(), (shark, boid) => {
                // Make the fish red
                (boid as Phaser.GameObjects.Image).setTintFill(0xff0000);
                
                // Increment the counter
                this.eatenFishCounter++;
                this.counterText.setText(`Eaten Fish: ${this.eatenFishCounter}`);
                // Fade out the fish
                this.tweens.add({
                    targets: boid,
                    alpha: 0.2,
                    duration: 1000,
                });
                (boid as Phaser.Physics.Arcade.Image).setDrag(500);
                // (boid as Phaser.Physics.Arcade.Image).setAngularDrag(1000);
                // Remove the fish after a short delay
                this.time.delayedCall(1500, () => {
                    const boidIndex = this.boids.findIndex(b => b.getSprite() === boid);
                    if (boidIndex !== -1) {
                        this.boids[boidIndex].getSprite().destroy();
                        this.boids.splice(boidIndex, 1);
                    }
                });

                // Remove the overlap to prevent future collisions
                overlap.destroy();
            });
        }
    }

    update() {
        // Update shark first
        this.shark.update(this.cursors);
        
        // Apply gravity to entities above water
        const waterLevel = this.config.surface.height;
        
        // Check shark position and apply gravity if above water
        const sharkSprite = this.shark.getSprite() as Phaser.Physics.Arcade.Image;
        if (sharkSprite.y < waterLevel) {
            sharkSprite.setGravityY(1000);
        } else {
            sharkSprite.setGravityY(0);
        }

        // Check each boid position and apply gravity if above water
        for (const boid of this.boids) {
            const boidSprite = boid.getSprite() as Phaser.Physics.Arcade.Image;
            if (boidSprite.y < waterLevel) {
                boidSprite.setGravityY(1000);
            } else {
                boidSprite.setGravityY(0);
            }
        }
        
        
        this.updateSurfaceLine();

        for(let i = 0; i < this.boids.length; i++) {
            this.boids[i].update();
        }
        
        this.camera.startFollow(this.shark.getSprite(), true, this.config.camera.lerpX, this.config.camera.lerpY);

        // Update tab title with FPS
        document.title = `Boids Game - ${Math.round(this.game.loop.actualFps)} FPS`;
    }

    // incrementEatenFishCounter() {
    //     this.eatenFishCounter++;
    //     this.counterText.setText(`Eaten Fish: ${this.eatenFishCounter}`);
    // }
}
