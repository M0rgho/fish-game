import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class UI {
  private scene: Scene;
  private config: typeof GameConfig;
  private overlay: Phaser.GameObjects.Rectangle;
  private playButton: Phaser.GameObjects.Text;
  public isPaused: boolean = true;
  private escapeKey: Phaser.Input.Keyboard.Key;
  private isFirstStart: boolean = true;

  constructor(scene: Scene, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;
    this.createOverlay();
    this.createPlayButton();
    this.setupEscapeKey();
    this.showStartMenu();
  }

  private setupEscapeKey(): void {
    this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => {
      if (!this.isPaused) {
        this.showPauseMenu();
      } else if (!this.isFirstStart) {
        this.hideUI();
      }
    });
  }

  private createOverlay(): void {
    this.overlay = this.scene.add.rectangle(
      0,
      0,
      this.config.windowWidth,
      this.config.windowHeight,
      0x000000,
      0.6
    );
    this.overlay.setOrigin(0, 0);
    this.overlay.setDepth(100);
    this.overlay.setVisible(false);
    this.overlay.setScrollFactor(0);
  }

  private createPlayButton(): void {
    this.playButton = this.scene.add.text(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2,
      'PLAY',
      {
        fontSize: '64px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 40, y: 20 },
      }
    );
    this.playButton.setOrigin(0.5);
    this.playButton.setDepth(101);
    this.playButton.setInteractive({ useHandCursor: true });
    this.playButton.setVisible(false);
    this.playButton.setScrollFactor(0);

    this.setupButtonInteractions();
  }

  private setupButtonInteractions(): void {
    this.playButton.on('pointerover', () => {
      this.playButton.setStyle({ color: '#ffff00' });
    });

    this.playButton.on('pointerout', () => {
      this.playButton.setStyle({ color: '#ffffff' });
    });

    this.playButton.on('pointerdown', () => {
      this.hideUI();
    });
  }

  private showStartMenu(): void {
    this.isPaused = true;
    this.overlay.setVisible(true);
    this.playButton.setVisible(true);
    this.playButton.setText('PLAY');
    this.overlay.setAlpha(1);
    this.playButton.setAlpha(1);
    this.scene.events.emit('gamePaused');
  }

  public showPauseMenu(): void {
    this.isPaused = true;
    this.overlay.setVisible(true);
    this.playButton.setVisible(true);
    this.playButton.setText('CONTINUE');
    this.overlay.setAlpha(0);
    this.playButton.setAlpha(0);

    this.scene.tweens.add({
      targets: [this.overlay, this.playButton],
      alpha: 1,
      duration: 200,
    });
    this.scene.events.emit('gamePaused');
  }

  private hideUI(): void {
    this.scene.tweens.add({
      targets: [this.overlay, this.playButton],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.overlay.setVisible(false);
        this.playButton.setVisible(false);
        this.isPaused = false;
        this.isFirstStart = false;
        this.scene.events.emit('gameResumed');
      },
    });
  }
}
