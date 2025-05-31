import { createNoise2D } from 'simplex-noise';
import { GameConfig } from '../config/GameConfig';
import { Jellyfish } from './Jellyfish';

export class Environment {
  private scene: Phaser.Scene;
  private config: typeof GameConfig;
  public groundBodies: Phaser.Physics.Arcade.StaticGroup;
  public rocksBodies: Phaser.Physics.Arcade.StaticGroup;
  public corals: Phaser.GameObjects.Image[];
  public jellyfish: Jellyfish[];
  public jellyfishBodies: Phaser.Physics.Arcade.Group;
  private surfaceLine: Phaser.GameObjects.Graphics;
  private surfaceTime: number = 0;
  private readonly SURFACE_AMPLITUDE = 10;
  private readonly SURFACE_FREQUENCY = 0.02;
  private readonly SURFACE_SPEED = 0.01;
  private backgroundGraphics: Phaser.GameObjects.Graphics;

  private readonly KELP_DENSITY = 0.15;
  private readonly LARGE_KELP_DENSITY = 0.3;
  private readonly CORAL_DENSITY = 0.3;
  private readonly JELLYFISH_COUNT = 100;
  private readonly MIN_KELP_CORAL_DISTANCE = 40;

  private kelpPositions: { x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;

    this.createBackground();
    this.createGround();
    this.createSurfaceLine();
  }

  private createBackground() {
    this.backgroundGraphics = this.scene.add.graphics();

    this.backgroundGraphics.fillGradientStyle(
      0x87ceeb,
      0x87ceeb,
      0x00001b,
      0x00001b,
      0.2,
      0.2,
      0.99,
      0.99
    );

    // Fill the rectangle with the gradient
    this.backgroundGraphics.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Set blend mode for better visual effect
    this.backgroundGraphics.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.backgroundGraphics.setDepth(1.5);

    return this.backgroundGraphics;
  }

  public getBackgroundGraphics(): Phaser.GameObjects.Graphics {
    return this.backgroundGraphics;
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
        if (Math.random() < this.LARGE_KELP_DENSITY) {
          this.createLargeKelp(midX, midY);
        } else {
          this.createSmallKelp(midX, midY);
        }
        // Store kelp position for coral placement check
        this.kelpPositions.push({ x: midX, y: midY });
        // prevent kelp from being created too densely
        i++;
      }
    }
    graphics.setDepth(1.3);

    this.createRocks(points);
    this.createCorals(points);
    this.createJellyfish();
  }

  private createSurfaceLine() {
    this.surfaceLine = this.scene.add.graphics();
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
    this.jellyfish.forEach((jellyfish) => jellyfish.update());
  }

  private hasNearbyKelp(x: number, y: number): boolean {
    return this.kelpPositions.some((kelp) => {
      const dx = kelp.x - x;
      const dy = kelp.y - y;
      return dx * dx + dy * dy < this.MIN_KELP_CORAL_DISTANCE * this.MIN_KELP_CORAL_DISTANCE;
    });
  }

  private createCorals(points: Phaser.Math.Vector2[]) {
    this.corals = [];
    for (const point of points) {
      if (Math.random() > this.CORAL_DENSITY) continue;

      // Skip if there's kelp nearby
      if (this.hasNearbyKelp(point.x, point.y)) continue;

      const scale = Phaser.Math.FloatBetween(0.03, 0.07);
      const coral = this.scene.physics.add.staticImage(point.x, point.y - 800 * scale, 'coral');
      coral.setScale(scale);
      coral.setOrigin(0.5, 1);
      coral.y += coral.height * scale * 0.5;

      coral.setTintFill(Phaser.Math.Between(0xbd684a, 0xedb9ad));
      coral.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2));

      // Add wave-like motion to coral around bottom center pivot
      this.scene.tweens.add({
        targets: coral,
        rotation: coral.rotation + Phaser.Math.FloatBetween(-0.2, 0.2),
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.corals.push(coral);
    }
  }

  private createJellyfish() {
    this.jellyfish = [];
    this.jellyfishBodies = this.scene.physics.add.group({
      collideWorldBounds: true,
      bounceX: 1,
      bounceY: 1,
      dragX: 0,
      dragY: 0,
    });
    for (let i = 0; i < this.JELLYFISH_COUNT; i++) {
      const x = Phaser.Math.FloatBetween(0, this.config.worldWidth);
      const y = Phaser.Math.FloatBetween(
        this.config.surface.height + 100,
        this.config.worldHeight - this.config.ground.baseHeight - this.config.ground.maxHeight
      );
      const jellyfish = new Jellyfish(this.scene, x, y, this.jellyfishBodies);
      this.jellyfish.push(jellyfish);
    }
  }

  private createLargeKelp(midX: number, midY: number) {
    const maxAllowedScale = Math.min(
      (this.config.worldHeight - this.config.surface.height - this.config.ground.baseHeight - 200) /
        1200,
      4
    );

    const scale = Phaser.Math.Between(1, maxAllowedScale);

    const kelp = this.scene.physics.add.image(midX, midY - 300 * scale, 'kelp');
    kelp.setScale(scale);
    kelp.setDepth(-0.1);
    // Add wave-like motion to kelp while keeping bottom anchored
    const kelpHeight = kelp.height * scale;
    kelp.setOrigin(0.5, 1);
    kelp.y += kelpHeight / 2;
    this.scene.tweens.add({
      targets: kelp,
      scaleY: scale * 1.03,
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add slight delay to create wave effect
    this.scene.tweens.add({
      targets: kelp,
      rotation: 0.05,
      delay: Math.random() * 500,
      duration: 3000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // kelp.setTintFill(0x00331a);
    kelp.setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
    if (Math.random() < 0.5) {
      kelp.setFlipX(true);
    }
  }

  createSmallKelp(midX: number, midY: number) {
    const scale = Phaser.Math.FloatBetween(0.05, 0.7);
    const kelp = this.scene.physics.add.image(midX, midY - 140 * scale, 'kelp-2');
    kelp.setScale(scale);
    kelp.setDepth(-0.1);
    // Add wave-like motion to kelp while keeping bottom anchored
    const kelpHeight = kelp.height * scale;
    kelp.setOrigin(0.5, 1);
    kelp.y += kelpHeight / 2;
    this.scene.tweens.add({
      targets: kelp,
      scaleY: scale * 1.03,
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add slight delay to create wave effect
    this.scene.tweens.add({
      targets: kelp,
      rotation: 0.05,
      delay: Math.random() * 500,
      duration: 3000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    kelp.setDepth(0.1);
    kelp.setAlpha(Phaser.Math.FloatBetween(0.8, 0.95));
    if (Math.random() < 0.5) {
      kelp.setFlipX(true);
    }
  }
}
