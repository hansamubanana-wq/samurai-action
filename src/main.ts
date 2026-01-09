// src/main.ts
import Phaser from 'phaser';
import './style.css';

// --- 型定義 ---
type DialogLine = {
  name: string;
  text: string;
};

// --- タイトルシーン ---
class TitleScene extends Phaser.Scene {
  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;
  private bg3!: Phaser.GameObjects.TileSprite;
  private bg4!: Phaser.GameObjects.TileSprite;
  private bg5!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('TitleScene');
  }

  preload() {
    this.load.image('bg_1', '/assets/background/bg_1.png');
    this.load.image('bg_2', '/assets/background/bg_2.png');
    this.load.image('bg_3', '/assets/background/bg_3.png');
    this.load.image('bg_4', '/assets/background/bg_4.png');
    this.load.image('bg_5', '/assets/background/bg_5.png');
    this.load.audio('se_attack', '/assets/sounds/attack.mp3');
  }

  create() {
    const { width, height } = this.scale;

    this.bg1 = this.add.tileSprite(0, 0, width, height, 'bg_1').setOrigin(0, 0).setScale(4); 
    this.bg2 = this.add.tileSprite(0, 0, width, height, 'bg_2').setOrigin(0, 0).setScale(4); 
    this.bg3 = this.add.tileSprite(0, 0, width, height, 'bg_3').setOrigin(0, 0).setScale(4);
    this.bg4 = this.add.tileSprite(0, 0, width, height, 'bg_4').setOrigin(0, 0).setScale(4);
    this.bg5 = this.add.tileSprite(0, 0, width, height, 'bg_5').setOrigin(0, 0).setScale(4);

    this.add.text(width / 2, height / 2 - 80, '霧隠の侍', {
      fontSize: '120px',
      fontFamily: '"Yu Mincho", serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { blur: 10, color: '#000000', fill: true }
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 40, '第一章：門番', {
        fontSize: '40px',
        fontFamily: '"Yu Mincho", serif',
        color: '#aaaaaa'
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height / 2 + 150, '- Click to Start -', {
      fontSize: '40px',
      fontFamily: '"Yu Mincho", serif',
      color: '#ffcc00'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.input.on('pointerdown', () => {
      this.sound.play('se_attack', { volume: 1.5 }); 
      // ★開始時に振動（バイブレーションAPI）
      if (navigator.vibrate) navigator.vibrate(50);
      
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('MainScene');
      });
    });
  }

  update() {
    this.bg1.tilePositionX += 0.05; 
    this.bg2.tilePositionX += 0.2;
    this.bg3.tilePositionX += 0.4;
    this.bg4.tilePositionX += 0.6;
    this.bg5.tilePositionX += 1.0;
  }
}


// --- 敵クラス ---
class Enemy extends Phaser.Physics.Arcade.Sprite {
  protected moveSpeed: number = 100;
  protected detectRange: number = 500;
  protected attackRange: number = 150;
  
  public attackHitbox: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  protected isAttacking: boolean = false;
  protected nextAttackTime: number = 0;
  
  public hp: number = 3;
  public maxHp: number = 3;
  public isDead: boolean = false;
  protected healthBar: Phaser.GameObjects.Graphics;
  public isHit: boolean = false;
  public isStunned: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'player_idle') {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setScale(2);
    this.setTint(0xff5555);
    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.body!.setSize(40, 60);
    this.body!.setOffset(80, 60); // 接地調整
    
    this.setDepth(1);
    this.play('idle');

    const hitboxRect = scene.add.rectangle(0, 0, 150, 150, 0xff0000, 0);
    this.attackHitbox = scene.physics.add.existing(hitboxRect) as unknown as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    this.attackHitbox.setVisible(false);
    this.attackHitbox.body!.enable = false;
    this.attackHitbox.body!.setAllowGravity(false);

    this.healthBar = scene.add.graphics();
    this.drawHealthBar();

    this.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (anim.key === 'attack') {
        this.isAttacking = false;
        if (!this.isDead && !this.isStunned) this.play('idle', true);
      }
      if (anim.key === 'death') {
        this.destroy(); 
      }
    }, this);
  }

  destroy(fromScene?: boolean) {
    if (this.attackHitbox) this.attackHitbox.destroy();
    if (this.healthBar) this.healthBar.destroy();
    super.destroy(fromScene);
  }

  drawHealthBar() {
    this.healthBar.clear();
    if (this.isDead) return;

    const width = 60;
    const height = 8;
    const x = this.x - width / 2;
    const y = this.y - 80;

    this.healthBar.fillStyle(0xcc0000);
    this.healthBar.fillRect(x, y, width, height);

    const hpPercent = Math.max(0, this.hp / this.maxHp);
    this.healthBar.fillStyle(0x00ff00);
    this.healthBar.fillRect(x, y, width * hpPercent, height);
  }

  update(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.isDead) this.drawHealthBar();
    else this.healthBar.clear();

    if (this.isDead || this.isStunned || this.scene.physics.world.isPaused || !(this.scene as MainScene).isPlayerAlive) {
      this.setVelocityX(0);
      return;
    }
    if (this.isAttacking) {
      this.setVelocityX(0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const time = this.scene.time.now;

    if (distance < this.attackRange) {
      this.setVelocityX(0);
      if (time > this.nextAttackTime) {
        this.startAttack(player);
      } else {
        this.play('idle', true);
      }
    }
    else if (distance < this.detectRange) {
      if (this.x > player.x) {
        this.setVelocityX(-this.moveSpeed);
        this.setFlipX(true);
        this.play('run', true);
      } else {
        this.setVelocityX(this.moveSpeed);
        this.setFlipX(false);
        this.play('run', true);
      }
    } 
    else {
      this.setVelocityX(0);
      this.play('idle', true);
    }
  }

  startAttack(player: Phaser.Physics.Arcade.Sprite) {
    this.isAttacking = true;
    this.nextAttackTime = this.scene.time.now + 2000;
    this.setFlipX(this.x > player.x);
    this.play('attack', true);
    this.scene.sound.play('se_attack', { volume: 1.5 }); 

    const offsetX = this.flipX ? -120 : 120;
    this.attackHitbox.setPosition(this.x + offsetX, this.y);

    this.scene.time.delayedCall(300, () => {
      if (this.isAttacking && this.active && !this.isDead && !this.isStunned) {
        this.attackHitbox.body!.enable = true;
        this.scene.time.delayedCall(100, () => {
          if (this.attackHitbox.active) {
            this.attackHitbox.body!.enable = false;
            this.attackHitbox.setVisible(false);
          }
        });
      }
    });
  }

  takeDamage() {
    if (this.isDead || this.isHit) return;
    this.isHit = true;
    this.hp--;
    this.drawHealthBar();

    // ★ダメージ演出：血しぶき
    (this.scene as MainScene).createBloodEffect(this.x, this.y);
    
    // ★ヒットストップ（小）
    (this.scene as MainScene).triggerHitStop(50);
    
    // ★振動（小）
    (this.scene as MainScene).triggerVibration(30);

    if (this.hp <= 0) {
        this.die();
    } else {
        this.scene.sound.play('se_hit', { volume: 1.2 });
        this.setTint(0xffaaaa);
        this.scene.time.delayedCall(100, () => this.setTint(0xff5555));
        const backDir = this.flipX ? 1 : -1;
        this.setVelocityX(100 * backDir);
        this.scene.time.delayedCall(500, () => { if (this.active) this.isHit = false; });
    }
  }

  protected die() {
    (this.scene as MainScene).addScore(100);
    
    // ★トドメ演出：ヒットストップ（大）、振動（大）
    (this.scene as MainScene).triggerHitStop(150);
    (this.scene as MainScene).triggerVibration(100);

    this.isDead = true;
    this.setVelocity(0, 0);
    if (this.body) {
        this.body.checkCollision.none = true; 
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }
    this.attackHitbox.body!.enable = false; 
    
    this.scene.sound.play('se_hit', { volume: 1.5 });
    this.play('death', true); 
  }

  getStunned() {
    if (this.isDead || this.isStunned) return;
    this.isStunned = true;
    this.isAttacking = false;
    this.attackHitbox.body!.enable = false; 
    
    const backDir = this.flipX ? 1 : -1;
    this.setVelocityX(200 * backDir);
    this.setVelocityY(-200);
    this.setTint(0xffff00); 

    this.scene.time.delayedCall(1500, () => {
      if (this.active && !this.isDead) {
        this.isStunned = false;
        this.setTint(0xff5555);
      }
    });
  }
}

