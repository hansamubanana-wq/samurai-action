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

    this.add.text(width / 2, height / 2 - 50, '霧隠の侍', {
      fontSize: '120px',
      fontFamily: '"Yu Mincho", serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { blur: 10, color: '#000000', fill: true }
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
      this.sound.play('se_attack'); 
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('MainScene');
      });
    });
  }

  update() {
    this.bg2.tilePositionX += 0.2;
    this.bg3.tilePositionX += 0.4;
    this.bg4.tilePositionX += 0.6;
    this.bg5.tilePositionX += 1.0;
  }
}


// --- 敵クラス ---
class Enemy extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number = 100;
  private detectRange: number = 500;
  private attackRange: number = 150;
  
  public attackHitbox: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private isAttacking: boolean = false;
  private nextAttackTime: number = 0;
  public isDead: boolean = false;
  public isStunned: boolean = false; // ★弾かれた時のよろけフラグ
  private healthBar: Phaser.GameObjects.Graphics;
  public isHit: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setScale(2);
    this.setTint(0xff5555);
    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.body.setSize(40, 60);
    this.body.setOffset(80, 60); 
    this.setDepth(1);
    this.play('idle');

    const hitboxRect = scene.add.rectangle(0, 0, 150, 150, 0xff0000, 0);
    this.attackHitbox = scene.physics.add.existing(hitboxRect) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    this.attackHitbox.setVisible(false);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.body.setAllowGravity(false);

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

    const hpPercent = this.hp / this.maxHp;
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
    this.scene.sound.play('se_attack'); 

    const offsetX = this.flipX ? -120 : 120;
    this.attackHitbox.setPosition(this.x + offsetX, this.y);

    this.scene.time.delayedCall(300, () => {
      if (this.isAttacking && this.active && !this.isDead && !this.isStunned) {
        this.attackHitbox.body.enable = true;
        this.scene.time.delayedCall(100, () => {
          if (this.attackHitbox.active) {
            this.attackHitbox.body.enable = false;
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

    if (this.hp <= 0) {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.body.checkCollision.none = true; 
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.attackHitbox.body.enable = false; 
        this.scene.sound.play('se_hit', { volume: 0.8 });
        this.play('death', true); 
    } else {
        this.scene.sound.play('se_hit', { volume: 0.8 });
        this.setTint(0xffaaaa);
        this.scene.time.delayedCall(100, () => this.setTint(0xff5555));
        const backDir = this.flipX ? 1 : -1;
        this.setVelocityX(100 * backDir);
        this.scene.time.delayedCall(500, () => { if (this.active) this.isHit = false; });
    }
  }

  // ★弾かれた時の処理
  getStunned() {
    if (this.isDead || this.isStunned) return;
    
    this.isStunned = true;
    this.isAttacking = false; // 攻撃中断
    this.attackHitbox.body.enable = false; // 判定消去
    
    // よろけ演出（後ろに下がる）
    const backDir = this.flipX ? 1 : -1;
    this.setVelocityX(200 * backDir);
    this.setVelocityY(-200);
    this.setTint(0xffff00); // 黄色く光る（体幹崩し）

    // 1.5秒後に復帰
    this.scene.time.delayedCall(1500, () => {
      if (this.active && !this.isDead) {
        this.isStunned = false;
        this.setTint(0xff5555); // 色戻す
      }
    });
  }
}

// --- メインシーン ---
class MainScene extends Phaser.Scene {
  public isPlayerAlive: boolean = true;
  private isGameClear: boolean = false;

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
  
  // ★防御関連
  private isBlocking: boolean = false; // 防御中か
  private blockStartTime: number = 0;  // 防御開始時刻

  private hp: number = 100;
  private maxHp: number = 100;
  private hpBar!: Phaser.GameObjects.Graphics;
  
  private gameOverText!: Phaser.GameObjects.Text;
  private gameClearText!: Phaser.GameObjects.Text;
  private retryText!: Phaser.GameObjects.Text;

  private inputLeft: boolean = false;
  private inputRight: boolean = false;
  private inputUp: boolean = false;
  private inputDown: boolean = false; // ★下入力追加
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
    // パリィ音（今回はse_hitを高音再生で代用）
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.isPlayerAlive = true;
    this.isGameClear = false;
    this.hp = 100;
    this.isInvincible = false;
    this.enemies = [];

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
    this.attackHitbox = this.physics.add.existing(hitboxRect) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    this.attackHitbox.setVisible(false);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.body.setAllowGravity(false);

    const enemyPositions = [
        { x: 800, y: 450 },
        { x: 1200, y: 450 },
        { x: 1600, y: 300 }, 
        { x: 2000, y: 450 },
        { x: 2600, y: 450 }
    ];

    enemyPositions.forEach(pos => {
        this.enemies.push(new Enemy(this, pos.x, pos.y));
    });

    this.enemies.forEach(enemy => {
      this.physics.add.collider(enemy, this.platforms);
      
      this.physics.add.overlap(this.attackHitbox, enemy, (hitbox, hitEnemy) => {
        const e = hitEnemy as Enemy; 
        if (!e.isDead) {
          e.takeDamage();
          this.cameras.main.shake(100, 0.01); 
        }
      }, undefined, this);

      this.physics.add.overlap(this.player, enemy.attackHitbox, () => {
        this.takeDamage(enemy);
      }, undefined, this);

      this.physics.add.collider(this.player, enemy);
    });

    // UI
    this.hpBar = this.add.graphics();
    this.hpBar.setScrollFactor(0);
    this.hpBar.setDepth(100);
    this.drawPlayerHealthBar();

    this.add.text(20, 15, 'HP', { fontSize: '24px', fontFamily: '"Yu Mincho", serif', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(101);

    this.gameOverText = this.add.text(width / 2, height / 2, '死', {
      fontSize: '200px',
      fontFamily: '"Yu Mincho", serif',
      color: '#cc0000',
      stroke: '#000000',
      strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.gameClearText = this.add.text(width / 2, height / 2, '見事', {
      fontSize: '180px',
      fontFamily: '"Yu Mincho", serif',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.retryText = this.add.text(width / 2, height / 2 + 150, 'Click to Retry', {
      fontSize: '40px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.input.on('pointerdown', () => {
      if (!this.isPlayerAlive || this.isGameClear) {
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
        { name: '主人公', text: '……ここは、霧の森か。' },
        { name: '主人公', text: '気配を感じる。奴らが潜んでいるようだ。' },
        { name: 'システム', text: '【操作方法】\n← → ： 移動\nSpace ： 攻撃\n↑ ： ジャンプ\n↓ ： 防御（直前でパリィ）' },
        { name: '主人公', text: '……行くぞ。' },
      ]);
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
    if (this.isInvincible || !this.isPlayerAlive || this.isGameClear) return;

    // ★パリィ・ガード判定
    if (this.isBlocking) {
        const currentTime = this.time.now;
        const blockDuration = currentTime - this.blockStartTime;

        // ジャストガード（0.2秒以内）
        if (blockDuration < 200) {
            // パリィ成功！
            this.showParryEffect(this.player.x, this.player.y);
            // 音を高くしてキンッ！という感じにする
            this.sound.play('se_hit', { volume: 1.0, rate: 2.0 }); 
            
            // 敵をよろけさせる
            enemy.getStunned();
            
            // 画面を一瞬止める（ヒットストップ）
            this.cameras.main.shake(100, 0.02);
            return; // ダメージなしで終了
        } else {
            // 通常ガード（ダメージ無効だがノックバック）
            this.sound.play('se_hit', { volume: 0.5, rate: 0.5 }); // 鈍い音
            // ノックバックのみ受ける
            const direction = this.player.x < enemy.x ? -1 : 1;
            this.player.setVelocityX(200 * direction);
            return;
        }
    }

    // 通常ダメージ
    this.hp -= 20; 
    this.drawPlayerHealthBar();
    this.sound.play('se_hit', { volume: 0.5 });
    this.cameras.main.shake(200, 0.02);

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

  // ★パリィエフェクト
  showParryEffect(x: number, y: number) {
      const spark = this.add.circle(x, y, 50, 0xffffaa, 1);
      this.tweens.add({
          targets: spark,
          scale: 3,
          alpha: 0,
          duration: 200,
          onComplete: () => spark.destroy()
      });
      // 文字も出す
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
    this.tweens.add({ targets: this.gameOverText, scale: 1, duration: 500, ease: 'Bounce.easeOut', onComplete: () => { this.retryText.setVisible(true); } });
  }

  gameClear() {
    if (!this.isPlayerAlive) return;
    this.isGameClear = true;
    this.isInvincible = true;
    this.physics.pause();
    this.gameClearText.setVisible(true);
    this.gameClearText.setScale(2);
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
    } else {
      this.showLine();
    }
  }

  createController() {
    this.input.addPointer(3); 
    const btnRadius = 40;
    
    this.add.circle(100, 600, btnRadius, 0x888888, 0.5).setScrollFactor(0).setInteractive().setDepth(100)
      .on('pointerdown', () => { this.inputLeft = true; })
      .on('pointerup', () => { this.inputLeft = false; })
      .on('pointerout', () => { this.inputLeft = false; });
    this.add.text(100, 600, '←', { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.circle(220, 600, btnRadius, 0x888888, 0.5).setScrollFactor(0).setInteractive().setDepth(100)
      .on('pointerdown', () => { this.inputRight = true; })
      .on('pointerup', () => { this.inputRight = false; })
      .on('pointerout', () => { this.inputRight = false; });
    this.add.text(220, 600, '→', { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.circle(1050, 600, btnRadius, 0xff0000, 0.5).setScrollFactor(0).setInteractive().setDepth(100)
      .on('pointerdown', () => { this.inputAttack = true; });
    this.add.text(1050, 600, '斬', { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.circle(1180, 550, btnRadius, 0x0000ff, 0.5).setScrollFactor(0).setInteractive().setDepth(100)
      .on('pointerdown', () => { this.inputUp = true; })
      .on('pointerup', () => { this.inputUp = false; })
      .on('pointerout', () => { this.inputUp = false; });
    this.add.text(1180, 550, '跳', { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // ★防御ボタン（スマホ用）追加
    this.add.circle(1050, 500, btnRadius, 0xaaaa00, 0.5).setScrollFactor(0).setInteractive().setDepth(100)
      .on('pointerdown', () => { this.inputDown = true; })
      .on('pointerup', () => { this.inputDown = false; })
      .on('pointerout', () => { this.inputDown = false; });
    this.add.text(1050, 500, '防', { fontSize: '20px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
  }

  update() {
    if (this.isTalking || !this.isPlayerAlive || this.isGameClear) return;

    this.bg1.tilePositionX = this.cameras.main.scrollX * 0.0;
    this.bg2.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bg3.tilePositionX = this.cameras.main.scrollX * 0.3;
    this.bg4.tilePositionX = this.cameras.main.scrollX * 0.5;
    this.bg5.tilePositionX = this.cameras.main.scrollX * 0.8;

    this.enemies.forEach(enemy => {
      if (enemy.active) enemy.update(this.player);
    });

    const aliveEnemies = this.enemies.filter(e => !e.isDead);
    if (this.enemies.length > 0 && aliveEnemies.length === 0 && !this.isGameClear) {
        this.gameClear();
    }

    if (!this.cursors || !this.spaceKey) return;

    const left = this.cursors.left.isDown || this.inputLeft;
    const right = this.cursors.right.isDown || this.inputRight;
    const up = this.cursors.up.isDown || this.inputUp;
    const down = this.cursors.down.isDown || this.inputDown; // 下入力
    const attack = (Phaser.Input.Keyboard.JustDown(this.spaceKey) || (this.inputAttack && !this.isAttacking));

    // ★防御処理
    if (down && !this.isAttacking) {
        if (!this.isBlocking) {
            this.isBlocking = true;
            this.blockStartTime = this.time.now;
            this.player.setTint(0xaaaaaa); // 防御中は少し暗く
        }
        this.player.setVelocityX(0); // 防御中は動けない
        return; // 他の動作をキャンセル
    } else {
        if (this.isBlocking) {
            this.isBlocking = false;
            this.player.clearTint();
        }
    }

    if (attack && !this.isAttacking && !this.isInvincible) {
      this.isAttacking = true;
      this.sound.play('se_attack');
      this.player.setVelocityX(0);
      this.player.anims.play('attack', true);

      this.time.delayedCall(300, () => {
          if (!this.isAttacking) return; 
          const offsetX = this.player.flipX ? -120 : 120;
          this.attackHitbox.setPosition(this.player.x + offsetX, this.player.y);
          this.attackHitbox.body.enable = true;
          this.time.delayedCall(100, () => {
            this.attackHitbox.body.enable = false;
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
      this.sound.play('se_jump', { volume: 0.5 });
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