import { GameConfig } from '../config/GameConfig';
import { FishGame } from '../scenes/Game';
import { Boid } from './Boid';
import Phaser from 'phaser';

export class BoidManager {
  private boids: Boid[];
  private scene: FishGame;
  private config: typeof GameConfig;
  private dyingBoids: Set<Boid>;

  constructor(scene: FishGame, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;
    this.boids = [];
    this.dyingBoids = new Set();

    this.createBoids();
  }

  private createBoids(): void {
    for (let i = 0; i < this.config.boids.count; i++) {
      const boid = new Boid(
        this.scene,
        Phaser.Math.Between(0, this.config.worldWidth),
        Phaser.Math.Between(100, this.config.worldHeight - this.config.ground.baseHeight - 200)
      );
      this.boids.push(boid);
    }

    const boidSprites = this.boids.map((b) => b.getSprite() as Phaser.Physics.Arcade.Image);

    // add overlap handler with shark
    this.scene.physics.add.overlap(
      this.scene.shark.getSprite() as Phaser.Physics.Arcade.Image,
      boidSprites,
      (object1: any, object2: any) => {
        const boid = this.boids.find((b) => b.getSprite() === object2);
        if (boid && !this.dyingBoids.has(boid)) {
          boid.dieAnimation();
          this.dyingBoids.add(boid);
          // Schedule removal after death animation
          this.scene.time.delayedCall(1500, () => {
            const sprite = boid.getSprite() as Phaser.Physics.Arcade.Image;
            if (sprite) {
              sprite.destroy();
            }
            const index = this.boids.indexOf(boid);
            if (index !== -1) {
              this.boids.splice(index, 1);
            }
            this.dyingBoids.delete(boid);
          });
        }
      }
    );

    // add collider with ground
    this.scene.physics.add.collider(
      boidSprites,
      this.scene.environment.groundBodies,
      (object1: any) => {
        const sprite = object1 as Phaser.Physics.Arcade.Image;
        const randomTurn = Phaser.Math.FloatBetween(-0.1, 0.1);
        sprite.body.velocity.rotate(randomTurn);
      }
    );
  }

  update(): void {
    // Update all boids
    for (const boid of this.boids) {
      boid.update();
    }
  }
}
