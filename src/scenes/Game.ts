import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Shark } from '../entities/Shark';
import { Environment } from '../entities/Environment';
import { Counter } from '../entities/Counter';
import { BoidManager } from '../entities/BoidManager';

export class FishGame extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private msg_text: Phaser.GameObjects.Text;
  private config: typeof GameConfig;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private fullscreenKey: Phaser.Input.Keyboard.Key;
  private boidManager: BoidManager;
  // private groundBodies: Phaser.Physics.Arcade.StaticGroup;

  // ============ public ============
  public environment: Environment;
  public shark: Shark;
  public counter: Counter;

  constructor() {
    super({
      key: 'Game',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: GameConfig.debug,
          debugShowBody: true,
          debugShowVelocity: true,
          debugBodyColor: 0x00ff00,
        },
      },
    });
    this.config = GameConfig;
  }

  // private seededRandom(): number {
  //     this.seed = (this.seed * 9301 + 49297) % 233280;
  //     return this.seed / 233280;
  // }

  preload() {
    this.load.image('shark', 'assets/shark_silhouette.svg');
    this.load.image('fish', 'assets/fish.svg');
    this.load.image('clown_fish', 'assets/clown_fish.svg');
  }

  create() {
    // Set up the world bounds
    this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
    this.physics.world.fixedStep = false;

    // Set up the camera with smoother follow
    this.camera = this.cameras.main;
    this.camera
      .setBounds(0, 0, this.config.worldWidth, this.config.worldHeight)
      .setLerp(0.1, 0.1)
      .setDeadzone(100, 100)
      .setFollowOffset(0, 0);

    this.environment = new Environment(this, this.config);

    // // Create shark
    this.shark = new Shark(this, 100, this.config.surface.height + 100);
    this.shark.getSprite().setDepth(1.1);

    this.camera.startFollow(
      this.shark.getSprite(),
      true,
      this.config.camera.lerpX,
      this.config.camera.lerpY
    );

    this.boidManager = new BoidManager(this, this.config);

    // Add collision between shark and ground
    this.physics.add.collider(this.shark.getSprite(), this.environment.groundBodies);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.counter = new Counter(this, this.config);

    // Add fullscreen toggle key
    this.fullscreenKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.fullscreenKey.on('down', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  update() {
    // Update shark first
    this.shark.update(this.cursors);

    // Update environment (waves and ground)
    this.environment.update();

    // Update boids
    this.boidManager.update();

    // Update tab title with FPS
    document.title = `Boids Game - ${Math.round(this.game.loop.actualFps)} FPS`;
  }
}
