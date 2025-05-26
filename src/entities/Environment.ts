import { createNoise2D } from 'simplex-noise';
import { GameConfig } from '../config/GameConfig';

export class Environment {
  private scene: Phaser.Scene;
  private config: typeof GameConfig;
  public groundBodies: Phaser.Physics.Arcade.StaticGroup;
  public rocksBodies: Phaser.Physics.Arcade.StaticGroup;
  private surfaceLine: Phaser.GameObjects.Graphics;
  private surfaceTime: number = 0;
  private readonly SURFACE_AMPLITUDE = 10;
  private readonly SURFACE_FREQUENCY = 0.02;
  private readonly SURFACE_SPEED = 0.01;

  private readonly KELP_DENSITY = 0.2;
  private readonly ROCK_DENSITY = 0;

  constructor(scene: Phaser.Scene, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;

    this.createBackground();
    // add second background layer to get squared color effect
    // const bg2 = this.createBackground();
    // bg2.setAlpha(0.7);

    this.createGround();
    this.createSurfaceLine();
  }

  private createGround() {
    const width = this.config.worldWidth;
    const height = this.config.worldHeight;
    const graphics = this.scene.add.graphics();

    // Create 2D noise generator function
    const noise2D = createNoise2D();
    const smallNoise2D = createNoise2D();

    // Generate points for the curve
    const points: Phaser.Math.Vector2[] = [];
    const baseY = this.config.worldHeight - this.config.ground.baseHeight;

    // Add starting point at bottom left
    points.push(new Phaser.Math.Vector2(0, height));
    points.push(new Phaser.Math.Vector2(0, baseY));

    // Generate terrain points
    for (let x = 0; x < width; x += this.config.ground.quality) {
      const noiseValue = noise2D(x * this.config.ground.resolution, 0);
      const smallRoughness = smallNoise2D(x, 0);
      const y =
        baseY +
        noiseValue * this.config.ground.maxHeight +
        smallRoughness * this.config.ground.surfraceRoughness;
      points.push(new Phaser.Math.Vector2(x, y));
    }

    // Add ending points to close the shape
    points.push(new Phaser.Math.Vector2(width + 10, points[points.length - 1].y));
    points.push(new Phaser.Math.Vector2(width, height));

    // Create spline curve from points
    const curve = new Phaser.Curves.Spline(points);

    // Draw filled curve
    graphics.fillStyle(0xcbbd93, 1);
    graphics.beginPath();
    curve.draw(graphics, (64 * this.config.worldWidth) / this.config.windowWidth);
    graphics.closePath();
    graphics.fillPath();
    graphics.setBlendMode(Phaser.BlendModes.SOFT_LIGHT);

    // Create a static group for ground bodies
    this.groundBodies = this.scene.physics.add.staticGroup();

    // Create a static image for the ground shape (color only)
    for (let i = 2; i < points.length - 2; i++) {
      const midY = (points[i].y + points[i + 1].y) / 2 + this.config.ground.quality / 2;
      const midX = (points[i].x + points[i + 1].x) / 2;
      const box = this.scene.add.rectangle(
        midX,
        midY,
        this.config.ground.quality,
        Math.max(this.config.ground.quality, 10),
        0x00f00,
        0.9
      );
      if (this.config.debug) {
        box.setStrokeStyle(2, 0x00ff00);
      } else {
        box.setVisible(false);
      }
      this.scene.physics.add.existing(box, true);
      this.groundBodies.add(box);

      // Create kelp
      if (Math.random() < this.KELP_DENSITY) {
        const maxAllowedScale = Math.min(
          (this.config.worldHeight -
            this.config.surface.height -
            this.config.ground.baseHeight -
            200) /
            1600,
          8
        );
        const scale = Phaser.Math.Between(1, maxAllowedScale);
        const kelp = this.scene.physics.add.image(midX, midY - 350 * scale, 'kelp');
        console.log(kelp.width, kelp.height);
        kelp.setScale(scale);
        kelp.setDepth(-10);
        kelp.setTintFill(0x00331a);
        kelp.setAlpha(Phaser.Math.Between(0.5, 1));
        if (Math.random() < 0.5) {
          kelp.setFlipX(true);
        }
      }
    }
    graphics.setDepth(1.3);

    // create rocks
    this.createRocks(points);
  }

  private createSurfaceLine() {
    this.surfaceLine = this.scene.add.graphics();
  }

  private createBackground() {
    const graphics = this.scene.add.graphics();

    // Create gradient fill using Phaser's fillGradientStyle
    graphics.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x00001b, 0x00001b, 0.3, 0.3, 0.95, 0.95);

    // Fill the rectangle with the gradient
    graphics.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Set blend mode for better visual effect
    graphics.setBlendMode(Phaser.BlendModes.MULTIPLY);
    graphics.setDepth(1.5);

    return graphics;
  }

  private updateSurfaceLine() {
    this.surfaceTime += this.SURFACE_SPEED;
    this.surfaceLine.clear();

    // Create a mask shape that covers everything above the wave
    this.surfaceLine.fillStyle(0x87ceeb, 1);
    this.surfaceLine.beginPath();

    const camera = this.scene.cameras.main;
    const leftEdge = Math.floor((camera.scrollX - 100) / 5) * 5;
    const rightEdge = Math.ceil((camera.scrollX + camera.width + 100) / 5) * 5;

    // Start from left edge
    this.surfaceLine.moveTo(leftEdge, 0);

    // Draw the wave line only for visible area
    for (let x = leftEdge; x <= rightEdge; x += 5) {
      const y =
        this.config.surface.height +
        Math.sin(x * this.SURFACE_FREQUENCY + this.surfaceTime) * this.SURFACE_AMPLITUDE +
        Math.sin(x * this.SURFACE_FREQUENCY * 2 + this.surfaceTime * 4) *
          (this.SURFACE_AMPLITUDE * 0.5) +
        Math.sin(x * 10 + 4 * this.surfaceTime) * 3;
      this.surfaceLine.lineTo(x, y);
    }

    // Complete the shape by going to top-right and back to start
    this.surfaceLine.lineTo(rightEdge, 0);
    this.surfaceLine.lineTo(leftEdge, 0);

    this.surfaceLine.closePath();
    this.surfaceLine.fillPath();
  }

  private createRocks(points: Phaser.Math.Vector2[]) {
    this.rocksBodies = this.scene.physics.add.staticGroup();
    const offsets = [];
    let totalOffset = 0;
    while (totalOffset < points.length) {
      const offset = Phaser.Math.Between(3, 30);
      totalOffset += offset;
      offsets.push(totalOffset);
    }
    offsets.pop();
    for (const offset of offsets) {
      const scale = Phaser.Math.FloatBetween(0.05, 0.3);
      const yOffset = Phaser.Math.FloatBetween(0, 100) * scale;
      const rock = this.scene.physics.add.staticImage(
        points[offset].x,
        points[offset].y - yOffset,
        'rock'
      );
      rock.setScale(scale);
      rock.setCircle(100);
      rock.refreshBody();
      const radius = rock.width * scale * 0.38;
      rock.body.setCircle(radius, 0, 0);
      rock.body.setOffset(rock.width * scale * 0.5 - radius, rock.height * scale * 0.17);
      rock.setBounce(1);

      // rock.setCircle(rock.width * scale * 0, 10, rock.width * scale * 0.1);

      this.rocksBodies.add(rock);
    }
  }

  public update() {
    this.updateSurfaceLine();
  }
}
