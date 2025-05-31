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
  private mainContainer: Phaser.GameObjects.Container;
  private menuContainer: Phaser.GameObjects.Container;
  private victoryContainer: Phaser.GameObjects.Container;
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
  private sharkInteractionCheckbox: Phaser.GameObjects.Rectangle;
  private sharkInteractionText: Phaser.GameObjects.Text;
  private blendModeText: Phaser.GameObjects.Text;
  private currentBlendMode: number = Phaser.BlendModes.DARKEN;
  public isPaused: boolean = true;
  private escapeKey: Phaser.Input.Keyboard.Key;
  private isFirstStart: boolean = true;
  private gameStartTime: number = 0;
  private debugMode: boolean = false;
  private debugInput: string = '';
  private debugKeyTimeout: number = 2000; // Time in ms to reset debug input
  private lastKeyPress: number = 0;
  private debugCheckboxes: DebugCheckbox[] = [];

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

    // Create main container that will handle all UI elements
    this.mainContainer = this.scene.add.container(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2
    );
    this.mainContainer.setScrollFactor(0);
    this.mainContainer.setDepth(100);

    // Create menu container for start/pause menu elements
    this.menuContainer = this.scene.add.container(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2
    );
    this.menuContainer.setScrollFactor(0);
    this.menuContainer.setDepth(101);

    // Create victory container for victory screen elements
    this.victoryContainer = this.scene.add.container(
      this.config.windowWidth / 2,
      this.config.windowHeight / 2
    );
    this.victoryContainer.setScrollFactor(0);
    this.victoryContainer.setDepth(101);

    this.createOverlay();
    this.createCenterOverlay();
    this.createTitleText();
    this.createPlayButton();
    this.createHowToPlayButton();
    this.createInfoBox();
    this.createAuthorText();
    this.createVictoryText();
    this.createSharkInteractionToggle();
    this.setupEscapeKey();
    this.setupResizeHandler();
    this.setupDebugInput();
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
      this.config.windowHeight + 1,
      0x000000,
      0.8
    );
    this.overlay.setOrigin(0.5);
    this.mainContainer.add(this.overlay);
  }

  private createCenterOverlay(): void {
    const centerWidth = this.config.windowWidth;
    const gradientWidth = centerWidth;
    const gradientHeight = this.config.windowHeight;

    const canvas = document.createElement('canvas');
    canvas.width = gradientWidth;
    canvas.height = gradientHeight + 1;
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

    this.centerOverlay = this.scene.add.sprite(0, 0, 'centerGradient');
    this.centerOverlay.setOrigin(0.5);
    this.mainContainer.add(this.centerOverlay);
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

  private createTitleText(): void {
    this.titleText = this.createText(0, -150, { ...this.TITLE_STYLE, text: 'The Fish Game' });
    this.menuContainer.add(this.titleText);
  }

  private createPlayButton(): void {
    this.playButton = this.createText(0, -50, { ...this.BUTTON_STYLE, text: 'START' });
    this.setupButton(this.playButton);
    this.menuContainer.add(this.playButton);
  }

  private createHowToPlayButton(): void {
    this.howToPlayButton = this.createText(0, 50, {
      ...this.DEFAULT_TEXT_STYLE,
      fontSize: '32px',
      text: 'HOW TO PLAY',
    });
    this.setupButton(this.howToPlayButton, () => this.toggleInfoBox());
    this.menuContainer.add(this.howToPlayButton);
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
    this.authorText = this.createText(0, this.config.windowHeight / 2 - 30, {
      text: 'Mikołaj Maślak, Szymon Głomski, 2025',
      fontStyle: 'italic',
      color: '#cccccc',
    });
    this.mainContainer.add(this.authorText);
  }

  private createVictoryText(): void {
    this.victoryText = this.createText(0, -150, {
      ...this.TITLE_STYLE,
      text: 'Congratulations you won!',
    });
    this.victoryText.setVisible(false);
    this.victoryContainer.add(this.victoryText);

    this.timeText = this.createText(0, 50, { fontSize: '48px', text: 'Your time: 00:00' });
    this.timeText.setVisible(false);
    this.victoryContainer.add(this.timeText);
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

  private createSharkInteractionToggle(): void {
    const checkboxSize = 24;
    const spacing = 40;
    const bottomMargin = 50;
    const totalHeight = spacing * (this.debugCheckboxes.length + 2); // +2 for future checkboxes and blend mode text
    const baseY = this.config.windowHeight / 2 - bottomMargin - totalHeight;

    // Create blend mode text
    this.blendModeText = this.scene.add.text(
      -this.config.windowWidth / 2 + 50,
      baseY,
      'Blend Mode: ' + 'MULTIPLY',
      {
        fontSize: '24px',
        color: '#ffffff',
      }
    );
    this.blendModeText.setOrigin(0, 0.5);
    this.blendModeText.setScrollFactor(0);
    this.blendModeText.setVisible(false);
    this.mainContainer.add(this.blendModeText);

    // Create shark interaction checkbox
    const sharkCheckbox = new DebugCheckbox(
      this.scene,
      -this.config.windowWidth / 2 + 50,
      baseY + spacing,
      checkboxSize,
      'Disable Shark Interaction',
      () => {
        this.config.disableSharkInteraction = !this.config.disableSharkInteraction;
        return this.config.disableSharkInteraction;
      },
      () => this.config.disableSharkInteraction
    );
    this.debugCheckboxes.push(sharkCheckbox);
    this.mainContainer.add(sharkCheckbox.getElements());

    // Create infinite stamina checkbox
    const staminaCheckbox = new DebugCheckbox(
      this.scene,
      -this.config.windowWidth / 2 + 50,
      baseY + spacing * 2,
      checkboxSize,
      'Infinite Stamina',
      () => {
        this.config.infiniteStamina = !this.config.infiniteStamina;
        return this.config.infiniteStamina;
      },
      () => this.config.infiniteStamina
    );
    this.debugCheckboxes.push(staminaCheckbox);
    this.mainContainer.add(staminaCheckbox.getElements());
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

  private setupResizeHandler(): void {
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.config.windowWidth = gameSize.width;
    this.config.windowHeight = gameSize.height;

    this.mainContainer.setPosition(this.config.windowWidth / 2, this.config.windowHeight / 2);

    this.menuContainer.setPosition(this.config.windowWidth / 2, this.config.windowHeight / 2);

    this.victoryContainer.setPosition(this.config.windowWidth / 2, this.config.windowHeight / 2);

    this.overlay.setSize(this.config.windowWidth, this.config.windowHeight);

    this.centerOverlay.setScale(
      this.config.windowWidth / this.centerOverlay.width,
      this.config.windowHeight / this.centerOverlay.height
    );

    this.authorText.setPosition(0, this.config.windowHeight / 2 - 30);
  }

  private setupDebugInput(): void {
    this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      const currentTime = Date.now();

      // Reset debug input if too much time has passed since last keypress
      if (currentTime - this.lastKeyPress > this.debugKeyTimeout) {
        this.debugInput = '';
      }

      this.lastKeyPress = currentTime;
      this.debugInput += event.key.toLowerCase();

      // Check if debug input matches "debugfish"
      if (this.debugInput.includes('debugfish')) {
        this.debugMode = !this.debugMode;
        this.debugInput = '';
        this.updateDebugElementsVisibility();
      }

      // Handle blend mode cycling with 'B' key when in debug mode
      if (event.key.toLowerCase() === 'b' && this.debugMode) {
        this.cycleBlendMode();
      }
    });
  }

  private cycleBlendMode() {
    // Only use WebGL supported blend modes
    const webglBlendModes = [
      Phaser.BlendModes.NORMAL,
      Phaser.BlendModes.ADD,
      Phaser.BlendModes.MULTIPLY,
      Phaser.BlendModes.SCREEN,
      Phaser.BlendModes.ERASE,
    ];

    const currentIndex = webglBlendModes.indexOf(this.currentBlendMode);
    const nextIndex = (currentIndex + 1) % webglBlendModes.length;
    this.currentBlendMode = webglBlendModes[nextIndex];

    const blendModeName = Object.keys(Phaser.BlendModes).find(
      (key) => Phaser.BlendModes[key as keyof typeof Phaser.BlendModes] === this.currentBlendMode
    );

    const backgroundGraphics = this.scene.environment.getBackgroundGraphics();
    if (backgroundGraphics) {
      backgroundGraphics.setBlendMode(this.currentBlendMode);
    }

    this.blendModeText.setText('Blend Mode: ' + blendModeName);
  }

  private updateDebugElementsVisibility(): void {
    const isVisible = this.debugMode;
    this.debugCheckboxes.forEach((checkbox) => checkbox.setVisible(isVisible));
    this.blendModeText.setVisible(isVisible);
  }
}

