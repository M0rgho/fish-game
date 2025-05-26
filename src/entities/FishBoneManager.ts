import { GameConfig } from '../config/GameConfig';
import { Boid } from './Boid';

export class FishBoneManager {
  private scene: Phaser.Scene;
  private config: typeof GameConfig;
  public fishBonesBodies: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;
    this.fishBonesBodies = this.scene.physics.add.group({
      collideWorldBounds: true,
      bounceX: 0.15,
      bounceY: 0.15,
      dragX: 50,
      dragY: 50,
      gravityY: 150,
    });
  }

  public createFishBone(boid: Boid) {
    const sprite = boid.getSprite();
    const fishBone = this.fishBonesBodies.create(sprite.x, sprite.y, 'fish-bone');

    fishBone.setScale(0.05);
    fishBone.setAlpha(Phaser.Math.FloatBetween(0.5, 0.8));
    fishBone.setScale(boid.size / 360 / 2);
    fishBone.setVelocity(sprite.body.velocity.x * 0.5, sprite.body.velocity.y * 0.5);
    fishBone.setAngularVelocity(10);
    fishBone.setDepth(-0.21);
    fishBone.setCircle((fishBone.width / 2) * 0.8);

    const angle = Math.atan2(fishBone.body.velocity.y, fishBone.body.velocity.x);
    fishBone.setRotation(angle);
    // Fade out and destroy after 40 seconds
    this.scene.time.delayedCall(40000, () => {
      this.scene.tweens.add({
        targets: fishBone,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          this.fishBonesBodies.remove(fishBone);
          fishBone.destroy();
        },
      });
    });
  }
}
