import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Jellyfish {
  public sprite: Phaser.Physics.Arcade.Image;
  private config: typeof GameConfig;
  private scene: Phaser.Scene;

  private scale: number;
  constructor(scene: Phaser.Scene, x: number, y: number, group: Phaser.Physics.Arcade.Group) {
    this.config = GameConfig;
    this.scene = scene;
    this.sprite = group.create(x, y, 'jellyfish');
    this.scale = Phaser.Math.FloatBetween(0.01, 0.06);
    this.sprite.setScale(this.scale);

    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xf5dce9),
      Phaser.Display.Color.ValueToColor(0xdb69b0),
      100,
      Phaser.Math.Between(0, 100)
    ).color;
    this.sprite.setTintFill(color);
    this.sprite.setAlpha(Phaser.Math.FloatBetween(0.2, 0.4));
    this.sprite.setDepth(-0.1);
    this.sprite.setCollideWorldBounds(true);

    const maxSpeed = 100 * (1 - this.scale * 10);
    this.sprite.setVelocity(
      Phaser.Math.Between(-maxSpeed, maxSpeed),
      Phaser.Math.Between(-maxSpeed, maxSpeed)
    );
    this.sprite.setRotation(
      Math.atan2(this.sprite.body.velocity.y, this.sprite.body.velocity.x) + Math.PI / 2
    );
  }

  update() {
    this.sprite.setRotation(
      Math.atan2(this.sprite.body.velocity.y, this.sprite.body.velocity.x) + Math.PI / 2
    );

    if (this.sprite.y - 50 < this.config.surface.height) {
      this.sprite.setGravityY(1000);
      return;
    } else {
      this.sprite.setGravityY(0);
    }
  }
}
