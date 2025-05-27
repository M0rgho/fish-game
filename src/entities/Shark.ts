import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Shark {
  private sprite: Phaser.Physics.Arcade.Image;
  private config: typeof GameConfig;
  private scene: Phaser.Scene;
  private collisionBox: Phaser.GameObjects.Rectangle;
  private currentScale: number;
  private speedParticleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Shark-specific configuration
  private readonly INITIAL_SCALE = 0.12;
  private readonly INITIAL_MAX_SPEED = 5;
  private readonly MIN_SPEED = 200;
  private readonly MAX_SPEED = 900;
  private readonly TURN_SPEED = 0.03; // Speed at which velocity vector rotates
  private readonly ACCELERATION_SPEED = 5;
  private readonly TURN_SPEED_LOSS = 0.35; // Speed loss factor during turns
  private readonly SCALE_INCREASE_PER_FISH = 0.0002; // How much to increase scale by per fish eaten
  private readonly MAX_SCALE = 0.3; // Maximum scale the shark can reach

  // Turbo configuration
  private readonly TURBO_MULTIPLIER = 3;
  private readonly TURBO_DEPLETION_RATE = 0.04;
  private readonly TURBO_RECHARGE_RATE = 0.02;
  private readonly INITIAL_TURBO_CAPACITY = 50;
  private readonly TURBO_CAPACITY_INCREASE = 0.3;
  private readonly MAX_TURBO_CAPACITY = 200;
  private readonly TURBO_COOLDOWN_TIME = 1500;
  private turboMeter: number = 50; // Start with 50% turbo
  private turboCapacity: number = 50; // Start with 50% capacity
  private isTurboActive: boolean = false;
  private turboBar: Phaser.GameObjects.Graphics;
  private turboCooldownTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.config = GameConfig;
    this.scene = scene;
    // Create physics-enabled sprite
    this.sprite = scene.physics.add.image(x, y, 'shark').setFlipX(true);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(0.8);
    this.sprite.setBounce(0.2);
    this.sprite.debugShowVelocity = true;
    this.sprite.setTintFill(0x232323);
    this.sprite.setAlpha(0.9);
    this.sprite.setMaxVelocity(this.MAX_SPEED);

    // Initialize scale and speed
    this.currentScale = this.INITIAL_SCALE;
    this.sprite.setScale(this.currentScale);

    // Set up circular physics body
    const circleRadius = this.sprite.height * 0.9;
    this.sprite.body.setCircle(
      circleRadius,
      this.sprite.width * 0.5 - circleRadius,
      this.sprite.height * 0.5 - circleRadius
    );

    // Create turbo meter UI
    this.createTurboMeter();

    // Create speed lines particle emitter
    this.createSpeedLines();

    // Listen for pause/resume events
    this.scene.events.on('gamePaused', this.pauseEffects, this);
    this.scene.events.on('gameResumed', this.resumeEffects, this);
  }

  private createTurboMeter(): void {
    this.turboBar = this.scene.add.graphics();
    this.updateTurboMeter();
  }

  private updateTurboMeter(): void {
    const baseWidth = 50;
    const height = 20;
    const x = this.scene.cameras.main.width - 20; // Keep right edge fixed
    const y = this.scene.cameras.main.height - 30; // Position below the counter

    // Scale the width based on turbo capacity
    const width = baseWidth * (this.turboCapacity / this.INITIAL_TURBO_CAPACITY);

    this.turboBar.clear();

    // Background
    this.turboBar.fillStyle(0x000000, 0.5);
    this.turboBar.fillRect(x - width, y, width, height);

    // Turbo meter
    this.turboBar.fillStyle(0x00ff00, 1);
    this.turboBar.fillRect(x - width, y, width * (this.turboMeter / this.turboCapacity), height);

    // Border
    this.turboBar.lineStyle(2, 0xffffff, 1);
    this.turboBar.strokeRect(x - width, y, width, height);

    // Set scroll factor to 0 to keep it fixed on screen
    this.turboBar.setScrollFactor(0);
    this.turboBar.setDepth(3);
  }

  private createSpeedLines(): void {
    this.speedParticleEmitter = this.scene.add.particles(0, 0, 'speed_line', {
      x: 0,
      y: 0,
      lifespan: 300,
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 1, end: 0 },
      // blendMode: 'ADD',
      emitting: false,
      quantity: 1,
      frequency: 3,
      follow: this.sprite,
      rotate: this.sprite.rotation,
      angle: { min: -25, max: 25 },
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 15),
        quantity: 1,
      },
    });
    this.speedParticleEmitter.start();
  }

  private updateSpeedLines(): void {
    if (!this.speedParticleEmitter) return;

    const velocity = this.sprite.body.velocity.length();
    const speedRatio = Math.min(velocity / this.MAX_SPEED, 1);

    const quantity = Math.max(1, Math.floor(speedRatio * 5));

    const minSpeed = 100 + speedRatio * 300;
    const maxSpeed = minSpeed + 50;

    this.speedParticleEmitter.setConfig({
      quantity,
      speed: { min: minSpeed, max: maxSpeed },
      angle: { min: -25 * (1 - speedRatio * 0.6), max: 25 * (1 - speedRatio * 0.6) },
      alpha: { start: 0.8, end: 0 },
      tint: 0x89c3f2,
      scale: { start: 20 * this.currentScale, end: 2 * this.currentScale },
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, 150 * this.currentScale),
        quantity: 1,
      },
    });
  }

  getPosition(): Phaser.Math.Vector2 {
    return this.sprite.body.position;
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const waterLevel = this.config.surface.height;
    const isAboveWater = this.sprite.y < waterLevel;

    const rotation = this.sprite.rotation;

    const offsetX = ((500 - this.sprite.width) * this.currentScale) / 2;
    const offsetY = 0;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedOffsetX = offsetX * cos - offsetY * sin;
    const rotatedOffsetY = offsetX * sin + offsetY * cos;

    this.speedParticleEmitter.followOffset = new Phaser.Math.Vector2(
      rotatedOffsetX,
      rotatedOffsetY
    );

    // Handle turbo boost
    if (cursors.space.isDown && this.turboMeter > 0.1 && !isAboveWater) {
      this.isTurboActive = true;
      this.turboMeter = Math.max(
        0,
        this.turboMeter - this.TURBO_DEPLETION_RATE * this.scene.game.loop.delta
      );
      this.speedParticleEmitter.start();
      this.updateSpeedLines();
    } else {
      this.isTurboActive = false;
      this.speedParticleEmitter.stop();

      if (this.turboCooldownTimer > 0) {
        if (!cursors.space.isDown) this.turboCooldownTimer -= this.scene.game.loop.delta;
      } else {
        if (this.turboMeter === 0) {
          this.turboCooldownTimer = this.TURBO_COOLDOWN_TIME;
          this.turboMeter = -0.1;
        }
        this.turboMeter = Math.min(
          this.turboCapacity,
          this.turboMeter +
            (this.currentScale / this.INITIAL_SCALE) *
              this.TURBO_RECHARGE_RATE *
              this.scene.game.loop.delta
        );
      }
    }

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
      if (!this.isTurboActive) {
        this.sprite.body.velocity.normalize().scale(newSpeed);
      }
    }

    // Handle acceleration
    if (cursors.up.isDown && !isAboveWater) {
      const acceleration = new Phaser.Math.Vector2();
      this.scene.physics.velocityFromRotation(
        currentVelocity.angle(),
        this.ACCELERATION_SPEED * (this.isTurboActive ? this.TURBO_MULTIPLIER : 1),
        acceleration
      );

      // Add acceleration to current velocity
      this.sprite.body.velocity.add(acceleration);
    }

    this.sprite.rotation = currentVelocity.angle();
    this.updateTurboMeter();
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

  onFishEaten(): void {
    // Increase shark size
    this.currentScale = Math.min(this.currentScale + this.SCALE_INCREASE_PER_FISH, this.MAX_SCALE);
    this.sprite.setScale(this.currentScale);

    // Update physics body size
    const circleRadius = this.sprite.height * 0.9;
    this.sprite.body.setCircle(
      circleRadius,
      this.sprite.width * 0.5 - circleRadius,
      this.sprite.height * 0.5 - circleRadius
    );

    // Increase turbo capacity
    this.turboCapacity = Math.min(
      this.turboCapacity + this.TURBO_CAPACITY_INCREASE,
      this.MAX_TURBO_CAPACITY
    );
  }

  public pauseEffects(): void {
    // Pause any particle effects
    if (this.speedParticleEmitter) {
      this.speedParticleEmitter.pause();
    }
  }

  public resumeEffects(): void {
    // Resume any particle effects
    if (this.speedParticleEmitter) {
      this.speedParticleEmitter.resume();
    }
  }
}
