import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { FishGame } from '../scenes/Game';
import { PositionedObject } from '../util/QuadTree';
import { FishBoneManager } from './FishBoneManager';
// import { PhysicsConfig } from '../config/PhysicsConfig';

export class Boid {
  public sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  public size: number;
  private scene: FishGame;
  private config: typeof GameConfig;

  private isAlive: boolean = true;

  // Boid behavior parameters
  private static readonly ALIGNMENT_RADIUS = 200;
  private static readonly COHESION_RADIUS = 250;
  private static readonly SEPARATION_RADIUS = 50;
  private static readonly COLLISION_RADIUS = 50;
  private static readonly MIN_SIZE = 12;
  private static readonly MAX_SIZE = 20;
  private static readonly MAX_SPEED = 300;
  private static readonly MAX_FORCE = 1;
  private static readonly COLLISION_FORCE = 2.5;
  private static readonly SHARK_AVOIDANCE_RADIUS = 500; // Radius to avoid shark
  private static readonly SHARK_FORCE = 50; // Strong avoidance force for shark
  private static readonly STAY_MIDDLE_PREFERENCE_FORCE = 0.3; // Gentle force to stay in top half

  private static readonly WATER_SURFACE_BUFFER = 50; // Distance to start avoiding surface
  private static readonly WATER_AVOIDANCE_FORCE = 2.0; // Force to avoid water surface
  private static readonly BORDER_BUFFER = 100; // Distance to start avoiding borders
  private static readonly BORDER_AVOIDANCE_FORCE = 2.0; // Force to avoid borders

