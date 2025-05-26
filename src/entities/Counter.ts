import { GameConfig } from '../config/GameConfig';
import { FishGame } from '../scenes/Game';

export class Counter {
  private scene: FishGame;
  private config: typeof GameConfig;
  private counterText: Phaser.GameObjects.Text;

  private eatenFishCounter: number = 0;
  public readonly VICTORY_THRESHOLD = 500;

  constructor(scene: FishGame, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;

    this.counterText = this.scene.add
      .text(this.scene.cameras.main.width - 20, 20, 'Fish Eaten: 0', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0);
    this.counterText.setScrollFactor(0);
    this.counterText.setDepth(3);
  }

  updateCounter(val: number = 1) {
    this.eatenFishCounter += val;
    this.counterText.setText(`Fish Eaten: ${this.eatenFishCounter}`);

    // Check for victory condition
    if (this.eatenFishCounter >= this.VICTORY_THRESHOLD) {
      this.scene.ui.showVictoryScreen();
    }
  }
}
