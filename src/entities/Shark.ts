import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Shark {
    private sprite: Phaser.GameObjects.Image;
    private position: Phaser.Math.Vector2;
    private velocity: Phaser.Math.Vector2;
    private angle: number = 0;
    private targetAngle: number = 0;
    private speed: number = 0;
    private scene: Phaser.Scene;
    private collisionBox: Phaser.GameObjects.Rectangle;
    private config: GameConfig;
    private wobbleTimer: number = 0;
    private wobbleDirection: number = 1;
    private currentScale: number;
    private currentMaxSpeed: number;

    // Shark-specific configuration
    private readonly INITIAL_SCALE = 0.1;
    private readonly INITIAL_MAX_SPEED = 5;
    private readonly MIN_SPEED = 2;
    private readonly ROTATION_SPEED = 0.05;
    private readonly ACCELERATION = 0.25;
    private readonly FRICTION = 0.95;
    private readonly WOBBLE_PERIOD = 1000;
    private readonly WOBBLE_AMPLITUDE = 0.004;
    private readonly TURN_SMOOTHING = 0.1;
    private readonly GROWTH_RATE = 0.0002;
    private readonly SPEED_INCREASE = 0.001;

    // Instance-specific mouth box properties
    private mouthBoxWidth: number;
    private mouthBoxHeight: number;
    private mouthBoxOffsetY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.config = GameConfig.getInstance();
        this.scene = scene;
        this.position = new Phaser.Math.Vector2(x, y);
        this.velocity = new Phaser.Math.Vector2(0, 0);
        this.sprite = scene.add.image(x, y, 'shark');
        
        // Initialize scale and speed
        this.currentScale = this.INITIAL_SCALE;
        this.currentMaxSpeed = this.INITIAL_MAX_SPEED;
        this.sprite.setScale(this.currentScale);

        // Initialize mouth box dimensions
        this.mouthBoxWidth = this.sprite.width * 0.3 * this.currentScale;;
        this.mouthBoxHeight = this.sprite.height * 0.5 * this.currentScale;;
        this.mouthBoxOffsetY = this.sprite.height * 0.9 * this.currentScale;

        // Create collision box with instance properties
        this.collisionBox = scene.add.rectangle(
            this.mouthBoxOffsetY, 
            this.mouthBoxOffsetY, 
            this.mouthBoxWidth, 
            this.mouthBoxHeight
        );
        this.collisionBox.setStrokeStyle(2, 0x00ff00);
        this.collisionBox.setFillStyle(0x00ff00, 0.2);

        // Initialize with some speed
        this.speed = this.MIN_SPEED;
    }

    onFishEaten(): void {
        // Grow the shark
        this.currentScale += this.GROWTH_RATE;
        this.sprite.setScale(this.currentScale);
        
        // Increase max speed
        this.currentMaxSpeed += this.SPEED_INCREASE;
        
        // Update mouth box size with growth
        this.mouthBoxWidth = this.sprite.width * 0.3 * this.currentScale;;
        this.mouthBoxHeight = this.sprite.height * 0.5 * this.currentScale;;
        // this.mouthBoxOffsetY += this.GROWTH_RATE;
        this.mouthBoxOffsetY = this.sprite.height * 0.9 *  this.currentScale;

        // Update collision box size
        this.collisionBox.setSize(this.mouthBoxWidth, this.mouthBoxHeight);
    }

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
        // Natural wobbling movement using sine wave
        this.wobbleTimer += this.scene.game.loop.delta;
        const wobbleOffset = Math.sin((this.wobbleTimer / this.WOBBLE_PERIOD) * Math.PI * 2) * this.WOBBLE_AMPLITUDE;
        this.targetAngle += wobbleOffset;

        // Player input
        if (cursors.left.isDown) {
            this.targetAngle -= this.ROTATION_SPEED;
        }
        if (cursors.right.isDown) {
            this.targetAngle += this.ROTATION_SPEED;
        }
        if (cursors.up.isDown) {
            this.speed = Math.min(this.speed + this.ACCELERATION, this.currentMaxSpeed);
        } else {
            this.speed = Math.max(this.speed * this.FRICTION, this.MIN_SPEED);
        }

        // Smooth angle interpolation
        const angleDiff = Phaser.Math.Angle.Wrap(this.targetAngle - this.angle);
        this.angle += angleDiff * this.TURN_SMOOTHING;

        // Update velocity and position based on angle and speed
        this.velocity.x = Math.cos(this.angle) * this.speed;
        this.velocity.y = Math.sin(this.angle) * this.speed;
        this.position.add(this.velocity);

        // Wrap around screen
        if (this.position.x < 0) this.position.x = this.config.windowWidth;
        if (this.position.x > this.config.windowWidth) this.position.x = 0;
        if (this.position.y < 0) this.position.y = this.config.windowHeight;
        if (this.position.y > this.config.windowHeight) this.position.y = 0;

        // Update sprite position and rotation
        this.sprite.setPosition(this.position.x, this.position.y);
        this.sprite.setRotation(this.angle + Math.PI);

        // Update collision box with rotated offset
        this.collisionBox.setVisible(this.config.debug);
        const rotatedOffsetX = Math.cos(this.angle) * this.mouthBoxOffsetY;
        const rotatedOffsetY = Math.sin(this.angle) * this.mouthBoxOffsetY;
        this.collisionBox.setPosition(
            this.position.x + rotatedOffsetX,
            this.position.y + rotatedOffsetY
        );
        this.collisionBox.setRotation(this.angle);
    }

    getCollisionBox(): Phaser.GameObjects.Rectangle {
        return this.collisionBox;
    }
}