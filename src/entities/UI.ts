import { GameConfig } from '../config/GameConfig';
import { FishGame } from '../scenes/Game';

interface TextConfig {
  text: string;
  fontSize?: string;
  color?: string;
  padding?: { x: number; y: number };
  fontStyle?: string;
  align?: string;
  wordWrap?: { width: number };
}

export class UI {
  private scene: FishGame;
  private config: typeof GameConfig;
  private overlay: Phaser.GameObjects.Rectangle;
  private centerOverlay: Phaser.GameObjects.Sprite;
  private playButton: Phaser.GameObjects.Text;
  private howToPlayButton: Phaser.GameObjects.Text;
  private infoBox: Phaser.GameObjects.Container;
  private infoText: Phaser.GameObjects.Text;
  private authorText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private victoryText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  public isPaused: boolean = true;
  private escapeKey: Phaser.Input.Keyboard.Key;
  private isFirstStart: boolean = true;
  private gameStartTime: number = 0;

  private readonly DEFAULT_TEXT_STYLE: Partial<TextConfig> = {
    fontSize: '24px',
    color: '#ffffff',
  };

  private readonly TITLE_STYLE: Partial<TextConfig> = {
    fontSize: '72px',
    color: '#89c3f2',
    fontStyle: 'bold',
  };

  private readonly BUTTON_STYLE: Partial<TextConfig> = {
    fontSize: '64px',
    color: '#ffffff',
    padding: { x: 40, y: 20 },
  };

