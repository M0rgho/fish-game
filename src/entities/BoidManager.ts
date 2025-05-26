import { GameConfig } from '../config/GameConfig';
import { FishGame } from '../scenes/Game';
import { QuadTree } from '../util/QuadTree';
import { Boid } from './Boid';
import Phaser from 'phaser';
import { FishBoneManager } from './FishBoneManager';

export class BoidManager {
  private boids: Boid[];
  private scene: FishGame;
  private config: typeof GameConfig;
  private dyingBoids: Set<Boid>;
  private boidGroup: Phaser.Physics.Arcade.Group;
  private quadTree: QuadTree;
  private readonly BOID_SELECTION_SIZE = 300;
  public fishBoneManager: FishBoneManager;

  constructor(scene: FishGame, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;
    this.boids = [];
    this.dyingBoids = new Set();
    this.boidGroup = this.scene.physics.add.group({
      collideWorldBounds: true,
      bounceX: 1,
      bounceY: 1,
      dragX: 0,
      dragY: 0,
    });
    this.quadTree = new QuadTree(0, 0, this.config.worldWidth, this.config.worldHeight, 50, 5);
    this.fishBoneManager = new FishBoneManager(scene, config);

    this.createBoids();
  }

  private createBoids(): void {
    // Spawn fish in clusters
    let remainingBoids = this.config.boids.count;
    while (remainingBoids > 0) {
      // Determine cluster size between 10-30 fish
      const clusterSize = Math.min(Phaser.Math.Between(10, 30), remainingBoids);

      // Pick a random center point for the cluster
      const centerX = Phaser.Math.Between(100, this.config.worldWidth - 100);
      const centerY = Phaser.Math.Between(
        this.config.surface.height + 100,
        this.config.worldHeight / 2
      );

      // Check if cluster center is too close to shark
      const sharkSprite = this.scene.shark.getSprite();
      const distanceToShark = Phaser.Math.Distance.Between(
        centerX,
        centerY,
        sharkSprite.x,
        sharkSprite.y
      );
      if (distanceToShark < 400) {
        continue;
      }

      // Spawn fish in cluster with slight random offsets
      for (let i = 0; i < clusterSize; i++) {
        const spread = 200;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const radius = Phaser.Math.FloatBetween(0, spread);

        const x = centerX + radius * Math.cos(angle);
        const y = Math.max(centerY + radius * Math.sin(angle), this.config.surface.height + 50);

        const boid = new Boid(this.scene, x, y, this.boidGroup, this.fishBoneManager);
        this.boids.push(boid);
        this.quadTree.insert({
          x: boid.getSprite().x,
          y: boid.getSprite().y,
          right: boid.getSprite().x + boid.getSprite().width,
          bottom: boid.getSprite().y + boid.getSprite().height,
          gameObject: boid,
        });
      }

      remainingBoids -= clusterSize;
    }

    // add overlap handler with shark
    this.scene.physics.add.overlap(
      this.scene.shark.getSprite() as Phaser.Physics.Arcade.Image,
      this.boidGroup,
      (object1: any, object2: any) => {
        const boid = this.boids.find((b) => b.getSprite() === object2);
        if (boid && !this.dyingBoids.has(boid)) {
          boid.dieAnimation();
          this.dyingBoids.add(boid);
          // Call onFishEaten to increase shark size and turbo capacity
          this.scene.shark.onFishEaten();
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
      this.boidGroup,
      this.scene.environment.groundBodies,
      (object1: any) => {
        const sprite = object1 as Phaser.Physics.Arcade.Image;
        const randomTurn = Phaser.Math.FloatBetween(-0.1, 0.1);
        sprite.body.velocity.rotate(randomTurn);
      }
    );

    // add collider with rocks
    this.scene.physics.add.collider(
      this.boidGroup,
      this.scene.environment.rocksBodies,
      (object1: any) => {
        const sprite = object1 as Phaser.Physics.Arcade.Image;
        const randomTurn = Phaser.Math.FloatBetween(-0.1, 0.1);
        sprite.body.velocity.rotate(randomTurn);
      }
    );
  }

  update(): void {
    // Check if we need to spawn more boids
    if (this.boids.length < this.config.boids.count) {
      const x = Phaser.Math.Between(30, this.config.worldWidth - 30);
      const boid = new Boid(this.scene, x, 10, this.boidGroup, this.fishBoneManager);

      this.boids.push(boid);
      this.boidGroup.add(boid.getSprite());
    }
    // Update quadTree with current boid positions
    this.quadTree.clear();
    for (const boid of this.boids) {
      const sprite = boid.getSprite();
      const body = {
        x: sprite.x,
        y: sprite.y,
        right: sprite.x + sprite.width,
        bottom: sprite.y + sprite.height,
        gameObject: boid,
      };
      this.quadTree.insert(body);
    }

    // Find nearby boids for each boid
    for (const boid of this.boids) {
      const sprite = boid.getSprite();
      const searchArea = {
        body: {
          x: sprite.x - this.BOID_SELECTION_SIZE / 2,
          y: sprite.y - this.BOID_SELECTION_SIZE / 2,
          right: sprite.x + this.BOID_SELECTION_SIZE / 2,
          bottom: sprite.y + this.BOID_SELECTION_SIZE / 2,
        },
        alive: true,
      };

      const nearbyBoids = this.quadTree.retrieve(searchArea);
      boid.update(nearbyBoids);
    }
  }
}