// --- ボス ---
class BossEnemy extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.setScale(3); 
        this.hp = 10;     
        this.maxHp = 10;
        this.moveSpeed = 150; 
        this.attackRange = 200; 
        this.setTint(0x550000); 
        this.body!.setSize(40, 60);
        this.body!.setOffset(80, 60);
    }

    protected die() {
        (this.scene as MainScene).addScore(1000);
        
        // ★ボス撃破演出：超ヒットストップ
        (this.scene as MainScene).triggerHitStop(300);
        (this.scene as MainScene).triggerVibration(500);
        (this.scene as MainScene).cameras.main.flash(500, 255, 255, 255); // 白フラッシュ

        this.isDead = true;
        this.setVelocity(0, 0);
        if (this.body) {
            this.body.checkCollision.none = true; 
            (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        }
        this.attackHitbox.body!.enable = false; 
        this.scene.sound.play('se_hit', { volume: 2.0 });
        this.play('death', true);
        
        (this.scene as MainScene).onBossDefeated();
    }
}

// --- メインシーン ---
class MainScene extends Phaser.Scene {
  public isPlayerAlive: boolean = true;
  
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  
  private enemies: Enemy[] = []; 
  private attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;
  private bg3!: Phaser.GameObjects.TileSprite;
  private bg4!: Phaser.GameObjects.TileSprite;
  private bg5!: Phaser.GameObjects.TileSprite;

