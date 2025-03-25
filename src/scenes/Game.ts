import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Boid } from '../entities/Boid';
import { Shark } from '../entities/Shark';

export class Game extends Scene
{
    private boids: Boid[] = [];
    private camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    msg_text : Phaser.GameObjects.Text;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private shark: Shark;
    private config: GameConfig;
    private eatenFishCounter: number = 0;
    private counterText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
        this.config = GameConfig.getInstance();
    }

    preload() {
        this.load.image('shark', 'assets/shark_silhouette.svg');
        this.load.image('fish', 'assets/fish.svg');
    }

    create ()
    {
        this.camera = this.cameras.main;
        // Create gradient background
        const width = this.cameras.main.width;
        const height = this.cameras.main.height
        this.config.windowWidth = width;
        this.config.windowHeight = height;
        const gradientTexture = this.textures.createCanvas('gradient', width, height);
        const context = gradientTexture.getContext();
        
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#87CEEB'); // Light blue
        gradient.addColorStop(1, '#00008B'); // Dark blue
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        
        gradientTexture.refresh();
        
        this.add.image(width/2, height/2, 'gradient');

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        // Create initial boids
        for (let i = 0; i < 500; i++) {
            this.boids.push(new Boid(
                this,
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height)
            ));
        }


        // Create shark
        this.shark = new Shark(this, width/2, height/2);
        
        // Setup keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add debug toggle
        this.input.keyboard.on('keydown-D', () => {
            this.config.toggleDebug();
        });

        this.input.once('pointerdown', () => {
            // this.scene.start('GameOver');
        });

        // Add counter text in top right
        this.counterText = this.add.text(
            this.cameras.main.width - 20,
            20,
            'Eaten Fish: 0',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(1, 0);
    }

    update() {
        // Update shark first
        this.shark.update(this.cursors);
        
        // Update all boids with shark reference
        this.boids.forEach(boid => boid.update(this.shark));

        // Spawn new boids if population drops below 500
        if (this.boids.length < 500) {
            this.boids.push(new Boid(
                this,
                0, 
                0,
            ));
        }
    }

    incrementEatenFishCounter() {
        this.eatenFishCounter++;
        this.counterText.setText(`Eaten Fish: ${this.eatenFishCounter}`);
    }
}