  constructor(scene: FishGame, config: typeof GameConfig) {
    this.scene = scene;
    this.config = config;
    this.createOverlay();
    this.createCenterOverlay();
    this.createTitleText();
    this.createPlayButton();
    this.createHowToPlayButton();
    this.createInfoBox();
    this.createAuthorText();
    this.createVictoryText();
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
      this.config.windowWidth / 2,
      this.config.windowHeight / 2,
      this.config.windowWidth,
      this.config.windowHeight,
      0x000000,
      0.8
    );
    this.overlay.setOrigin(0.5);
    this.setupBaseUIElement(this.overlay);
  }

  private createCenterOverlay(): void {
    const centerWidth = this.config.windowWidth;
    const gradientWidth = centerWidth;
    const gradientHeight = this.config.windowHeight;

    const canvas = document.createElement('canvas');
    canvas.width = gradientWidth;
    canvas.height = gradientHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, gradientWidth, 0);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
      gradient.addColorStop(0.2, 'rgba(0, 0, 0, 0.6)');
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
      gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, gradientWidth, gradientHeight);

      this.scene.textures.addCanvas('centerGradient', canvas);
    }

    this.centerOverlay = this.scene.add.sprite(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2,
      'centerGradient'
    );
    this.setupBaseUIElement(this.centerOverlay);
  }

  private createText(x: number, y: number, config: TextConfig): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, config.text, {
      ...this.DEFAULT_TEXT_STYLE,
      ...config,
    });
    text.setOrigin(0.5);
    text.setDepth(101);
    text.setScrollFactor(0);
    return text;
  }

  private setupBaseUIElement(element: Phaser.GameObjects.GameObject): void {
    if ('setDepth' in element) {
      (element as any).setDepth(100);
    }
    if ('setVisible' in element) {
      (element as any).setVisible(false);
    }
    if ('setScrollFactor' in element) {
      (element as any).setScrollFactor(0);
    }
  }

  private createTitleText(): void {
    this.titleText = this.createText(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2 - 150,
      { ...this.TITLE_STYLE, text: 'The Fish Game' }
    );
  }

  private createPlayButton(): void {
    this.playButton = this.createText(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2 - 50,
      { ...this.BUTTON_STYLE, text: 'START' }
    );
    this.setupButton(this.playButton);
  }

  private createHowToPlayButton(): void {
    this.howToPlayButton = this.createText(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2 + 50,
      { ...this.DEFAULT_TEXT_STYLE, fontSize: '32px', text: 'HOW TO PLAY' }
    );
    this.setupButton(this.howToPlayButton, () => this.toggleInfoBox());
  }

  private setupButton(button: Phaser.GameObjects.Text, onClick?: () => void): void {
    button.setInteractive({ useHandCursor: true });
    button.setVisible(false);

    button.on('pointerover', () => {
      button.setStyle({ color: '#ffff00' });
    });

    button.on('pointerout', () => {
      button.setStyle({ color: '#ffffff' });
    });

    if (onClick) {
      button.on('pointerdown', onClick);
    } else {
      button.on('pointerdown', () => {
        if (button.text === 'PLAY AGAIN') {
          this.scene.scene.restart();
        }
        this.hideUI();
      });
    }
  }

  private createInfoBox(): void {
    const boxWidth = 800;
    const boxHeight = 400;
    const boxX = this.config.windowWidth / 2;
    const boxY = this.config.windowHeight / 2;

    // Create container at screen center
    this.infoBox = this.scene.add.container(0, 0);
    this.infoBox.setDepth(102);
    this.infoBox.setVisible(false);
    this.infoBox.setScrollFactor(0);

    // Create background at screen center
    const background = this.scene.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x000000, 0.99);
    background.setOrigin(0.5);
    background.setStrokeStyle(2, 0xffffff);
    background.setScrollFactor(0);

    // Create text at screen center
    this.infoText = this.scene.add.text(
      boxX,
      boxY,
      `Welcome to the underwater world! Hunt ${this.scene.counter.VICTORY_THRESHOLD} fish to become the ultimate predator.\n\n` +
        'Controls:\n' +
        '• Arrow keys to swim\n' +
        '• Space bar for speed burst\n\n' +
        'Watch your stamina bar (bottom right) to manage your speed burst.\n' +
        'Eat fish to grow larger and be faster!',
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: boxWidth - 40 },
      }
    );
    this.infoText.setOrigin(0.5);
    this.infoText.setScrollFactor(0);

    // Create close button relative to the box
    const closeButton = this.scene.add.text(
      boxX + boxWidth / 2 - 30,
      boxY - boxHeight / 2 + 30,
      'X',
      {
        fontSize: '32px',
        color: '#ffffff',
      }
    );
    closeButton.setOrigin(0.5);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.setScrollFactor(0);
    closeButton.on('pointerdown', () => this.toggleInfoBox());
    closeButton.on('pointerover', () => closeButton.setStyle({ color: '#cccccc' }));
    closeButton.on('pointerout', () => closeButton.setStyle({ color: '#ffffff' }));

    // Add all elements to container
    this.infoBox.add([background, this.infoText, closeButton]);
  }

  private createAuthorText(): void {
    this.authorText = this.createText(this.config.windowWidth / 2, this.config.windowHeight - 30, {
      text: 'Mikołaj Maślak, Szymon Głomski, 2025',
      fontStyle: 'italic',
      color: '#cccccc',
    });
  }

  private createVictoryText(): void {
    this.victoryText = this.createText(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2 - 150,
      { ...this.TITLE_STYLE, text: 'Congratulations you won!' }
    );
    this.victoryText.setVisible(false);

    this.timeText = this.createText(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2 + 50,
      { fontSize: '48px', text: 'Your time: 00:00' }
    );
    this.timeText.setVisible(false);
  }

  private toggleInfoBox(): void {
    this.infoBox.setVisible(!this.infoBox.visible);
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private fadeInElements(elements: Phaser.GameObjects.GameObject[]): void {
    elements.forEach((element) => {
      if ('setAlpha' in element) {
        (element as any).setAlpha(0);
      }
    });
    this.scene.tweens.add({
      targets: elements,
      alpha: 1,
      duration: 200,
    });
  }

  private fadeOutElements(
    elements: Phaser.GameObjects.GameObject[],
    onComplete?: () => void
  ): void {
    this.scene.tweens.add({
      targets: elements,
      alpha: 0,
      duration: 200,
      onComplete,
    });
  }

  public showVictoryScreen(): void {
    this.isPaused = true;
    const gameTime = Date.now() - this.gameStartTime;
    this.timeText.setText(`Your time: ${this.formatTime(gameTime)}`);

    const elements = [
      this.overlay,
      this.centerOverlay,
      this.victoryText,
      this.timeText,
      this.playButton,
    ];

    elements.forEach((element) => element.setVisible(true));
    this.playButton.setText('PLAY AGAIN');
    this.fadeInElements(elements);
    this.scene.events.emit('gamePaused');
  }

  private showStartMenu(): void {
    this.isPaused = true;
    const elements = [
      this.overlay,
      this.centerOverlay,
      this.titleText,
      this.playButton,
      this.howToPlayButton,
      this.authorText,
    ];

    elements.forEach((element) => {
      element.setVisible(true);
      element.setAlpha(1);
    });

    this.playButton.setText('START');
    this.scene.events.emit('gamePaused');
  }

  public showPauseMenu(): void {
    this.isPaused = true;
    const elements = [
      this.overlay,
      this.centerOverlay,
      this.titleText,
      this.playButton,
      this.howToPlayButton,
    ];

    elements.forEach((element) => element.setVisible(true));
    this.playButton.setText('CONTINUE');
    this.fadeInElements(elements);
    this.scene.events.emit('gamePaused');
  }

  private hideUI(): void {
    const elements = [
      this.overlay,
      this.centerOverlay,
      this.titleText,
      this.playButton,
      this.howToPlayButton,
      this.authorText,
      this.victoryText,
      this.timeText,
    ];

    this.fadeOutElements(elements, () => {
      elements.forEach((element) => element.setVisible(false));
      this.infoBox.setVisible(false);
      this.isPaused = false;
      this.isFirstStart = false;
      this.gameStartTime = Date.now();
      this.scene.events.emit('gameResumed');
    });
  }
}