  private fishBoneManager: FishBoneManager;
  private deathEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    scene: FishGame,
    x: number,
    y: number,
    group: Phaser.Physics.Arcade.Group,
    fishBoneManager: FishBoneManager
  ) {
    this.config = GameConfig;
    // this.physicsConfig = PhysicsConfig;
    this.scene = scene;
    this.size = Phaser.Math.Between(Boid.MIN_SIZE, Boid.MAX_SIZE);
    this.fishBoneManager = fishBoneManager;
    // Load fish sprite and add physics
    this.sprite = scene.physics.add.image(x, y, 'fish');
    this.sprite.setScale(this.size / 360); // Adjust scale since SVG is 576x512
    this.sprite.setOrigin(0.5);

    group.add(this.sprite);

    // Generate random bright RGB values between 80-150 for a muted color
    const r = Phaser.Math.Between(80, 150);
    const g = Phaser.Math.Between(80, 150);
    const b = Phaser.Math.Between(80, 150);
    const color = Phaser.Display.Color.GetColor(r, g, b);
    this.sprite.setTintFill(color);
    this.sprite.setAlpha(0.9);

    // Set up physics body
    this.sprite.setCircle(this.sprite.width / 2);
    this.sprite.setBounce(0.6);
    this.sprite.setVelocity(Phaser.Math.Between(-400, 400), Phaser.Math.Between(-400, 400));

    // Listen for pause/resume events
    this.scene.events.on('gamePaused', this.pauseParticles, this);
    this.scene.events.on('gameResumed', this.resumeParticles, this);
  }

  private getNearbyBoids(nearbyBoids: PositionedObject[]): {
    alignment: PositionedObject[];
    cohesion: PositionedObject[];
    separation: PositionedObject[];
    collision: PositionedObject[];
  } {
    const result = {
      alignment: [] as PositionedObject[],
      cohesion: [] as PositionedObject[],
      separation: [] as PositionedObject[],
      collision: [] as PositionedObject[],
    };

    const alignRadiusSq = Boid.ALIGNMENT_RADIUS * Boid.ALIGNMENT_RADIUS;
    const cohRadiusSq = Boid.COHESION_RADIUS * Boid.COHESION_RADIUS;
    const sepRadiusSq = Boid.SEPARATION_RADIUS * Boid.SEPARATION_RADIUS;
    const colRadiusSq = Boid.COLLISION_RADIUS * Boid.COLLISION_RADIUS;

    const myX = this.sprite.body.position.x;
    const myY = this.sprite.body.position.y;

    for (const boid of nearbyBoids) {
      const otherBoid = boid.gameObject as Boid;
      const otherX = otherBoid.getSprite().body.position.x;
      const otherY = otherBoid.getSprite().body.position.y;

      const dx = myX - otherX;
      const dy = myY - otherY;
      const distSq = dx * dx + dy * dy;

      if (distSq < alignRadiusSq) result.alignment.push(boid);
      if (distSq < cohRadiusSq) result.cohesion.push(boid);
      if (distSq < sepRadiusSq) result.separation.push(boid);
      if (distSq < colRadiusSq) result.collision.push(boid);
    }

    return result;
  }

  private align(nearbyBoids: PositionedObject[]): Phaser.Math.Vector2 {
    if (nearbyBoids.length === 0) return new Phaser.Math.Vector2();

    // Use direct velocity addition instead of creating intermediate vectors
    let vx = 0;
    let vy = 0;
    for (const boid of nearbyBoids) {
      const vel = (boid.gameObject as Boid).getSprite().body.velocity;
      vx += vel.x;
      vy += vel.y;
    }

    const invCount = 1 / nearbyBoids.length;
    vx *= invCount;
    vy *= invCount;

    // Normalize and scale
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      const scale = Boid.MAX_SPEED / len;
      vx = vx * scale - this.sprite.body.velocity.x;
      vy = vy * scale - this.sprite.body.velocity.y;

      // Limit force
      const forceLen = Math.sqrt(vx * vx + vy * vy);
      if (forceLen > Boid.MAX_FORCE) {
        const scale = Boid.MAX_FORCE / forceLen;
        vx *= scale;
        vy *= scale;
      }
    }

    return new Phaser.Math.Vector2(vx, vy);
  }

  private cohesion(nearbyBoids: PositionedObject[]): Phaser.Math.Vector2 {
    if (nearbyBoids.length === 0) return new Phaser.Math.Vector2();

    // Calculate center directly
    let cx = 0;
    let cy = 0;
    for (const boid of nearbyBoids) {
      const pos = (boid.gameObject as Boid).getSprite().body.position;
      cx += pos.x;
      cy += pos.y;
    }

    const invCount = 1 / nearbyBoids.length;
    cx *= invCount;
    cy *= invCount;

    // Calculate steering
    const dx = cx - this.sprite.body.position.x;
    const dy = cy - this.sprite.body.position.y;

    // Normalize and scale
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const scale = Boid.MAX_SPEED / len;
      const vx = dx * scale - this.sprite.body.velocity.x;
      const vy = dy * scale - this.sprite.body.velocity.y;

      // Limit force
      const forceLen = Math.sqrt(vx * vx + vy * vy);
      if (forceLen > Boid.MAX_FORCE) {
        const scale = Boid.MAX_FORCE / forceLen;
        return new Phaser.Math.Vector2(vx * scale, vy * scale);
      }
      return new Phaser.Math.Vector2(vx, vy);
    }

    return new Phaser.Math.Vector2();
  }

  private separation(nearbyBoids: PositionedObject[]): Phaser.Math.Vector2 {
    if (nearbyBoids.length === 0) return new Phaser.Math.Vector2();

    let vx = 0;
    let vy = 0;
    const myX = this.sprite.body.position.x;
    const myY = this.sprite.body.position.y;

    for (const boid of nearbyBoids) {
      const otherBoid = boid.gameObject as Boid;
      const otherX = otherBoid.getSprite().body.position.x;
      const otherY = otherBoid.getSprite().body.position.y;

      const dx = myX - otherX;
      const dy = myY - otherY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0 && distSq < Boid.SEPARATION_RADIUS * Boid.SEPARATION_RADIUS) {
        const invDist = 1 / Math.sqrt(distSq);
        const force = (Boid.SEPARATION_RADIUS - Math.sqrt(distSq)) / Boid.SEPARATION_RADIUS;
        vx += dx * invDist * force;
        vy += dy * invDist * force;
      }
    }

    // Normalize and scale
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      const scale = Boid.MAX_SPEED / len;
      vx = vx * scale - this.sprite.body.velocity.x;
      vy = vy * scale - this.sprite.body.velocity.y;

      // Limit force
      const forceLen = Math.sqrt(vx * vx + vy * vy);
      if (forceLen > Boid.MAX_FORCE) {
        const scale = Boid.MAX_FORCE / forceLen;
        vx *= scale;
        vy *= scale;
      }
    }

    return new Phaser.Math.Vector2(vx, vy);
  }

  private avoidCollisions(nearbyBoids: PositionedObject[]): Phaser.Math.Vector2 {
    if (nearbyBoids.length === 0) return new Phaser.Math.Vector2();

    let vx = 0;
    let vy = 0;
    const myX = this.sprite.body.position.x;
    const myY = this.sprite.body.position.y;
    const colRadius = Boid.COLLISION_RADIUS;

    for (const boid of nearbyBoids) {
      const otherBoid = boid.gameObject as Boid;
      const otherX = otherBoid.getSprite().body.position.x;
      const otherY = otherBoid.getSprite().body.position.y;

      const dx = myX - otherX;
      const dy = myY - otherY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (colRadius - dist) / colRadius;
        const invDist = 1 / dist;
        vx += dx * invDist * force;
        vy += dy * invDist * force;
      }
    }

    return new Phaser.Math.Vector2(vx * Boid.COLLISION_FORCE, vy * Boid.COLLISION_FORCE);
  }

  private avoidShark(): Phaser.Math.Vector2 {
    const shark = (this.scene as any).shark;
    if (!shark) return new Phaser.Math.Vector2();

    const distance = Phaser.Math.Distance.Between(
      this.sprite.body.position.x,
      this.sprite.body.position.y,
      shark.getSprite().body.position.x,
      shark.getSprite().body.position.y
    );

    if (distance > Boid.SHARK_AVOIDANCE_RADIUS) {
      return new Phaser.Math.Vector2();
    }

    const diff = new Phaser.Math.Vector2(
      this.sprite.body.position.x - shark.getSprite().body.position.x,
      this.sprite.body.position.y - shark.getSprite().body.position.y
    );

    const force = (Boid.SHARK_AVOIDANCE_RADIUS - distance) / Boid.SHARK_AVOIDANCE_RADIUS;
    diff.normalize().scale(force * Boid.SHARK_FORCE);
    return diff;
  }

  private preferMiddle(): Phaser.Math.Vector2 {
    const targetY = this.config.worldHeight * 0.5; // Target is middle of world
    const currentY = this.sprite.body.position.y;

    // Apply force towards middle
    const diff = new Phaser.Math.Vector2(0, targetY - currentY);
    diff.normalize().scale(Boid.STAY_MIDDLE_PREFERENCE_FORCE);
    return diff;
  }

  private avoidWaterSurface(): Phaser.Math.Vector2 {
    const distanceToSurface = this.sprite.body.position.y - this.config.surface.height;

    // If we're getting close to the surface, apply avoidance force
    if (distanceToSurface < Boid.WATER_SURFACE_BUFFER) {
      const force = (Boid.WATER_SURFACE_BUFFER - distanceToSurface) / Boid.WATER_SURFACE_BUFFER;
      return new Phaser.Math.Vector2(0, force * Boid.WATER_AVOIDANCE_FORCE);
    }

    return new Phaser.Math.Vector2();
  }

  private avoidBorders(): Phaser.Math.Vector2 {
    const x = this.sprite.body.position.x;
    const force = new Phaser.Math.Vector2(0, 0);

    // Check left border
    if (x < Boid.BORDER_BUFFER) {
      const strength = (Boid.BORDER_BUFFER - x) / Boid.BORDER_BUFFER;
      force.x = strength * Boid.BORDER_AVOIDANCE_FORCE;
    }
    // Check right border
    else if (x > this.config.worldWidth - Boid.BORDER_BUFFER) {
      const strength = (x - (this.config.worldWidth - Boid.BORDER_BUFFER)) / Boid.BORDER_BUFFER;
      force.x = -strength * Boid.BORDER_AVOIDANCE_FORCE;
    }

    return force;
  }

  // private checkSharkCollision(shark: Shark): void {
  //     const sharkBounds = shark.getCollisionBox().getBounds();
  //     const boidBounds = this.collisionBox.getBounds();

  //     this.isColliding = Phaser.Geom.Intersects.RectangleToRectangle(boidBounds, sharkBounds);
  //     if (this.isColliding && this.isAlive) {
  //         this.image.setTintFill(0xff0000);
  //         this.isAlive = false;
  //         // Increment the counter in the Game scene
  //         (this.scene as any).incrementEatenFishCounter();
  //         // Make shark grow and speed up
  //         shark.onFishEaten();
  //     }
  // }

  // private createWaterSurface() {
  //     const graphics = this.scene.add.graphics();
  //     // Use config values
  //     graphics.fillStyle(this.physicsConfig.WATER_COLOR, this.physicsConfig.WATER_ALPHA);
  //     graphics.fillRect(0, this.physicsConfig.WATER_SURFACE_HEIGHT, this.mapWidth, this.mapHeight);

  //     // Create wobbling water line
  //     const waterLine = this.scene.add.graphics();
  //     waterLine.lineStyle(2, this.physicsConfig.WATER_LINE_COLOR);

  //     // Animate water line
  //     this.scene.tweens.addCounter({
  //         from: 0,
  //         to: Math.PI * 2,
  //         duration: 2000,
  //         repeat: -1,
  //         onUpdate: (tween) => {
  //             waterLine.clear();
  //             waterLine.lineStyle(2, this.physicsConfig.WATER_LINE_COLOR);
  //             waterLine.beginPath();

  //             for (let x = 0; x < this.mapWidth; x += 5) {
  //                 const y = this.physicsConfig.WATER_SURFACE_HEIGHT +
  //                     Math.sin(x * 0.02 + tween.getValue()) * 5;
  //                 if (x === 0) {
  //                     waterLine.moveTo(x, y);
  //                 } else {
  //                     waterLine.lineTo(x, y);
  //                 }
  //             }
  //             waterLine.strokePath();
  //         }
  //     });

  //     this.scene.data.set('waterSurface', true);
  // }

  update(nearbyBoids: PositionedObject[]): void {
    // Set angular velocity based on velocity direction
    if (this.sprite.body.velocity.length() > 0) {
      const angle = Math.atan2(this.sprite.body.velocity.y, this.sprite.body.velocity.x);
      this.sprite.setRotation(angle);
    }

    // Handle water surface interaction
    if (this.sprite.y < this.config.surface.height) {
      this.sprite.setGravityY(1000);
      return;
    } else {
      this.sprite.setGravityY(0);
    }
    if (!this.isAlive) {
      return;
    }

    // Get all nearby boids categorized by their distance
    const nearby = this.getNearbyBoids(nearbyBoids);

    const alignment = this.align(nearby.alignment);
    const cohesion = this.cohesion(nearby.cohesion);
    const separation = this.separation(nearby.separation);
    const collisionAvoidance = this.avoidCollisions(nearby.collision);
    const sharkAvoidance = this.config.disableSharkInteraction
      ? new Phaser.Math.Vector2()
      : this.avoidShark();
    const topHalfPreference = this.preferMiddle();
    const waterAvoidance = this.avoidWaterSurface();
    const borderAvoidance = this.avoidBorders();

    // Apply forces with different weights
    this.sprite.body.velocity.add(alignment.scale(3)); // Alignment is most important
    this.sprite.body.velocity.add(cohesion.scale(2)); // Cohesion second
    this.sprite.body.velocity.add(separation.scale(5)); // Separation least important
    this.sprite.body.velocity.add(collisionAvoidance.scale(2)); // Collision avoidance is important
    this.sprite.body.velocity.add(sharkAvoidance.scale(2));
    this.sprite.body.velocity.add(topHalfPreference.scale(1)); // Gentle preference for top half
    this.sprite.body.velocity.add(waterAvoidance.scale(3)); // Strong water avoidance
    this.sprite.body.velocity.add(borderAvoidance.scale(2)); // Border avoidance

    // Limit the maximum speed
    const currentSpeed = this.sprite.body.velocity.length();
    if (currentSpeed > Boid.MAX_SPEED) {
      this.sprite.body.velocity.normalize().scale(Boid.MAX_SPEED);
    }

    return;

    //   // Check collision with shark
    //   this.checkSharkCollision(shark);

    //   // Limit speed
    //   this.velocity.limit(Boid.MAX_SPEED);

    //   // Update position
    //   this.position.add(this.velocity);

    //   // Wrap around world bounds
    //   if (this.position.x > this.mapWidth) this.position.x = 0;
    //   if (this.position.x < 0) this.position.x = this.mapWidth;
    //   if (this.position.y > this.mapHeight) this.position.y = 0;
    //   if (this.position.y < 0) this.position.y = this.mapHeight;
    // }

    // // Update visual elements
    // this.sprite.setPosition(this.position.x, this.position.y);
    // this.sprite.setRotation(Math.atan2(this.velocity.y, this.velocity.x)); // Add PI to point in direction of movement

    // Update collision box
    // this.collisionBox.setPosition(this.position.x, this.position.y);
    // this.collisionBox.setRotation(Math.atan2(this.velocity.y, this.velocity.x));
    // this.collisionBox.setVisible(this.config.debug);
  }

  // destroy() {
  //     this.image.destroy();
  //     this.collisionBox.destroy();
  //     const boidIndex = (this.scene as any).boids.indexOf(this);
  //     if (boidIndex > -1) {
  //         (this.scene as any).boids.splice(boidIndex, 1);
  //     }
  // }

  dieAnimation(): void {
    this.isAlive = false;

    // Make the fish red
    this.sprite.setDrag(400);

    this.createDeathEffect();

    // Increment the counter
    this.scene.counter.updateCounter();
    // Create a fish bone that falls to the ground
    this.fishBoneManager.createFishBone(this);

    // Fade out the fish
    this.scene.tweens.add({
      targets: [this.sprite, this.deathEmitter],
      alpha: 0,
      duration: 1200,
      onComplete: () => {
        this.deathEmitter.destroy();
      },
    });
  }

  private createDeathEffect(): void {
    // Create death particle effect
    this.deathEmitter = this.scene.add.particles(0, 0, 'blood_particle', {
      x: 0,
      y: 0,
      lifespan: 400,
      speed: { min: 10, max: 150 },
      scale: { start: this.size / 12, end: 0.5 },
      alpha: { start: 0.8, end: 0 },
      emitting: true,
      quantity: 3,
      frequency: 2,
      follow: this.sprite,
      rotate: this.sprite.rotation,
      angle: { min: 0, max: 360 },
      tint: 0x8a0303,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, this.size * 2),
        quantity: 1,
      },
    });
  }

  public pauseParticles(): void {
    if (this.deathEmitter) {
      this.deathEmitter.pause();
    }
  }

  public resumeParticles(): void {
    if (this.deathEmitter) {
      this.deathEmitter.resume();
    }
  }

  getSprite(): Phaser.Types.Physics.Arcade.ImageWithDynamicBody {
    return this.sprite;
  }
}
