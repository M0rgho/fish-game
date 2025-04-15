import Phaser, { Game } from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Shark {
    private sprite: Phaser.Physics.Arcade.Image;
    private config: typeof GameConfig;
    private angle: number = 0;
    private targetAngle: number = 0;
    private speed: number = 0;
    private scene: Phaser.Scene;
    private collisionBox: Phaser.GameObjects.Rectangle;
    private wobbleTimer: number = 0;
    private wobbleDirection: number = 1;
    private currentScale: number;
    private currentMaxSpeed: number;
    private isAboveWater: boolean = false;

    // Shark-specific configuration
    private readonly INITIAL_SCALE = 0.1;
    private readonly INITIAL_MAX_SPEED = 5;
    private readonly MIN_SPEED = 200;
    private readonly MAX_SPEED = 1200;
    private readonly ROTATION_SPEED = 1.8;
    private readonly ACCELERATION_SPEED = 2;
    private readonly DECELERATION_SPEED = 2;
    // private readonly FRICTION = 0.95;
    // private readonly WOBBLE_PERIOD = 1000;
    // private readonly WOBBLE_AMPLITUDE = 0.004;
    // private readonly TURN_SMOOTHING = 0.1;
    // private readonly GROWTH_RATE = 0.0002;
    // private readonly SPEED_INCREASE = 0.001;


    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.config = GameConfig;
        this.scene = scene;
        // Create physics-enabled sprite
        this.sprite = scene.physics.add.image(x, y, 'shark').setFlipX(true);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDamping(true);
        this.sprite.setDrag(0.40);
        this.sprite.debugShowVelocity = true;
        this.sprite.setTintFill(0xFFFFFF);
        this.sprite.setAlpha(0.5);
        
        // Initialize scale and speed
        this.currentScale = this.INITIAL_SCALE;
        this.currentMaxSpeed = this.INITIAL_MAX_SPEED;
        this.sprite.setScale(this.currentScale);

        // Set up circular physics body
        if (this.sprite.body) {
            this.sprite.body.setCircle(
                this.sprite.height * 0.5,
                this.sprite.width * 0.4,
                0
            );
        }

        // Initialize with some speed
        this.speed = this.MIN_SPEED;
    }

    getPosition(): Phaser.Math.Vector2 {
        return this.sprite.body.position;
    }

    // onFishEaten(): void {
    //     // Grow the shark
    //     this.currentScale += this.GROWTH_RATE;
    //     this.sprite.setScale(this.currentScale);
        
    //     // Increase max speed
    //     this.currentMaxSpeed += this.SPEED_INCREASE;
        
    //     // Update mouth box size with growth
    //     this.mouthBoxWidth = this.sprite.width * 0.3 * this.currentScale;
    //     this.mouthBoxHeight = this.sprite.height * 0.5 * this.currentScale;
    //     this.mouthBoxOffsetY = this.sprite.height * 0.9 * this.currentScale;

    //     // Update collision box size
    //     this.collisionBox.setSize(this.mouthBoxWidth, this.mouthBoxHeight);
    // }

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
        if (this.sprite.body) {
            // Handle rotation
            if (cursors.left.isDown) {
                this.sprite.setAngularVelocity(-this.ROTATION_SPEED * 100);
            } else if (cursors.right.isDown) {
                this.sprite.setAngularVelocity(this.ROTATION_SPEED * 100);
            } else {
                this.sprite.setAngularVelocity(0);
            }

            // Calculate acceleration direction based on rotation
            const acceleration = new Phaser.Math.Vector2();
            if (cursors.up.isDown) {
                const accelerationMultiplier = this.sprite.y < this.config.surface.height ? 1 : 5;
                this.scene.physics.velocityFromRotation(this.sprite.rotation, this.ACCELERATION_SPEED * accelerationMultiplier, acceleration);
            }

            // Apply acceleration to velocity
            this.sprite.body.velocity.x += acceleration.x;
            this.sprite.body.velocity.y += acceleration.y;

            // Limit maximum speed
            const currentSpeed = this.sprite.body.velocity.length();
            if (currentSpeed > this.MAX_SPEED) {
                this.sprite.body.velocity.normalize().scale(this.MAX_SPEED);
            }
        }
    }

    getCollisionBox(): Phaser.GameObjects.Rectangle {
        return this.collisionBox;
    }

    getSprite(): Phaser.Physics.Arcade.Image {
        return this.sprite;
    }
}