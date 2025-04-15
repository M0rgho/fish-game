// import Phaser from 'phaser';
// import { GameConfig } from '../config/GameConfig';
// import { PhysicsConfig } from '../config/PhysicsConfig';

// export class Shark {
//     private sprite: Phaser.GameObjects.Image;
//     private position: Phaser.Math.Vector2;
//     private velocity: Phaser.Math.Vector2;
//     private angle: number = 0;
//     private targetAngle: number = 0;
//     private speed: number = 0;
//     private scene: Phaser.Scene;
//     private collisionBox: Phaser.GameObjects.Rectangle;
//     private wobbleTimer: number = 0;
//     private wobbleDirection: number = 1;
//     private currentScale: number;
//     private currentMaxSpeed: number;
//     private isAboveWater: boolean = false;
//     private physicsConfig: PhysicsConfig;

//     // Shark-specific configuration
//     private readonly INITIAL_SCALE = 0.1;
//     private readonly INITIAL_MAX_SPEED = 5;
//     private readonly MIN_SPEED = 2;
//     private readonly ROTATION_SPEED = 0.05;
//     private readonly ACCELERATION = 0.25;
//     private readonly FRICTION = 0.95;
//     private readonly WOBBLE_PERIOD = 1000;
//     private readonly WOBBLE_AMPLITUDE = 0.004;
//     private readonly TURN_SMOOTHING = 0.1;
//     private readonly GROWTH_RATE = 0.0002;
//     private readonly SPEED_INCREASE = 0.001;

//     // Instance-specific mouth box properties
//     private mouthBoxWidth: number;
//     private mouthBoxHeight: number;
//     private mouthBoxOffsetY: number;

//     constructor(scene: Phaser.Scene, x: number, y: number) {
//         // this.config = GameConfig.getInstance();
//         this.scene = scene;
//         this.position = new Phaser.Math.Vector2(x, y);
//         this.velocity = new Phaser.Math.Vector2(0, 0);
//         this.sprite = scene.add.image(x, y, 'shark');
        
//         // Initialize scale and speed
//         this.currentScale = this.INITIAL_SCALE;
//         this.currentMaxSpeed = this.INITIAL_MAX_SPEED;
//         this.sprite.setScale(this.currentScale);

//         // Initialize mouth box dimensions
//         this.mouthBoxWidth = this.sprite.width * 0.3 * this.currentScale;
//         this.mouthBoxHeight = this.sprite.height * 0.5 * this.currentScale;
//         this.mouthBoxOffsetY = this.sprite.height * 0.9 * this.currentScale;

//         // Create collision box with instance properties
//         this.collisionBox = scene.add.rectangle(
//             this.mouthBoxOffsetY, 
//             this.mouthBoxOffsetY, 
//             this.mouthBoxWidth, 
//             this.mouthBoxHeight
//         );
//         this.collisionBox.setStrokeStyle(2, 0x00ff00);
//         this.collisionBox.setFillStyle(0x00ff00, 0.2);

//         // Initialize with some speed
//         this.speed = this.MIN_SPEED;
//         this.physicsConfig = PhysicsConfig.getInstance();
//     }

//     getPosition(): Phaser.Math.Vector2 {
//         return this.position;
//     }

//     onFishEaten(): void {
//         // Grow the shark
//         this.currentScale += this.GROWTH_RATE;
//         this.sprite.setScale(this.currentScale);
        
//         // Increase max speed
//         this.currentMaxSpeed += this.SPEED_INCREASE;
        
//         // Update mouth box size with growth
//         this.mouthBoxWidth = this.sprite.width * 0.3 * this.currentScale;
//         this.mouthBoxHeight = this.sprite.height * 0.5 * this.currentScale;
//         this.mouthBoxOffsetY = this.sprite.height * 0.9 * this.currentScale;

//         // Update collision box size
//         this.collisionBox.setSize(this.mouthBoxWidth, this.mouthBoxHeight);
//     }

//     update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
//         // Check if above water using shared config
//         this.isAboveWater = this.position.y < this.physicsConfig.WATER_SURFACE_HEIGHT;

//         if (this.isAboveWater) {
//             // Apply gravity when above water using shared config
//             this.velocity.y += this.physicsConfig.GRAVITY;
//             // Reduced air drag from shared config
//             this.velocity.x *= this.physicsConfig.AIR_DRAG;
            
//             // Still allow rotation control in air
//             if (cursors.left.isDown) {
//                 this.targetAngle -= this.ROTATION_SPEED;
//             }
//             if (cursors.right.isDown) {
//                 this.targetAngle += this.ROTATION_SPEED;
//             }
            
//             // Update position with gravity
//             this.position.y += this.velocity.y;
//             this.position.x += this.velocity.x;
//         } else {
//             // Apply water resistance when entering water using shared config
//             if (this.velocity.y > 0) {
//                 this.velocity.y *= this.physicsConfig.WATER_RESISTANCE;
//             }

//             // Normal underwater movement
//             if (cursors.left.isDown) {
//                 this.targetAngle -= this.ROTATION_SPEED;
//             }
//             if (cursors.right.isDown) {
//                 this.targetAngle += this.ROTATION_SPEED;
//             }
//             if (cursors.up.isDown) {
//                 this.velocity.x += Math.cos(this.targetAngle) * this.speed;
//                 this.velocity.y += Math.sin(this.targetAngle) * this.speed;
//             }
//         }

//         // Smooth angle interpolation
//         const angleDiff = Phaser.Math.Angle.Wrap(this.targetAngle - this.angle);
//         this.angle += angleDiff * this.TURN_SMOOTHING;

//         // Update velocity and position based on angle and speed
//         this.velocity.x = Math.cos(this.angle) * this.speed;
//         this.velocity.y = Math.sin(this.angle) * this.speed;
//         this.position.add(this.velocity);

//         // Update position
//         this.position.add(this.velocity);

//         // Wrap around world bounds - but don't wrap vertically when above water
//         if (this.position.x > this.config.worldWidth) this.position.x = 0;
//         if (this.position.x < 0) this.position.x = this.config.worldWidth;
//         if (!this.isAboveWater) {
//             if (this.position.y > this.config.worldHeight) this.position.y = 0;
//             if (this.position.y < 0) this.position.y = this.config.worldHeight;
//         }

//         // Update visual elements
//         this.sprite.setPosition(this.position.x, this.position.y);
//         this.sprite.setRotation(this.angle + Math.PI);
        
//         // Update collision box
//         this.collisionBox.setVisible(this.config.debug);
//         const rotatedOffsetX = Math.cos(this.angle) * this.mouthBoxOffsetY;
//         const rotatedOffsetY = Math.sin(this.angle) * this.mouthBoxOffsetY;
//         this.collisionBox.setPosition(
//             this.position.x + rotatedOffsetX,
//             this.position.y + rotatedOffsetY
//         );
//         this.collisionBox.setRotation(this.angle);
//     }

//     getCollisionBox(): Phaser.GameObjects.Rectangle {
//         return this.collisionBox;
//     }
// }