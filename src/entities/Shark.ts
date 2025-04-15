import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Shark {
  private sprite: Phaser.Physics.Arcade.Image;
  private config: typeof GameConfig;
  private scene: Phaser.Scene;
  private collisionBox: Phaser.GameObjects.Rectangle;
  private currentScale: number;

  // Shark-specific configuration
  private readonly INITIAL_SCALE = 0.12;
  private readonly INITIAL_MAX_SPEED = 5;
  private readonly MIN_SPEED = 200;
  private readonly MAX_SPEED = 900;
  private readonly TURN_SPEED = 0.03; // Speed at which velocity vector rotates
  private readonly ACCELERATION_SPEED = 5;
  private readonly TURN_SPEED_LOSS = 0.35; // Speed loss factor during turns

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.config = GameConfig;
    this.scene = scene;
    // Create physics-enabled sprite
    this.sprite = scene.physics.add.image(x, y, 'shark').setFlipX(true);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(0.8);
    this.sprite.debugShowVelocity = true;
    this.sprite.setTintFill(0x232323);
    this.sprite.setAlpha(0.9);
    this.sprite.setMaxVelocity(this.MAX_SPEED);

    // Initialize scale and speed
    this.currentScale = this.INITIAL_SCALE;
    this.sprite.setScale(this.currentScale);

    // Set up circular physics body
    if (this.sprite.body) {
      this.sprite.body.setCircle(this.sprite.height * 0.5, this.sprite.width * 0.4, 0);
    }
  }

  getPosition(): Phaser.Math.Vector2 {
    return this.sprite.body.position;
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const waterLevel = this.config.surface.height;
    const isAboveWater = this.sprite.y < waterLevel;

    // Apply gravity when above water
    if (isAboveWater) {
      this.sprite.setAcceleration(0, 0);
      this.sprite.setGravityY(1000);
    } else {
      this.sprite.setGravityY(0);
    }

    const turnFactor = isAboveWater ? 0.5 : 1;

    // Handle velocity rotation
    const currentVelocity = this.sprite.body.velocity;
    if (cursors.left.isDown || cursors.right.isDown) {
      const turnDirection = cursors.left.isDown ? -1 : 1;
      const turnAmount = this.TURN_SPEED * turnFactor * turnDirection;
      const rotatedVelocity = Phaser.Math.Rotate(currentVelocity, turnAmount);

      // Calculate speed loss based on turn angle
      const speedLoss = Math.abs(turnAmount) * this.TURN_SPEED_LOSS;
      const currentSpeed = currentVelocity.length();
      const newSpeed = currentSpeed * (1 - speedLoss);

      // Apply rotation and speed loss
      this.sprite.body.velocity.set(rotatedVelocity.x, rotatedVelocity.y);
      this.sprite.body.velocity.normalize().scale(newSpeed);
    }

    // Handle acceleration
    if (cursors.up.isDown && !isAboveWater) {
      const acceleration = new Phaser.Math.Vector2();
      this.scene.physics.velocityFromRotation(
        currentVelocity.angle(),
        this.ACCELERATION_SPEED,
        acceleration
      );

      // Add acceleration to current velocity
      this.sprite.body.velocity.add(acceleration);
    }

    this.sprite.rotation = currentVelocity.angle();
  }

  sharkLighting(): void {
    // TODO: explore shark/other fish lighting
    // // Create circular mask that follows the shark
    // const maskCircle = this.add.circle(0, 0, 250, 0x000000, 0).setVisible(false);
    // const mask = maskCircle.createGeometryMask();
    // mask.setInvertAlpha(true);
    // this.background.setMask(mask);
    // const invertedMask = maskCircle.createGeometryMask();
    // this.inverted_background = this.createBackground();
    // this.inverted_background.setMask(invertedMask);
    // // Store shark sprite reference and bind update handler
    // const sharkSprite = this.shark.getSprite();
    // this.events.on('update', () => {
    //     maskCircle.setPosition(sharkSprite.x, sharkSprite.y)
    //     const alpha = Math.min(1, (this.config.worldHeight + this.config.surface.height - sharkSprite.y) / (this.config.worldHeight - this.config.ground.baseHeight))
    //     const circleScale = Phaser.Math.Clamp(1 - 2 * (alpha - 1), 0.5, 1.2);
    //     maskCircle.setScale(circleScale);
    //     this.inverted_background.setAlpha(alpha);
    // });
  }

  getCollisionBox(): Phaser.GameObjects.Rectangle {
    return this.collisionBox;
  }

  getSprite(): Phaser.Physics.Arcade.Image {
    return this.sprite;
  }
}
