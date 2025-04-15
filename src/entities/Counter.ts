import { GameConfig } from '../config/GameConfig';

export class Counter {

    private scene: Phaser.Scene;
    private config: typeof GameConfig;
    private counterText: Phaser.GameObjects.Text;

    private eatenFishCounter: number = 0;

    constructor(scene: Phaser.Scene, config: typeof GameConfig) {
        this.scene = scene;
        this.config = config;

        this.counterText = this.scene.add.text(
            this.scene.cameras.main.width - 20,
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
        this.counterText.setScrollFactor(0);
        this.counterText.setDepth(3);
    }

    updateCounter(val: number = 1) {
        this.eatenFishCounter += val;
        this.counterText.setText(`Eaten Fish: ${this.eatenFishCounter}`);
    }
}
