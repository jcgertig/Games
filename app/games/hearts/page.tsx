'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSubmitScore } from '@/lib/scores/hooks/useSubmitScore';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';

// ── Card asset helpers ────────────────────────────────────────────────────────

const RANK_TO_SVG: Record<string, string> = {
  A: '1', '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'jack', Q: 'queen', K: 'king',
};
const SUIT_TO_SVG: Record<string, string> = {
  C: 'clubs', D: 'diams', H: 'hearts', S: 'spades',
};

function cardToSvgId(card: string): string {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return `${RANK_TO_SVG[rank]}_of_${SUIT_TO_SVG[suit]}`;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const W = 1024;
const H = 640;
const CARD_W = 72;
const CARD_H = 104;
const CARD_OVERLAP = 26;   // fan overlap for hand display
const BOT_OVERLAP  = 18;

// Player positions (centre of card zone)
const PLAYER_POS = [
  { x: W / 2,       y: H - 80 },   // 0 = human (bottom)
  { x: 100,         y: H / 2 },    // 1 = left
  { x: W / 2,       y: 80 },       // 2 = top
  { x: W - 100,     y: H / 2 },    // 3 = right
];

// Centre table positions for played cards
const TRICK_POS = [
  { x: W / 2,       y: H / 2 + 110 },  // human
  { x: W / 2 - 120, y: H / 2 },        // left bot
  { x: W / 2,       y: H / 2 - 110 },  // top bot
  { x: W / 2 + 120, y: H / 2 },        // right bot
];

const FELT_COLOR = 0x1a5c2a;
const FELT_DARK  = 0x134520;

// ── Phaser scene: Boot ────────────────────────────────────────────────────────

function makeBootScene(
  onGameEnd: React.MutableRefObject<(won: boolean, points: number) => void>,
  setOverlay: (o: OverlayState) => void,
) {
  class BootScene extends (window as any).Phaser.Scene {
    constructor() { super({ key: 'Boot' }); }
    create() {
      this.registry.set('onGameEnd', (won: boolean, points: number) => onGameEnd.current(won, points));
      this.registry.set('setOverlay', setOverlay);
      this.scene.start('Preload');
    }
  }
  return BootScene;
}

// ── Phaser scene: Preload ─────────────────────────────────────────────────────

function makePreloadScene() {
  class PreloadScene extends (window as any).Phaser.Scene {
    constructor() { super({ key: 'Preload' }); }

    preload() {
      // Show progress bar
      const bar = this.add.graphics();
      const bg  = this.add.graphics();
      bg.fillStyle(0x222222).fillRect(W/2 - 200, H/2 - 20, 400, 40);

      this.load.on('progress', (v: number) => {
        bar.clear();
        bar.fillStyle(0x4ade80).fillRect(W/2 - 198, H/2 - 18, 396 * v, 36);
      });

      this.add.text(W/2, H/2 - 50, 'Loading cards…', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      // Load SVG sprite sheet as plain text so we can parse it
      this.load.text('cards-svg', '/cards/svg-cards.svg');
      this.load.image('table-bg', '/cards/engin-akyurt-HEMIBJ8QQuA-unsplash.jpg');
    }

    async create() {
      const svgText: string = this.cache.text.get('cards-svg');
      await this.buildCardTextures(svgText);
      this.scene.start('Menu');
    }

    private async buildCardTextures(svgText: string): Promise<void> {
      const parser     = new DOMParser();
      const serializer = new XMLSerializer();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');

      // Embed ALL defs so gradients, patterns, and clip-paths resolve correctly
      const defs    = doc.querySelector('defs');
      const defsStr = defs ? serializer.serializeToString(defs) : '<defs/>';

      const allCards = [
        'back',
        ...['C','D','H','S'].flatMap(suit =>
          ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
            .map(rank => `${rank}${suit}`)
        ),
      ];

      await Promise.all(allCards.map(card => new Promise<void>((resolve) => {
        const id = card === 'back' ? 'back' : cardToSvgId(card);
        // Grab the actual <g> element from the parsed document.
        // Using <use href="#…"> in a *new* document won't work because the
        // referenced ID lives in a different document.
        const el = doc.getElementById(id);

        if (!el) {
          this.makeFallbackTexture(card);
          resolve();
          return;
        }

        const elStr = serializer.serializeToString(el);
        // Wrap in a fresh SVG with the same viewBox; embed the defs so all
        // internal gradient/pattern references continue to resolve.
        const svgBlob = [
          '<svg xmlns="http://www.w3.org/2000/svg"',
          '     xmlns:xlink="http://www.w3.org/1999/xlink"',
          '     viewBox="0 0 169.075 244.64"',
          `     width="${CARD_W}" height="${CARD_H}">`,
          defsStr,
          elStr,
          '</svg>',
        ].join('\n');

        const blob = new Blob([svgBlob], { type: 'image/svg+xml;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const img  = new Image(CARD_W, CARD_H);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width  = CARD_W;
          canvas.height = CARD_H;
          canvas.getContext('2d')!.drawImage(img, 0, 0, CARD_W, CARD_H);
          this.textures.addCanvas(card, canvas);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          this.makeFallbackTexture(card);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      })));
    }

    /** Plain-canvas fallback for cards whose SVG element couldn't be found/loaded */
    private makeFallbackTexture(card: string) {
      const canvas = document.createElement('canvas');
      canvas.width  = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext('2d')!;

      // White card face with rounded corners
      ctx.fillStyle   = '#ffffff';
      ctx.strokeStyle = '#555555';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, CARD_W - 2, CARD_H - 2, 6);
      ctx.fill();
      ctx.stroke();

      if (card === 'back') {
        ctx.fillStyle = '#1a3a8e';
        ctx.fillRect(5, 5, CARD_W - 10, CARD_H - 10);
        ctx.fillStyle = '#ffd700';
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.fillText('♠', CARD_W / 2, CARD_H / 2 + 8);
      } else {
        const suit = card.slice(-1);
        const rank = card.slice(0, -1);
        const sym  = ({ H: '♥', D: '♦', C: '♣', S: '♠' } as any)[suit];
        const col  = suit === 'H' || suit === 'D' ? '#cc0000' : '#111111';
        ctx.fillStyle  = col;
        ctx.font       = 'bold 14px sans-serif';
        ctx.textAlign  = 'left';
        ctx.fillText(rank, 4, 16);
        ctx.fillText(sym,  4, 30);
        ctx.font       = 'bold 30px serif';
        ctx.textAlign  = 'center';
        ctx.fillText(sym, CARD_W / 2, CARD_H / 2 + 10);
      }

      this.textures.addCanvas(card, canvas);
    }
  }
  return PreloadScene;
}

// ── Phaser scene: Menu ────────────────────────────────────────────────────────

function makeMenuScene() {
  class MenuScene extends (window as any).Phaser.Scene {
    constructor() { super({ key: 'Menu' }); }

    create() {
      const Phaser = (window as any).Phaser;
      // Felt background
      this.add.rectangle(W/2, H/2, W, H, FELT_COLOR);

      // Card fan decoration
      const fanCards = ['AH', 'KS', 'QH', 'JD', '10C', '9H', '8S'];
      fanCards.forEach((card, i) => {
        const angle = -30 + i * 10;
        const img = this.add.image(W/2 - 160 + i * 18, H/2 + 60, card)
          .setOrigin(0.5, 1)
          .setAngle(angle)
          .setAlpha(0.85);
        // Subtle entrance animation
        img.setScale(0);
        this.tweens.add({
          targets: img, scale: 1, duration: 400,
          delay: i * 60, ease: 'Back.easeOut',
        });
      });

      // Title
      const title = this.add.text(W/2, 160, '♥ Hearts', {
        fontSize: '64px', color: '#f87171',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#7f1d1d', strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: title, alpha: 1, y: 150, duration: 600, ease: 'Power2' });

      const sub = this.add.text(W/2, 220, 'Play against 3 bots', {
        fontSize: '20px', color: '#d1fae5', fontFamily: 'sans-serif',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: sub, alpha: 1, duration: 600, delay: 200 });

      // ── Buttons ────────────────────────────────────────────────────────────
      const mkBtn = (x: number, y: number, w: number, label: string, color: number) => {
        const bg = this.add.rectangle(x, y, w, 50, color, 1)
          .setInteractive({ cursor: 'pointer' })
          .setStrokeStyle(2, 0x4ade80)
          .setAlpha(0);
        const txt = this.add.text(x, y, label, {
          fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 400, delay: 400 });
        return { bg, txt };
      };

      // "Play vs Bots" button
      const solo = mkBtn(W/2 - 112, 310, 200, 'Play vs Bots', 0x16a34a);
      solo.bg.on('pointerover',  () => solo.bg.setFillStyle(0x22c55e));
      solo.bg.on('pointerout',   () => solo.bg.setFillStyle(0x16a34a));
      solo.bg.on('pointerdown',  () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('Game'));
      });

      // "Play Online" button
      const online = mkBtn(W/2 + 112, 310, 200, '🌐 Play Online', 0x1d4ed8);
      online.bg.on('pointerover',  () => online.bg.setFillStyle(0x2563eb));
      online.bg.on('pointerout',   () => online.bg.setFillStyle(0x1d4ed8));
      online.bg.on('pointerdown',  () => { window.location.href = '/games/hearts/lobby'; });

      // Rules summary
      const rules = [
        'Avoid taking ♥ cards (1 pt each) and Q♠ (13 pts)',
        'Shoot the moon — take ALL points to give others +26',
        'Lowest score wins when any player reaches 100',
      ];
      rules.forEach((line, i) => {
        this.add.text(W/2, 400 + i * 28, line, {
          fontSize: '14px', color: '#a7f3d0', fontFamily: 'sans-serif',
        }).setOrigin(0.5).setAlpha(0.8);
      });

      this.cameras.main.fadeIn(400);
    }
  }
  return MenuScene;
}

// ── Phaser scene: Game ────────────────────────────────────────────────────────

function makeGameScene() {
  class GameScene extends (window as any).Phaser.Scene {
    // Engine modules (lazy-loaded to avoid SSR issues)
    private engine: any = null;
    private bot: any = null;

    // @card-games/engine Game instance — one per hand, recreated on each deal.
    // Used for: card dealing, hand state, follow-suit validation via
    // checkAllowedPlay(), and pass application via applyPasses().
    private game!: any;

    // Game state (tracked manually — the engine handles dealing/validation
    // but not Hearts-specific scoring/phasing)
    private playerNames = ['You', 'West', 'North', 'East'];
    private gamePoints  = [0, 0, 0, 0];
    private handPoints  = [0, 0, 0, 0];
    private heartsBroken = false;
    private trickCards: { card: string; playerIdx: number }[] = [];
    private trickLedSuit: string | null = null;
    private tricksInHand = 0;
    private handNumber   = 0;
    private gamePhase: 'passing' | 'playing' | 'trick_end' | 'hand_end' | 'game_over' = 'playing';
    private curPlayerIdx = 0;
    private winnerIdx: number | null = null;

    // Phaser display objects
    private cardObjects: { [key: string]: any } = {};
    private trickGroup!: any;
    private scoreTexts: any[] = [];
    private passIndicator: any = null;
    private statusText!: any;
    private selectedPassCards: Set<string> = new Set();
    private modalGroup: any[] = [];

    constructor() { super({ key: 'Game' }); }

    async create() {
      const [engineMod, botMod] = await Promise.all([
        import('./engine'),
        import('./bot'),
      ]);
      this.engine = engineMod;
      this.bot    = botMod;

      this.cameras.main.fadeIn(400);
      this.drawTable();
      this.startNewGame();
    }

    // ── Table background ────────────────────────────────────────────────────

    private drawTable() {
      // Photo background
      this.add.image(W/2, H/2, 'table-bg').setDisplaySize(W, H);
      // Dark vignette overlay for depth
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.45);
      g.fillEllipse(W/2, H/2, 580, 400);

      // Score readouts per player
      ['','','',''].forEach((_, i) => {
        const pos = PLAYER_POS[i];
        const offset = [
          { x: 0,    y: -70 },
          { x: 55,   y: 0   },
          { x: 0,    y: 70  },
          { x: -55,  y: 0   },
        ][i];
        const st = this.add.text(pos.x + offset.x, pos.y + offset.y, '0 pts', {
          fontSize: '13px', color: '#fde68a', fontFamily: 'sans-serif',
        }).setOrigin(0.5);
        this.scoreTexts.push(st);
      });

      // Status bar
      this.statusText = this.add.text(W/2, H/2, '', {
        fontSize: '18px', color: '#ffffff', fontFamily: 'sans-serif',
        backgroundColor: '#00000088', padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(10).setVisible(false);

      // Trick area outline
      const trickOutline = this.add.graphics();
      trickOutline.lineStyle(1, 0x4ade80, 0.2);
      trickOutline.strokeEllipse(W/2, H/2, 340, 240);

      this.trickGroup = this.add.group();
    }

    // ── Engine helpers ──────────────────────────────────────────────────────

    /** Create and start a fresh @card-games/engine Game for one hand. */
    private createHandGame(): any {
      const { Game, games } = this.engine;
      const g = new Game({ config: games.hearts, playerIds: ['0', '1', '2', '3'] });
      g.start(); // deals cards, sets firstPlayerIdx to 2C holder
      return g;
    }

    /** Read a player's current hand from the engine's JSON state. */
    private getHand(playerIdx: number): string[] {
      const state = this.game.asJSON();
      return [...state.rounds[state.currentRoundIdx].players[playerIdx].hand];
    }

    /**
     * Determine which cards the current human player may legally play.
     *
     * Leading rules are implemented manually (Hearts-specific):
     *   - First trick: must lead 2♣
     *   - Subsequent leads: cannot lead ♥ until hearts are broken
     *
     * Follow-suit validation delegates to the engine's checkAllowedPlay(),
     * which uses the "recent played" logic to check whether the current
     * player must follow the led suit.
     */
    private getLegalPlays(): string[] {
      const hand = this.getHand(this.curPlayerIdx);

      if (this.trickCards.length === 0) {
        // ── Leading ──────────────────────────────────────────────────────
        if (this.tricksInHand === 0) {
          // Very first trick: 2♣ must be led
          return hand.includes('2C') ? ['2C'] : hand;
        }
        if (!this.heartsBroken) {
          const nonHearts = hand.filter(c => this.engine.parseCard(c).suit !== 'H');
          return nonHearts.length > 0 ? nonHearts : hand; // all-hearts hand: anything goes
        }
        return hand;
      }

      // ── Following suit ─────────────────────────────────────────────────
      // The engine's checkAllowedPlay() uses `recent(firstPlayer.played)` to
      // identify the led suit and enforces follow-suit correctly here.
      return hand.filter(card => {
        try { return this.game.checkAllowedPlay([card], 'table'); }
        catch { return false; }
      });
    }

    // ── Game lifecycle ──────────────────────────────────────────────────────

    private startNewGame() {
      this.gamePoints = [0, 0, 0, 0];
      this.handNumber = 0;
      this.winnerIdx  = null;
      this.selectedPassCards.clear();
      this.startNewHand();
    }

    private startNewHand() {
      // Fresh engine Game instance → shuffles deck, deals 13 cards each,
      // sets currentPlayerIdx to the holder of 2♣.
      this.game = this.createHandGame();

      // Reset hand-level tracking
      this.handPoints   = [0, 0, 0, 0];
      this.heartsBroken = false;
      this.trickCards   = [];
      this.trickLedSuit = null;
      this.tricksInHand = 0;
      this.selectedPassCards.clear();

      const dir = this.engine.passDirectionForHand(this.handNumber);
      if (dir !== 'none') {
        this.gamePhase = 'passing';
      } else {
        this.gamePhase    = 'playing';
        this.curPlayerIdx = this.game.currentPlayerIdx;
      }

      this.dealAnimation(() => {
        this.updateScoreDisplay();
        if (this.gamePhase === 'passing') {
          this.showPassPhase();
        } else {
          this.advanceTurn();
        }
      });
    }

    // ── Card rendering ──────────────────────────────────────────────────────

    private getCardTexture(card: string, faceUp: boolean): string {
      return faceUp ? card : 'back';
    }

    private destroyCardObjects() {
      Object.values(this.cardObjects).forEach(obj => obj.destroy());
      this.cardObjects = {};
      this.trickGroup.clear(true, true);
    }

    /** Lay out a player's hand (horizontal for top/bottom, vertical for sides). */
    private layoutHand(playerIdx: number, animate = false, onComplete?: () => void) {
      const raw      = this.getHand(playerIdx);
      // For the human player sort by suit group (C → D → S → H) then rank low→high.
      // Bots show card backs so order doesn't matter visually.
      const SUIT_ORDER: Record<string, number> = { C: 0, D: 1, S: 2, H: 3 };
      const hand = playerIdx === 0
        ? [...raw].sort((a, b) => {
            const sa = SUIT_ORDER[this.engine.parseCard(a).suit] ?? 0;
            const sb = SUIT_ORDER[this.engine.parseCard(b).suit] ?? 0;
            if (sa !== sb) return sa - sb;
            return this.engine.cardStrength(a) - this.engine.cardStrength(b);
          })
        : raw;
      const faceUp   = playerIdx === 0;
      const isVertical = playerIdx === 1 || playerIdx === 3;
      const pos      = PLAYER_POS[playerIdx];
      const count    = hand.length;
      const overlap  = playerIdx === 0 ? CARD_OVERLAP : BOT_OVERLAP;
      const span     = (count - 1) * overlap;

      hand.forEach((card: string, idx: number) => {
        const key    = `hand_${playerIdx}_${card}`;
        const offset = -span / 2 + idx * overlap;

        let tx: number, ty: number, angle = 0;
        if (isVertical) {
          tx = pos.x; ty = pos.y + offset; angle = 90;
        } else {
          tx = pos.x + offset; ty = pos.y;
        }

        if (!this.cardObjects[key]) {
          const img = this.add.image(tx, ty, this.getCardTexture(card, faceUp))
            .setDisplaySize(CARD_W, CARD_H)
            .setAngle(angle)
            .setDepth(idx + 1);
          this.cardObjects[key] = img;
          if (animate) img.setPosition(W/2, H/2).setAlpha(0);
        }

        const img = this.cardObjects[key];

        if (playerIdx === 0 && !img.input) {
          img.setInteractive({ cursor: 'pointer' });
          img.on('pointerover', () => {
            if (this.gamePhase === 'playing' && this.curPlayerIdx === 0) {
              img.setY(ty - 14);
            } else if (this.gamePhase === 'passing') {
              img.setY(ty - 10);
            }
          });
          img.on('pointerout', () => {
            if (!this.selectedPassCards.has(card)) img.setY(ty);
          });
          img.on('pointerdown', () => this.onCardClick(card, img, ty));
        }

        if (animate) {
          this.tweens.add({
            targets: img, x: tx, y: ty, alpha: 1,
            duration: 350,
            delay: (playerIdx * 13 + idx) * 45,
            ease: 'Quad.easeOut',
            onComplete: idx === count - 1 && playerIdx === 3 ? onComplete : undefined,
          });
        } else {
          img.setPosition(tx, ty).setAlpha(1);
        }
      });
    }

    private dealAnimation(onComplete: () => void) {
      this.destroyCardObjects();
      const pile = this.add.image(W/2, H/2, 'back').setDisplaySize(CARD_W, CARD_H);
      this.tweens.add({
        targets: pile, x: W/2 + 8, duration: 80, yoyo: true, repeat: 3,
        onComplete: () => {
          pile.destroy();
          [0, 1, 2, 3].forEach(i => this.layoutHand(i, true,
            i === 3 ? onComplete : undefined
          ));
        },
      });
    }

    // ── Passing phase ───────────────────────────────────────────────────────

    private showPassPhase() {
      const dir = this.engine.passDirectionForHand(this.handNumber);
      const labels: Record<string, string> = {
        left: '← Pass Left', right: '→ Pass Right',
        across: '↑ Pass Across', none: 'No Pass',
      };
      this.showStatus(`${labels[dir]}: select 3 cards  ·  Enter to confirm`);

      const btnBg = this.add.rectangle(W/2, H - 30, 200, 38, 0x15803d)
        .setInteractive({ cursor: 'pointer' })
        .setAlpha(0).setDepth(20)
        .setStrokeStyle(1, 0x4ade80);
      const btnTxt = this.add.text(W/2, H - 30, 'Pass Cards  ↵', {
        fontSize: '16px', color: '#fff', fontFamily: 'sans-serif',
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

      this.passIndicator = { btnBg, btnTxt };

      const confirm = () => {
        if (this.selectedPassCards.size !== 3) return;
        this.executePass();
      };

      btnBg.on('pointerdown', confirm);
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x16a34a));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(0x15803d));

      const enterKey = this.input.keyboard!.addKey(
        (window as any).Phaser.Input.Keyboard.KeyCodes.ENTER
      );
      enterKey.on('down', confirm);
      this.passIndicator.enterKey = enterKey;
    }

    private onCardClick(card: string, img: any, baseY: number) {
      if (this.gamePhase === 'passing') {
        if (this.selectedPassCards.has(card)) {
          this.selectedPassCards.delete(card);
          this.tweens.add({ targets: img, y: baseY, duration: 150 });
          img.clearTint();
        } else if (this.selectedPassCards.size < 3) {
          this.selectedPassCards.add(card);
          this.tweens.add({ targets: img, y: baseY - 22, duration: 150 });
          img.setTint(0x88ff88);
        }
        const ready = this.selectedPassCards.size === 3;
        if (this.passIndicator) {
          this.tweens.add({
            targets: [this.passIndicator.btnBg, this.passIndicator.btnTxt],
            alpha: ready ? 1 : 0, duration: 200,
          });
        }
        return;
      }

      if (this.gamePhase !== 'playing' || this.curPlayerIdx !== 0) return;
      if (!this.getLegalPlays().includes(card)) {
        // Shake — illegal move
        this.tweens.add({ targets: img, x: img.x + 8, duration: 60, yoyo: true, repeat: 2 });
        return;
      }
      this.doPlay(0, card);
    }

    private executePass() {
      if (this.passIndicator) {
        this.passIndicator.btnBg.destroy();
        this.passIndicator.btnTxt.destroy();
        if (this.passIndicator.enterKey) {
          this.passIndicator.enterKey.removeAllListeners();
          this.input.keyboard!.removeKey(this.passIndicator.enterKey);
        }
        this.passIndicator = null;
      }
      this.hideStatus();

      const humanCards = [...this.selectedPassCards];
      this.selectedPassCards.clear();

      const dir = this.engine.passDirectionForHand(this.handNumber);

      // Each bot independently chooses 3 cards to pass
      const passes = [0, 1, 2, 3].map((i: number) =>
        i === 0
          ? humanCards
          : this.bot.chooseBotPass(this.getHand(i), dir)
      );

      // applyPasses() works around the engine's player-0 bug (0 is falsy in
      // `playerIdxOverride || currentPlayerIdx`) by patching JSON state directly.
      this.game = this.engine.applyPasses(this.game, passes, dir);
      this.curPlayerIdx = this.game.currentPlayerIdx; // 2♣ holder after passing

      this.showStatus('Passing cards…');
      this.time.delayedCall(500, () => {
        this.hideStatus();
        this.destroyCardObjects();
        [0, 1, 2, 3].forEach(i => this.layoutHand(i, true, i === 3
          ? () => { this.gamePhase = 'playing'; this.advanceTurn(); }
          : undefined
        ));
      });
    }

    // ── Trick play ──────────────────────────────────────────────────────────

    private advanceTurn() {
      if (this.gamePhase === 'game_over') { this.showGameOver(); return; }
      if (this.gamePhase === 'hand_end')  { this.showHandEnd();  return; }
      if (this.gamePhase === 'trick_end') { this.resolveTrick(); return; }
      if (this.gamePhase !== 'playing') return;

      if (this.curPlayerIdx === 0) {
        this.highlightLegalCards();
      } else {
        this.time.delayedCall(500, () => {
          // chooseBotPlay uses game.checkAllowedPlay() internally for validation
          const card = this.bot.chooseBotPlay(
            this.game, this.curPlayerIdx, this.trickCards, this.trickLedSuit
          );
          this.doPlay(this.curPlayerIdx, card);
        });
      }
    }

    private highlightLegalCards() {
      const legal = this.getLegalPlays();
      this.getHand(0).forEach((card: string) => {
        const img = this.cardObjects[`hand_0_${card}`];
        if (!img) return;
        if (legal.includes(card)) {
          img.setAlpha(1).clearTint();
        } else {
          img.setAlpha(0.4).setTint(0x888888);
        }
      });
    }

    private clearHighlights() {
      this.getHand(0).forEach((card: string) => {
        const img = this.cardObjects[`hand_0_${card}`];
        if (img) img.setAlpha(1).clearTint();
      });
    }

    private doPlay(playerIdx: number, card: string) {
      this.clearHighlights();

      // Track led suit for this trick
      if (this.trickCards.length === 0) {
        this.trickLedSuit = this.engine.parseCard(card).suit;
      }
      // Track hearts broken
      if (this.engine.parseCard(card).suit === 'H') this.heartsBroken = true;

      // Record in engine state.
      // directPlay() is used (bypassing guard checks) because:
      //   • The trick leader's play has already been validated by getLegalPlays()
      //   • Calling play() on the leader would trigger firstPlayerPlayConditions
      //     from the wrong trick (player.played.suit mismatch) since we manage
      //     turn indices manually across tricks.
      // Non-leader plays are pre-validated by getLegalPlays() via checkAllowedPlay().
      (this.game as any).directPlay([card], 'table');
      this.trickCards.push({ card, playerIdx });

      // Animate card from hand to trick area
      const handKey = `hand_${playerIdx}_${card}`;
      const img = this.cardObjects[handKey];
      if (!img) { this.afterCardPlayed(playerIdx); return; }

      if (playerIdx !== 0) img.setTexture(card); // flip bot card face-up

      const targetPos = TRICK_POS[playerIdx];
      img.setDepth(20 + this.trickCards.length);

      this.tweens.add({
        targets: img,
        x: targetPos.x, y: targetPos.y, angle: 0,
        displayWidth: CARD_W, displayHeight: CARD_H,
        duration: 300, ease: 'Quad.easeOut',
        onComplete: () => {
          delete this.cardObjects[handKey];
          this.trickGroup.add(img);
          this.updateScoreDisplay();
          this.rebuildHand(playerIdx);
          this.afterCardPlayed(playerIdx);
        },
      });
    }

    /**
     * Called after each card play animation completes.
     * Advances to the next player within a trick, or transitions to trick_end.
     *
     * We manually update the engine's currentPlayerIdx and turnIdx so that
     * checkAllowedPlay() uses playerPlayConditions (follow-suit) for the next
     * player rather than firstPlayerPlayConditions (2♣ rule).
     */
    private afterCardPlayed(playerIdx: number) {
      if (this.trickCards.length === 4) {
        this.gamePhase = 'trick_end';
        this.advanceTurn();
      } else {
        const nextIdx = (playerIdx + 1) % 4;
        this.curPlayerIdx = nextIdx;
        // Keep engine in sync so checkAllowedPlay() sees the right current player
        this.game.currentRound.currentPlayerIdx = nextIdx;
        this.game.currentRound.turnIdx += 1;            // >0 → playerPlayConditions
        this.game.currentRound.previousPlayerIdx.push(playerIdx);
        this.gamePhase = 'playing';
        this.advanceTurn();
      }
    }

    private rebuildHand(playerIdx: number) {
      const prefix = `hand_${playerIdx}_`;
      Object.keys(this.cardObjects)
        .filter(k => k.startsWith(prefix))
        .forEach(k => { this.cardObjects[k].destroy(); delete this.cardObjects[k]; });
      this.layoutHand(playerIdx, false);
    }

    // ── Trick resolution ────────────────────────────────────────────────────

    private resolveTrick() {
      // Our trickWinner() uses only the led suit (correct Hearts rule).
      // The engine's built-in winConditions uses poker value across all suits,
      // which is why we calculate the winner independently.
      const winnerIdx = this.engine.trickWinner(this.trickCards, this.trickLedSuit);

      // Score trick
      const pts = this.trickCards.reduce(
        (sum: number, tc: any) => sum + this.engine.cardPoints(tc.card), 0
      );
      this.handPoints[winnerIdx] += pts;

      // Highlight winning card
      const winEntry = this.trickCards.find((tc: any) => tc.playerIdx === winnerIdx);
      if (winEntry) {
        const winImg = this.trickGroup.getChildren().find(
          (img: any) => img.texture?.key === winEntry.card
        );
        if (winImg) {
          this.tweens.add({ targets: winImg, scale: 1.25, duration: 200, yoyo: true, repeat: 1 });
        }
      }

      const wpos    = PLAYER_POS[winnerIdx];
      const targets = this.trickGroup.getChildren();
      this.time.delayedCall(500, () => {
        this.tweens.add({
          targets, x: wpos.x, y: wpos.y,
          displayWidth: CARD_W * 0.4, displayHeight: CARD_H * 0.4,
          alpha: 0, duration: 350, ease: 'Quad.easeIn',
          onComplete: () => {
            this.trickGroup.clear(true, true);
            this.tricksInHand++;
            this.trickCards    = [];
            this.trickLedSuit  = null;

            // Reset engine table and re-seat for next trick.
            // turnIdx stays > 0 so playerPlayConditions (follow-suit) applies
            // to all players; the leading restriction is handled by getLegalPlays().
            this.game.currentRound.table             = [];
            this.game.currentRound.currentPlayerIdx  = winnerIdx;
            this.game.currentRound.firstPlayerIdx    = winnerIdx;
            this.game.currentRound.turnIdx          += 1;
            this.game.currentRound.previousPlayerIdx = [];
            this.curPlayerIdx = winnerIdx;

            this.updateScoreDisplay();
            this.gamePhase = this.tricksInHand === 13 ? 'hand_end' : 'playing';
            this.advanceTurn();
          },
        });
      });
    }

    // ── Hand end ────────────────────────────────────────────────────────────

    private showHandEnd() {
      const { detectShootTheMoon, applyShootTheMoon } = this.engine;

      let pts = [...this.handPoints];
      const shooter = detectShootTheMoon(pts);
      const moonMsg = shooter !== null
        ? `\n🌙 ${this.playerNames[shooter]} shot the moon!` : '';
      if (shooter !== null) pts = applyShootTheMoon(pts, shooter);

      pts.forEach((p: number, i: number) => { this.gamePoints[i] += p; });

      const lines = this.playerNames.map((name: string, i: number) =>
        `${name}: +${pts[i]} pts  (total: ${this.gamePoints[i]})`
      ).join('\n');

      const maxPts = Math.max(...this.gamePoints);
      if (maxPts >= 100) {
        const minPts  = Math.min(...this.gamePoints);
        this.winnerIdx = this.gamePoints.indexOf(minPts);
        this.gamePhase = 'game_over';
        this.showModal(`Hand over!${moonMsg}`, lines, 'See Results',
          () => { this.hideModal(); this.advanceTurn(); }
        );
      } else {
        this.showModal(`Hand over!${moonMsg}`, lines, 'Next Hand', () => {
          this.hideModal();
          this.handNumber++;
          this.startNewHand();
        });
      }
    }

    // ── Game over ───────────────────────────────────────────────────────────

    private showGameOver() {
      const winner   = this.playerNames[this.winnerIdx!];
      const pts      = this.playerNames.map(
        (name: string, i: number) => `${name}: ${this.gamePoints[i]} pts`
      ).join('\n');
      const humanWon = this.winnerIdx === 0;

      this.showModal(
        humanWon ? '🎉 You Win!' : `${winner} Wins`,
        pts,
        'Play Again',
        () => { this.hideModal(); this.startNewGame(); }
      );

      const onGameEnd = this.registry.get('onGameEnd') as (won: boolean, points: number) => void;
      onGameEnd(humanWon, this.gamePoints[0]);
    }

    // ── Score display ───────────────────────────────────────────────────────

    private updateScoreDisplay() {
      const setOverlay = this.registry.get('setOverlay');
      if (setOverlay) {
        setOverlay({
          players: this.playerNames.map((name: string, i: number) => ({
            name,
            gamePoints: this.gamePoints[i],
            handPoints: this.handPoints[i],
            isActive: this.gamePhase === 'playing' && this.curPlayerIdx === i,
          })),
          phase:         this.gamePhase,
          passDirection: this.engine.passDirectionForHand(this.handNumber),
          heartsBroken:  this.heartsBroken,
          trick:         this.trickCards,
        });
      }
      this.playerNames.forEach((_: string, i: number) => {
        if (this.scoreTexts[i]) this.scoreTexts[i].setText(`${this.gamePoints[i]} pts`);
      });
    }

    // ── Modal overlay ───────────────────────────────────────────────────────

    private showModal(title: string, body: string, btnLabel: string, onBtn: () => void) {
      this.hideModal();

      const bg = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.65).setDepth(50);
      const card = this.add.rectangle(W/2, H/2, 440, 300, 0x1e3a2f, 1)
        .setStrokeStyle(2, 0x4ade80).setDepth(51);
      const titleTxt = this.add.text(W/2, H/2 - 110, title, {
        fontSize: '28px', color: '#f87171', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(52);
      const bodyTxt = this.add.text(W/2, H/2 - 30, body, {
        fontSize: '16px', color: '#d1fae5', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5).setDepth(52);
      const btnBg = this.add.rectangle(W/2, H/2 + 100, 180, 44, 0x16a34a)
        .setInteractive({ cursor: 'pointer' }).setDepth(52);
      const btnTxt = this.add.text(W/2, H/2 + 100, btnLabel, {
        fontSize: '18px', color: '#fff', fontFamily: 'sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(53);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x22c55e));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(0x16a34a));
      btnBg.on('pointerdown', onBtn);

      this.modalGroup = [bg, card, titleTxt, bodyTxt, btnBg, btnTxt];
      [card, titleTxt, bodyTxt, btnBg, btnTxt].forEach(o => {
        o.setAlpha(0);
        this.tweens.add({ targets: o, alpha: 1, duration: 300, delay: 50 });
      });
    }

    private hideModal() {
      this.modalGroup.forEach(o => o.destroy());
      this.modalGroup = [];
    }

    // ── Status text ─────────────────────────────────────────────────────────

    private showStatus(msg: string) { this.statusText.setText(msg).setVisible(true); }
    private hideStatus() { this.statusText.setVisible(false); }
  }
  return GameScene;
}

// ── Overlay state (React) ─────────────────────────────────────────────────────

interface OverlayPlayer {
  name: string;
  gamePoints: number;
  handPoints: number;
  isActive: boolean;
}

interface OverlayState {
  players: OverlayPlayer[];
  phase: string;
  passDirection: string;
  heartsBroken: boolean;
  trick: { card: string; playerIdx: number }[];
}

// ── React page component ──────────────────────────────────────────────────────

export default function HeartsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<any>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  const { submit } = useSubmitScore();
  const client     = useScoresClient();

  // Stable callback ref
  const onGameEndRef = useRef<(won: boolean, points: number) => void>(() => {});
  onGameEndRef.current = useCallback((won: boolean, points: number) => {
    if (won) {
      submit({
        gameSlug:     'hearts',
        ladderSlug:   'global',
        primaryValue: 1,
      });
    }
    submit({
      gameSlug:     'hearts',
      ladderSlug:   'avg-points',
      primaryValue: points,
    });
    client.updatePlayerStats('hearts', {
      plays: 1,
      wins:  won ? 1 : 0,
      losses: won ? 0 : 1,
    });
  }, [submit, client]);

  useEffect(() => {
    if (!containerRef.current) return;
    // `cancelled` prevents the async Phaser import from creating a second
    // game instance when React StrictMode fires the cleanup before the
    // dynamic import resolves (dev-mode double-invoke behaviour).
    let cancelled = false;
    let game: any;

    import('phaser').then(Phaser => {
      if (cancelled || !containerRef.current || gameRef.current) return;

      (window as any).Phaser = Phaser.default ?? Phaser;

      const BootScene    = makeBootScene(onGameEndRef, setOverlay);
      const PreloadScene = makePreloadScene();
      const MenuScene    = makeMenuScene();
      const GameScene    = makeGameScene();

      game = new (window as any).Phaser.Game({
        type:    (window as any).Phaser.AUTO,
        width:   W,
        height:  H,
        parent:  containerRef.current,
        backgroundColor: '#000000',
        scene:   [BootScene, PreloadScene, MenuScene, GameScene],
        scale: {
          mode:       (window as any).Phaser.Scale.FIT,
          autoCenter: (window as any).Phaser.Scale.CENTER_BOTH,
        },
      });
      if (!cancelled) gameRef.current = game;
    });

    return () => {
      cancelled = true;
      game?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 pt-4">
      <div className="relative w-full max-w-[1024px]">
        {/* Phaser canvas */}
        <div ref={containerRef} className="w-full aspect-[1024/640]" />

        {/* Score overlay — rendered over the canvas */}
        {overlay && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
            {overlay.players.map((p, i) => (
              <div
                key={i}
                className={`rounded px-3 py-1 text-xs font-mono flex items-center gap-2
                  ${p.isActive
                    ? 'bg-green-700/90 text-white ring-1 ring-green-400'
                    : 'bg-black/60 text-slate-300'}`}
              >
                <span className="font-bold w-14 truncate">{p.name}</span>
                <span>{p.gamePoints} pts</span>
                {p.handPoints > 0 && (
                  <span className="text-red-400">+{p.handPoints}</span>
                )}
              </div>
            ))}
            {overlay.heartsBroken && (
              <div className="text-center text-red-400 text-xs font-mono bg-black/60 rounded px-2 py-0.5">
                ♥ broken
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