  private isAttacking: boolean = false;
  private isInvincible: boolean = false;
  
  private isBlocking: boolean = false; 
  private blockStartTime: number = 0;  

  private hp: number = 100;
  private maxHp: number = 100;
  private hpBar!: Phaser.GameObjects.Graphics;
  
  private gameOverText!: Phaser.GameObjects.Text;
  private gameClearText!: Phaser.GameObjects.Text;
  private retryText!: Phaser.GameObjects.Text;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  
  private wave: number = 0; 
  private killCount: number = 0; 
  private spawnTimer!: Phaser.Time.TimerEvent;

  private inputLeft: boolean = false;
  private inputRight: boolean = false;
  private inputUp: boolean = false;
  private inputDown: boolean = false; 
  private inputAttack: boolean = false;

  private isTalking: boolean = false; 
  private currentDialog: DialogLine[] = [];
  private currentLineIndex: number = 0;
  private dialogBox!: HTMLElement;
  private dialogName!: HTMLElement;
  private dialogText!: HTMLElement;

  constructor() {
    super('MainScene');
  }

  preload() {
    // --- 画像読み込み ---
    this.load.spritesheet('player_idle', '/assets/Idle.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('player_run', '/assets/Run.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('player_jump', '/assets/Jump.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('player_attack', '/assets/Attack1.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('player_death', '/assets/Death.png', { frameWidth: 200, frameHeight: 200 });

    this.load.image('bg_1', '/assets/background/bg_1.png');
    this.load.image('bg_2', '/assets/background/bg_2.png');
    this.load.image('bg_3', '/assets/background/bg_3.png');
    this.load.image('bg_4', '/assets/background/bg_4.png');
    this.load.image('bg_5', '/assets/background/bg_5.png');

    this.load.audio('se_attack', '/assets/sounds/attack.mp3');
    this.load.audio('se_hit', '/assets/sounds/hit.mp3');
    this.load.audio('se_jump', '/assets/sounds/jump.mp3');

    // ★パーティクル用の「白い四角」をプログラムで生成
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 4, 4); // 4x4のドット
    graphics.generateTexture('pixel', 4, 4);
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.isPlayerAlive = true;
    this.hp = 100;
    this.score = 0;
    this.isInvincible = false;
    this.enemies = [];
    this.wave = 0;
    this.killCount = 0;

    const { width, height } = this.scale;
    
    this.dialogBox = document.getElementById('dialog-box')!;
    this.dialogName = document.getElementById('dialog-name')!;
    this.dialogText = document.getElementById('dialog-text')!;
    this.dialogBox.onclick = () => { this.nextLine(); };

    this.bg1 = this.add.tileSprite(0, 0, width, height, 'bg_1').setOrigin(0, 0).setScrollFactor(0).setScale(4); 
    this.bg2 = this.add.tileSprite(0, 0, width, height, 'bg_2').setOrigin(0, 0).setScrollFactor(0.1).setScale(4); 
    this.bg3 = this.add.tileSprite(0, 0, width, height, 'bg_3').setOrigin(0, 0).setScrollFactor(0.3).setScale(4);
    this.bg4 = this.add.tileSprite(0, 0, width, height, 'bg_4').setOrigin(0, 0).setScrollFactor(0.5).setScale(4);
    this.bg5 = this.add.tileSprite(0, 0, width, height, 'bg_5').setOrigin(0, 0).setScrollFactor(0.8).setScale(4);
    
    if (!this.anims.exists('idle')) {
      this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('player_idle', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('player_run', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'jump', frames: this.anims.generateFrameNumbers('player_jump', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'attack', frames: this.anims.generateFrameNumbers('player_attack', { start: 0, end: 5 }), frameRate: 15, repeat: 0 });
      this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('player_death', { start: 0, end: 5 }), frameRate: 10, repeat: 0 });
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.add(this.add.rectangle(1000, 700, 3000, 50, 0x0a150a)); 
    this.platforms.add(this.add.rectangle(900, 500, 300, 30, 0x1a2e20));
    this.platforms.add(this.add.rectangle(200, 400, 300, 30, 0x1a2e20));
    this.platforms.add(this.add.rectangle(1600, 350, 400, 30, 0x1a2e20));
    this.platforms.add(this.add.rectangle(2300, 500, 300, 30, 0x1a2e20));

    this.player = this.physics.add.sprite(100, 450, 'player_idle');
    this.player.setScale(2);
    this.player.body.setBounce(0.0);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(40, 60);
    this.player.body.setOffset(80, 60); 
    this.player.setDepth(1);
    this.physics.add.collider(this.player, this.platforms);

    this.player.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (anim.key === 'attack') {
        this.isAttacking = false;
        this.player.anims.play('idle', true);
        this.inputAttack = false; 
      }
    }, this);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, 3000, 720);
    this.physics.world.setBounds(0, 0, 3000, 720);

    const hitboxRect = this.add.rectangle(0, 0, 150, 150, 0xffff00, 0.5);
    this.attackHitbox = this.physics.add.existing(hitboxRect) as unknown as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    this.attackHitbox.setVisible(false);
    this.attackHitbox.body!.enable = false;
    this.attackHitbox.body!.setAllowGravity(false);

    this.spawnTimer = this.time.addEvent({
        delay: 2000, 
        callback: this.spawnLoop,
        callbackScope: this,
        loop: true,
        paused: true
    });

    this.hpBar = this.add.graphics();
    this.hpBar.setScrollFactor(0);
    this.hpBar.setDepth(100);
    this.drawPlayerHealthBar();

    this.add.text(20, 15, 'HP', { fontSize: '24px', fontFamily: '"Yu Mincho", serif', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(101);

    this.scoreText = this.add.text(width - 20, 20, 'Score: 0', {
        fontSize: '40px',
        fontFamily: '"Yu Mincho", serif',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.gameOverText = this.add.text(width / 2, height / 2, '死', {
      fontSize: '200px',
      fontFamily: '"Yu Mincho", serif',
      color: '#cc0000',
      stroke: '#000000',
      strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.gameClearText = this.add.text(width / 2, height / 2, '一章 完', {
      fontSize: '180px',
      fontFamily: '"Yu Mincho", serif',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.retryText = this.add.text(width / 2, height / 2 + 150, 'Click to Retry', {
      fontSize: '40px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.input.on('pointerdown', () => {
      if (!this.isPlayerAlive || this.wave === 4) { 
        this.scene.restart();
      }
    });

    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    this.createController();

    this.time.delayedCall(500, () => {
      this.startDialog([
        { name: '主人公', text: '……霧の森。門番がいると聞く。' },
        { name: '主人公', text: '雑魚を片付けて、親玉を引きずり出すか。' },
        { name: 'システム', text: '【目標】\n敵を5体倒せ！' },
      ]);
    });
  }

  // --- ★ジューシーさを出すためのヘルパー関数 ---

  // 1. 振動 (Haptic)
  triggerVibration(duration: number) {
      if (navigator.vibrate) {
          navigator.vibrate(duration);
      }
  }

  // 2. ヒットストップ (Hit Stop)
  triggerHitStop(duration: number) {
      // 物理演算とアニメーションを一時停止
      this.physics.world.pause();
      this.anims.pauseAll();
      
      this.time.delayedCall(duration, () => {
          if (this.scene.isActive()) {
              this.physics.world.resume();
              this.anims.resumeAll();
          }
      });
  }

  // 3. 血しぶきエフェクト (Particles)
  createBloodEffect(x: number, y: number) {
      const particles = this.add.particles(x, y, 'pixel', {
          speed: { min: 100, max: 300 },
          angle: { min: 200, max: 340 }, // 上方向に噴き出す
          scale: { start: 2, end: 0 },
          color: [0xcc0000, 0x990000],
          lifespan: 600,
          gravityY: 800,
          quantity: 15,
          emitting: false
      });
      particles.explode(15, x, y);
      // 自動で消すのは設定できないため、少し経ったらdestroy
      this.time.delayedCall(1000, () => particles.destroy());
  }

  // 4. パリィの火花 (Spark)
  createSparkEffect(x: number, y: number) {
      const particles = this.add.particles(x, y, 'pixel', {
          speed: 400,
          scale: { start: 3, end: 0 },
          color: [0xffffaa, 0xffaa00],
          lifespan: 300,
          blendMode: 'ADD',
          quantity: 10,
          emitting: false
      });
      particles.explode(20, x, y);
      this.time.delayedCall(500, () => particles.destroy());
  }

  // ------------------------------------------

  onDialogComplete() {
      if (this.wave === 0) {
          this.wave = 1;
          this.spawnTimer.paused = false; 
      } else if (this.wave === 2) {
          this.wave = 3;
          this.spawnBoss();
      }
  }

  spawnLoop() {
      if (!this.isPlayerAlive || this.isTalking) return;
      
      if (this.wave === 1) {
          const aliveCount = this.enemies.filter(e => !e.isDead).length;
          if (aliveCount < 3) {
              this.spawnEnemy();
          }
      }
  }

  spawnEnemy() {
      const dist = 600;
      const direction = Phaser.Math.Between(0, 1) ? 1 : -1;
      let x = this.player.x + (direction * dist);
      if (x < 100) x = 100;
      if (x > 2900) x = 2900;
      const y = 450;
      
      const enemy = new Enemy(this, x, y);
      this.enemies.push(enemy);
      this.setupEnemyCollision(enemy);
  }

  spawnBoss() {
      const x = this.player.x < 1500 ? 2800 : 200; 
      const y = 430; 
      const boss = new BossEnemy(this, x, y);
      this.enemies.push(boss);
      this.setupEnemyCollision(boss);
      
      this.cameras.main.shake(500, 0.01); 
      this.triggerVibration(200); // 登場振動
  }

  setupEnemyCollision(enemy: Enemy) {
      this.physics.add.collider(enemy, this.platforms);
      
      this.physics.add.overlap(this.attackHitbox, enemy, (_hitbox, hitEnemy) => {
        const e = hitEnemy as Enemy; 
        if (!e.isDead) {
          e.takeDamage();
          // メインシーン側でカメラシェイク管理
          this.cameras.main.shake(100, 0.01); 
        }
      }, undefined, this);

      this.physics.add.overlap(this.player, enemy.attackHitbox, () => {
        this.takeDamage(enemy);
      }, undefined, this);

      this.physics.add.collider(this.player, enemy);
  }

  addScore(points: number) {
      this.score += points;
      this.scoreText.setText(`Score: ${this.score}`);
      
      // スコアが弾むアニメーション（UI Bounce）
      this.tweens.add({
          targets: this.scoreText,
          scale: 1.5,
          duration: 100,
          yoyo: true
      });

      if (this.wave === 1) {
          this.killCount++;
          if (this.killCount >= 5) {
              this.wave = 2;
              this.spawnTimer.paused = true; 
              this.enemies.forEach(e => {
                  if (!e.isDead) {
                      e.destroy();
                  }
              });
              
              this.time.delayedCall(1000, () => {
                  this.startDialog([
                      { name: '？？？', text: '小賢しい鼠め……！' },
                      { name: '門番', text: '我が剣の錆にしてくれるわ！！' },
                  ]);
              });
          }
      }
  }

  onBossDefeated() {
      this.wave = 4; 
      this.time.delayedCall(2000, () => {
          this.startDialog([
              { name: '門番', text: 'ぐ、ぐおぉぉ……ッ！' },
              { name: '主人公', text: '……道は開かれた。' },
          ]);
          
          this.time.delayedCall(3000, () => {
              if (!this.isTalking) this.gameClear();
          });
      });
  }

  drawPlayerHealthBar() {
    this.hpBar.clear();
    const x = 60;
    const y = 20;
    const width = 300;
    const height = 20;
    this.hpBar.fillStyle(0x000000); 
    this.hpBar.fillRect(x - 2, y - 2, width + 4, height + 4);
    this.hpBar.fillStyle(0xcc0000); 
    this.hpBar.fillRect(x, y, width, height);
    if (this.hp > 0) {
        const hpPercent = this.hp / this.maxHp;
        this.hpBar.fillStyle(0x00ff00);
        this.hpBar.fillRect(x, y, width * hpPercent, height);
    }
  }

  takeDamage(enemy: Enemy) {
    if (this.isInvincible || !this.isPlayerAlive || this.wave === 4) return;

    if (this.isBlocking) {
        const currentTime = this.time.now;
        const blockDuration = currentTime - this.blockStartTime;

        if (blockDuration < 200) {
            this.showParryEffect(this.player.x, this.player.y);
            this.createSparkEffect(this.player.x + 50, this.player.y); // ★火花追加
            this.sound.play('se_hit', { volume: 2.0, rate: 2.0 }); 
            this.addScore(500);
            
            // ★パリィ成功時：強めの振動とヒットストップ
            this.triggerVibration(50);
            this.triggerHitStop(100);
            this.cameras.main.flash(100, 255, 255, 200); // 白い閃光

            enemy.getStunned();
            return;
        } else {
            this.sound.play('se_hit', { volume: 1.0, rate: 0.5 });
            this.triggerVibration(20); // ガード時：軽い振動
            const direction = this.player.x < enemy.x ? -1 : 1;
            this.player.setVelocityX(200 * direction);
            return;
        }
    }

    this.hp -= 20; 
    this.drawPlayerHealthBar();
    this.sound.play('se_hit', { volume: 1.0 });
    
    // ★被弾時：血しぶき、赤フラッシュ、振動
    this.createBloodEffect(this.player.x, this.player.y);
    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(200, 255, 0, 0); // 赤フラッシュ
    this.triggerVibration(100);
    this.triggerHitStop(100);

    if (this.hp <= 0) {
      this.gameOver();
      return;
    }

    this.isInvincible = true;
    this.player.setTint(0xff0000);
    const direction = this.player.x < enemy.x ? -1 : 1;
    this.player.setVelocityX(400 * direction);
    this.player.setVelocityY(-400);

    this.time.delayedCall(1000, () => {
      if (this.isPlayerAlive) {
        this.isInvincible = false;
        this.player.clearTint();
      }
    });
  }

  showParryEffect(x: number, y: number) {
      const spark = this.add.circle(x, y, 50, 0xffffaa, 1);
      this.tweens.add({
          targets: spark,
          scale: 3,
          alpha: 0,
          duration: 200,
          onComplete: () => spark.destroy()
      });
      const text = this.add.text(x, y - 50, '弾き！', { 
          fontSize: '40px', 
          color: '#ffff00', 
          fontFamily: '"Yu Mincho", serif',
          stroke: '#000000', 
          strokeThickness: 4 
      }).setOrigin(0.5);
      this.tweens.add({
          targets: text,
          y: y - 100,
          alpha: 0,
          duration: 500,
          onComplete: () => text.destroy()
      });
  }

  gameOver() {
    this.isPlayerAlive = false;
    this.isInvincible = false;
    this.player.setVelocity(0, 0);
    this.player.body.checkCollision.none = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.player.anims.play('death', true);
    this.physics.pause();
    this.gameOverText.setVisible(true);
    this.gameOverText.setScale(2);
    this.retryText.setText(`Score: ${this.score}\nClick to Retry`);
    this.tweens.add({ targets: this.gameOverText, scale: 1, duration: 500, ease: 'Bounce.easeOut', onComplete: () => { this.retryText.setVisible(true); } });
  }

  gameClear() {
    if (!this.isPlayerAlive) return;
    this.physics.pause();
    this.gameClearText.setVisible(true);
    this.gameClearText.setScale(2);
    this.retryText.setText(`Score: ${this.score}\nClick to Title`);
    this.tweens.add({ targets: this.gameClearText, scale: 1, duration: 500, ease: 'Back.easeOut', onComplete: () => { this.retryText.setVisible(true); } });
  }

  startDialog(lines: DialogLine[]) {
    this.isTalking = true;
    this.physics.pause(); 
    this.player.anims.play('idle', true);
    this.currentDialog = lines;
    this.currentLineIndex = 0;
    this.dialogBox.classList.remove('hidden');
    this.showLine();
  }

  showLine() {
    const line = this.currentDialog[this.currentLineIndex];
    this.dialogName.innerText = line.name;
    this.dialogText.innerText = line.text;
  }

  nextLine() {
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentDialog.length) {
      this.dialogBox.classList.add('hidden');
      this.isTalking = false;
      this.physics.resume();
      this.onDialogComplete();
    } else {
      this.showLine();
    }
  }

  createController() {
    this.input.addPointer(3); 
    const btnRadius = 40;
    
    // ボタン作成ヘルパー
    const createBtn = (x: number, y: number, color: number, text: string, callback: (isDown: boolean) => void) => {
        const btn = this.add.circle(x, y, btnRadius, color, 0.5)
            .setScrollFactor(0).setInteractive().setDepth(100)
            .on('pointerdown', () => { 
                callback(true);
                // ★ボタンタップ時の振動
                this.triggerVibration(10);
                btn.setAlpha(0.8);
                btn.setScale(0.9);
            })
            .on('pointerup', () => { 
                callback(false);
                btn.setAlpha(0.5);
                btn.setScale(1.0);
            })
            .on('pointerout', () => {
                callback(false);
                btn.setAlpha(0.5);
                btn.setScale(1.0);
            });
        this.add.text(x, y, text, { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
        return btn;
    };

    createBtn(100, 600, 0x888888, '←', (isDown) => { this.inputLeft = isDown; });
    createBtn(220, 600, 0x888888, '→', (isDown) => { this.inputRight = isDown; });
    createBtn(1050, 600, 0xff0000, '斬', (isDown) => { this.inputAttack = isDown; });
    createBtn(1180, 550, 0x0000ff, '跳', (isDown) => { this.inputUp = isDown; });
    createBtn(1050, 500, 0xaaaa00, '防', (isDown) => { this.inputDown = isDown; });
  }

  update() {
    if (this.isTalking || !this.isPlayerAlive) return;

    this.bg1.tilePositionX = this.cameras.main.scrollX * 0.0;
    this.bg2.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bg3.tilePositionX = this.cameras.main.scrollX * 0.3;
    this.bg4.tilePositionX = this.cameras.main.scrollX * 0.5;
    this.bg5.tilePositionX = this.cameras.main.scrollX * 0.8;

    this.enemies.forEach(enemy => {
      if (enemy.active) enemy.update(this.player);
    });

    if (!this.cursors || !this.spaceKey) return;

    const left = this.cursors.left.isDown || this.inputLeft;
    const right = this.cursors.right.isDown || this.inputRight;
    const up = this.cursors.up.isDown || this.inputUp;
    const down = this.cursors.down.isDown || this.inputDown; 
    const attack = (Phaser.Input.Keyboard.JustDown(this.spaceKey) || (this.inputAttack && !this.isAttacking));

    if (down && !this.isAttacking) {
        if (!this.isBlocking) {
            this.isBlocking = true;
            this.blockStartTime = this.time.now;
            this.player.setTint(0xaaaaaa); 
        }
        this.player.setVelocityX(0); 
        return; 
    } else {
        if (this.isBlocking) {
            this.isBlocking = false;
            this.player.clearTint();
        }
    }

    if (attack && !this.isAttacking && !this.isInvincible) {
      this.isAttacking = true;
      this.sound.play('se_attack', { volume: 1.5 });
      this.player.setVelocityX(0);
      this.player.anims.play('attack', true);

      this.time.delayedCall(300, () => {
          if (!this.isAttacking) return; 
          const offsetX = this.player.flipX ? -120 : 120;
          this.attackHitbox.setPosition(this.player.x + offsetX, this.player.y);
          this.attackHitbox.body!.enable = true;
          this.time.delayedCall(100, () => {
            this.attackHitbox.body!.enable = false;
            this.attackHitbox.setVisible(false);
          });
      });
      this.inputAttack = false; 
    }

    if (this.isAttacking) {
      if (this.player.anims.currentAnim && this.player.anims.currentAnim.key !== 'attack') {
         this.isAttacking = false;
      } else {
         return;
      }
    }

    const isGrounded = this.player.body.touching.down;

    if (left) { 
      this.player.setVelocityX(-250);
      this.player.setFlipX(true);
      if (isGrounded) this.player.anims.play('run', true);
    } 
    else if (right) { 
      this.player.setVelocityX(250);
      this.player.setFlipX(false);
      if (isGrounded) this.player.anims.play('run', true);
    } 
    else {
      this.player.setVelocityX(0);
      if (isGrounded) this.player.anims.play('idle', true);
    }

    if (up && isGrounded) { 
      this.player.setVelocityY(-600);
      this.sound.play('se_jump', { volume: 1.0 });
    }

    if (!isGrounded) {
      if (this.player.anims.currentAnim?.key !== 'death') {
         this.player.anims.play('jump', true);
      }
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'app',
  backgroundColor: '#050a05',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false 
    }
  },
  scene: [TitleScene, MainScene]
};

new Phaser.Game(config);