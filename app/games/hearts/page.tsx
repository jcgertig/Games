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
  onGameEnd: React.MutableRefObject<(won: boolean) => void>,
  setOverlay: (o: OverlayState) => void,
) {
  class BootScene extends (window as any).Phaser.Scene {
    constructor() { super({ key: 'Boot' }); }
    create() {
      this.registry.set('onGameEnd', (won: boolean) => onGameEnd.current(won));
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

      // Play button
      const btnBg = this.add.rectangle(W/2, 310, 200, 56, 0x16a34a, 1)
        .setInteractive({ cursor: 'pointer' })
        .setStrokeStyle(2, 0x4ade80);
      const btnText = this.add.text(W/2, 310, 'New Game', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5);

      [btnBg, btnText].forEach(o => o.setAlpha(0));
      this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 400, delay: 400 });

      btnBg.on('pointerover',  () => btnBg.setFillStyle(0x22c55e));
      btnBg.on('pointerout',   () => btnBg.setFillStyle(0x16a34a));
      btnBg.on('pointerdown',  () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('Game'));
      });

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
  // Lazy-import the engine functions inside the scene so they are only
  // resolved in the browser (avoids SSR issues with Phaser dynamic import).
  class GameScene extends (window as any).Phaser.Scene {
    // Engine state
    private gs: any; // HeartsState

    // Phaser display objects
    private cardObjects: { [key: string]: any } = {}; // card key → Image
    private handContainers: any[] = [];               // Container per player
    private trickGroup!: any;
    private scoreTexts: any[] = [];
    private nameTexts: any[] = [];
    private passIndicator: any = null;
    private statusText!: any;
    private selectedPassCards: Set<string> = new Set();

    // Engine functions (loaded lazily)
    private engine: any = null;
    private bot: any = null;

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
      const Phaser = (window as any).Phaser;
      // Felt
      this.add.rectangle(W/2, H/2, W, H, FELT_COLOR);
      // Inner oval shadow
      const g = this.add.graphics();
      g.fillStyle(FELT_DARK, 0.5);
      g.fillEllipse(W/2, H/2, 580, 400);

      // Player name plates
      const namePlate = (x: number, y: number, label: string, anchor: {ox: number; oy: number}) => {
        this.add.rectangle(x, y, 130, 32, 0x000000, 0.45).setOrigin(anchor.ox, anchor.oy);
        return this.add.text(x + (anchor.ox === 0 ? 65 : anchor.ox === 1 ? -65 : 0),
          y + (anchor.oy === 0 ? 16 : anchor.oy === 1 ? -16 : 16), label, {
          fontSize: '14px', color: '#ffffff', fontFamily: 'sans-serif',
        }).setOrigin(0.5);
      };

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

    // ── Game lifecycle ──────────────────────────────────────────────────────

    private startNewGame() {
      const { createInitialState } = this.engine;
      this.gs = createInitialState(['You', 'West', 'North', 'East']);
      this.selectedPassCards.clear();
      this.dealAnimation(() => {
        this.updateScoreDisplay();
        if (this.gs.phase === 'passing') {
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

    /** Lay out a player's hand horizontally (or vertically for left/right bots). */
    private layoutHand(playerIdx: number, animate = false, onComplete?: () => void) {
      const hand  = this.gs.players[playerIdx].hand;
      const faceUp = playerIdx === 0;
      const isVertical = playerIdx === 1 || playerIdx === 3;
      const pos   = PLAYER_POS[playerIdx];
      const count = hand.length;

      const overlap = playerIdx === 0 ? CARD_OVERLAP : BOT_OVERLAP;
      const span = (count - 1) * overlap;

      hand.forEach((card: string, idx: number) => {
        const key = `hand_${playerIdx}_${card}`;
        const offset = -span / 2 + idx * overlap;

        let tx: number, ty: number, angle = 0;
        if (isVertical) {
          tx = pos.x;
          ty = pos.y + offset;
          angle = 90;
        } else {
          tx = pos.x + offset;
          ty = pos.y;
        }

        if (!this.cardObjects[key]) {
          const img = this.add.image(tx, ty, this.getCardTexture(card, faceUp))
            .setDisplaySize(CARD_W, CARD_H)
            .setAngle(angle)
            .setDepth(idx + 1);
          this.cardObjects[key] = img;

          if (animate) {
            // Start from deck centre
            img.setPosition(W/2, H/2).setAlpha(0);
          }
        }

        const img = this.cardObjects[key];

        // Make human cards interactive
        if (playerIdx === 0 && !img.input) {
          img.setInteractive({ cursor: 'pointer' });
          img.on('pointerover', () => {
            if (this.gs.phase === 'playing' && this.gs.currentPlayerIdx === 0) {
              img.setY(ty - 14);
            } else if (this.gs.phase === 'passing') {
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
            targets: img,
            x: tx, y: ty, alpha: 1,
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
      // Shuffle visual — create a deck pile, then deal outwards
      const pile = this.add.image(W/2, H/2, 'back')
        .setDisplaySize(CARD_W, CARD_H);

      // Brief "shuffle" wobble
      this.tweens.add({
        targets: pile, x: W/2 + 8, duration: 80, yoyo: true, repeat: 3,
        onComplete: () => {
          pile.destroy();
          [0, 1, 2, 3].forEach(i => this.layoutHand(i, true,
            i === 3 ? onComplete : undefined
          ));
        }
      });
    }

    // ── Passing phase ───────────────────────────────────────────────────────

    private showPassPhase() {
      const dir = this.gs.passDirection;
      const labels: Record<string, string> = {
        left: '← Pass Left', right: '→ Pass Right',
        across: '↑ Pass Across', none: 'No Pass',
      };
      this.showStatus(`${labels[dir]}: select 3 cards  ·  Enter to confirm`);

      // Pass button (hidden until 3 cards chosen)
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

      // Enter key confirms once 3 cards are selected
      const enterKey = this.input.keyboard!.addKey(
        (window as any).Phaser.Input.Keyboard.KeyCodes.ENTER
      );
      enterKey.on('down', confirm);
      // Store so we can remove it after passing
      this.passIndicator.enterKey = enterKey;
    }

    private onCardClick(card: string, img: any, baseY: number) {
      // During pass phase the human can always select cards — currentPlayerIdx
      // points to whoever holds 2♣ (not necessarily player 0) so we must not
      // gate on it here.
      if (this.gs.phase === 'passing') {
        // Toggle selection
        if (this.selectedPassCards.has(card)) {
          this.selectedPassCards.delete(card);
          this.tweens.add({ targets: img, y: baseY, duration: 150 });
          img.clearTint();
        } else if (this.selectedPassCards.size < 3) {
          this.selectedPassCards.add(card);
          this.tweens.add({ targets: img, y: baseY - 22, duration: 150 });
          img.setTint(0x88ff88);
        }
        // Show / hide the pass button
        const ready = this.selectedPassCards.size === 3;
        if (this.passIndicator) {
          this.tweens.add({
            targets: [this.passIndicator.btnBg, this.passIndicator.btnTxt],
            alpha: ready ? 1 : 0, duration: 200,
          });
        }
        return;
      }

      if (this.gs.phase !== 'playing' || this.gs.currentPlayerIdx !== 0) return;
      const { isLegalPlay } = this.engine;
      if (!isLegalPlay(this.gs, 0, card)) {
        // Shake to indicate illegal move
        this.tweens.add({
          targets: img, x: img.x + 8, duration: 60, yoyo: true, repeat: 2,
        });
        return;
      }
      this.doPlay(0, card);
    }

    private executePass() {
      if (this.passIndicator) {
        this.passIndicator.btnBg.destroy();
        this.passIndicator.btnTxt.destroy();
        // Remove the Enter key listener so it doesn't fire again
        if (this.passIndicator.enterKey) {
          this.passIndicator.enterKey.removeAllListeners();
          this.input.keyboard!.removeKey(this.passIndicator.enterKey);
        }
        this.passIndicator = null;
      }
      this.hideStatus();

      const humanCards = [...this.selectedPassCards];
      this.selectedPassCards.clear();

      // Bots choose their pass cards
      const { submitPass } = this.engine;
      const { chooseBotPass } = this.bot;
      let state = this.gs;

      // Submit all passes
      [0, 1, 2, 3].forEach(i => {
        const cards = i === 0
          ? humanCards
          : chooseBotPass(state.players[i].hand, state.passDirection);
        state = submitPass(state, i, cards);
      });

      this.gs = state;

      // Animate a brief "pass" flash then rebuild hands
      this.showStatus('Passing cards…');
      this.time.delayedCall(500, () => {
        this.hideStatus();
        this.destroyCardObjects();
        [0, 1, 2, 3].forEach(i => this.layoutHand(i, true, i === 3
          ? () => this.advanceTurn()
          : undefined
        ));
      });
    }

    // ── Trick play ──────────────────────────────────────────────────────────

    private advanceTurn() {
      if (this.gs.phase === 'game_over') {
        this.showGameOver();
        return;
      }
      if (this.gs.phase === 'hand_end') {
        this.showHandEnd();
        return;
      }
      if (this.gs.phase === 'trick_end') {
        this.resolveTrick();
        return;
      }
      if (this.gs.phase !== 'playing') return;

      const { currentPlayerIdx } = this.gs;
      if (currentPlayerIdx === 0) {
        this.highlightLegalCards();
      } else {
        // Bot turn — short pause for realism
        this.time.delayedCall(500, () => {
          const { chooseBotPlay } = this.bot;
          const card = chooseBotPlay(this.gs, currentPlayerIdx);
          this.doPlay(currentPlayerIdx, card);
        });
      }
    }

    private highlightLegalCards() {
      const { legalPlays } = this.engine;
      const legal = legalPlays(this.gs, 0);
      this.gs.players[0].hand.forEach((card: string) => {
        const key = `hand_0_${card}`;
        const img = this.cardObjects[key];
        if (!img) return;
        if (legal.includes(card)) {
          img.setAlpha(1).clearTint();
        } else {
          img.setAlpha(0.4).setTint(0x888888);
        }
      });
    }

    private clearHighlights() {
      this.gs.players[0].hand.forEach((card: string) => {
        const key = `hand_0_${card}`;
        const img = this.cardObjects[key];
        if (img) img.setAlpha(1).clearTint();
      });
    }

    private doPlay(playerIdx: number, card: string) {
      this.clearHighlights();

      const { playCard } = this.engine;
      const prevGs = this.gs;
      this.gs = playCard(this.gs, playerIdx, card);

      // Animate card from hand to trick slot
      const handKey = `hand_${playerIdx}_${card}`;
      const img = this.cardObjects[handKey];
      if (!img) { this.advanceTurn(); return; }

      // Flip face-up if bot
      if (playerIdx !== 0) {
        img.setTexture(card);
      }

      const targetPos = TRICK_POS[playerIdx];
      img.setDepth(20 + this.gs.trickCards.length);

      this.tweens.add({
        targets: img,
        x: targetPos.x, y: targetPos.y,
        angle: 0,
        displayWidth: CARD_W, displayHeight: CARD_H,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          delete this.cardObjects[handKey];
          this.trickGroup.add(img);
          this.updateScoreDisplay();

          // Rebuild that player's hand layout (shifted after card removed)
          this.rebuildHand(playerIdx);
          this.advanceTurn();
        },
      });
    }

    private rebuildHand(playerIdx: number) {
      // Destroy old hand images for this player and redraw
      const prefix = `hand_${playerIdx}_`;
      Object.keys(this.cardObjects)
        .filter(k => k.startsWith(prefix))
        .forEach(k => { this.cardObjects[k].destroy(); delete this.cardObjects[k]; });
      this.layoutHand(playerIdx, false);
    }

    // ── Trick resolution ────────────────────────────────────────────────────

    private resolveTrick() {
      // gs.phase is 'trick_end' — winner is currentPlayerIdx
      const winnerIdx = this.gs.currentPlayerIdx; // set by engine to trick winner

      // Highlight winning card briefly
      const winnerEntry = this.gs.trickCards.find(
        (tc: any) => tc.playerIdx === winnerIdx
      );
      if (winnerEntry) {
        const winImg = this.trickGroup.getChildren().find(
          (img: any) => img.texture?.key === winnerEntry.card
        );
        if (winImg) {
          this.tweens.add({
            targets: winImg, scale: 1.25, duration: 200, yoyo: true, repeat: 1,
          });
        }
      }

      // Collect trick cards to winner's pile
      const wpos = PLAYER_POS[winnerIdx];
      const targets = this.trickGroup.getChildren();
      this.time.delayedCall(500, () => {
        this.tweens.add({
          targets, x: wpos.x, y: wpos.y,
          displayWidth: CARD_W * 0.4, displayHeight: CARD_H * 0.4,
          alpha: 0,
          duration: 350, ease: 'Quad.easeIn',
          onComplete: () => {
            this.trickGroup.clear(true, true);
            this.updateScoreDisplay();
            // Advance to next trick
            const { startNextTrick } = this.engine;
            this.gs = startNextTrick(this.gs);
            this.advanceTurn();
          },
        });
      });
    }

    // ── Hand end ────────────────────────────────────────────────────────────

    private showHandEnd() {
      const { startNewHand } = this.engine;
      const pts = this.gs.handPoints;
      const gamePts = this.gs.players.map((p: any) => p.gamePoints);

      // Check for shoot the moon
      const moon = pts.indexOf(26);
      const moonMsg = moon >= 0
        ? `\n🌙 ${this.gs.players[moon].name} shot the moon!`
        : '';

      const lines = this.gs.players.map((p: any, i: number) =>
        `${p.name}: +${pts[i]} pts  (total: ${gamePts[i]})`
      ).join('\n');

      this.showModal(
        `Hand over!${moonMsg}`,
        lines,
        'Next Hand',
        () => {
          this.gs = startNewHand(this.gs);
          this.dealAnimation(() => {
            this.updateScoreDisplay();
            if (this.gs.phase === 'passing') {
              this.showPassPhase();
            } else {
              this.advanceTurn();
            }
          });
        }
      );
    }

    // ── Game over ───────────────────────────────────────────────────────────

    private showGameOver() {
      const winner = this.gs.players[this.gs.winnerIdx!];
      const pts = this.gs.players.map((p: any) => `${p.name}: ${p.gamePoints} pts`).join('\n');
      const humanWon = this.gs.winnerIdx === 0;

      this.showModal(
        humanWon ? '🎉 You Win!' : `${winner.name} Wins`,
        pts,
        'Play Again',
        () => {
          this.hideModal();
          this.startNewGame();
        }
      );

      const onGameEnd = this.registry.get('onGameEnd') as (won: boolean) => void;
      onGameEnd(humanWon);
    }

    // ── Score display ───────────────────────────────────────────────────────

    private updateScoreDisplay() {
      const setOverlay = this.registry.get('setOverlay');
      if (setOverlay) {
        setOverlay({
          players: this.gs.players.map((p: any, i: number) => ({
            name: p.name,
            gamePoints: p.gamePoints,
            handPoints: this.gs.handPoints[i],
            isActive: this.gs.phase === 'playing' && this.gs.currentPlayerIdx === i,
          })),
          phase: this.gs.phase,
          passDirection: this.gs.passDirection,
          heartsBroken: this.gs.heartsBroken,
          trick: this.gs.trickCards,
        });
      }
      this.gs.players.forEach((p: any, i: number) => {
        if (this.scoreTexts[i]) {
          this.scoreTexts[i].setText(`${p.gamePoints} pts`);
        }
      });
    }

    // ── Modal overlay ───────────────────────────────────────────────────────

    private modalGroup: any[] = [];

    private showModal(title: string, body: string, btnLabel: string, onBtn: () => void) {
      this.hideModal();
      const Phaser = (window as any).Phaser;

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

      // Entrance animation
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

    private showStatus(msg: string) {
      this.statusText.setText(msg).setVisible(true);
    }
    private hideStatus() {
      this.statusText.setVisible(false);
    }
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
  const onGameEndRef = useRef<(won: boolean) => void>(() => {});
  onGameEndRef.current = useCallback((won: boolean) => {
    if (won) {
      submit({
        gameSlug:     'hearts',
        ladderSlug:   'global',
        primaryValue: 1,
      });
    }
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