class DebugCheckbox {
  private checkbox: Phaser.GameObjects.Rectangle;
  private checkmark: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private getState: () => boolean;
  private isChecked: boolean;
  private getCurrentState: () => boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    label: string,
    toggleState: () => boolean,
    getCurrentState: () => boolean
  ) {
    this.getState = toggleState;
    this.getCurrentState = getCurrentState;
    this.isChecked = this.getCurrentState();

    // Create checkbox background
    this.checkbox = scene.add.rectangle(x, y, size, size, 0x000000, 0.8);
    this.checkbox.setStrokeStyle(2, 0xffffff);
    this.checkbox.setInteractive({ useHandCursor: true });
    this.checkbox.setVisible(false);
    this.checkbox.setScrollFactor(0);

    // Create checkmark
    this.checkmark = scene.add.text(x, y, '✓', {
      fontSize: `${size}px`,
      color: '#ffffff',
    });
    this.checkmark.setOrigin(0.5);
    this.checkmark.setVisible(false);
    this.checkmark.setScrollFactor(0);

    // Create text
    this.text = scene.add.text(x + size + 10, y, label, {
      fontSize: '24px',
      color: '#ffffff',
    });
    this.text.setOrigin(0, 0.5);
    this.text.setInteractive({ useHandCursor: true });
    this.text.setVisible(false);
    this.text.setScrollFactor(0);

    // Add click handlers
    const toggle = () => {
      this.isChecked = this.getState();
      this.checkmark.setVisible(this.isChecked);
    };

    this.checkbox.on('pointerdown', toggle);
    this.text.on('pointerdown', toggle);
  }

  public getElements(): Phaser.GameObjects.GameObject[] {
    return [this.checkbox, this.checkmark, this.text];
  }

  public setVisible(visible: boolean): void {
    this.checkbox.setVisible(visible);
    this.text.setVisible(visible);
    this.checkmark.setVisible(visible && this.isChecked);
  }
}
