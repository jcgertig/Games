'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { HeartsRoomState } from '@/app/api/hearts/_game';
import { useRoomBootstrap, RoomLobby } from '@/lib/online-rooms';
import { useSubmitScore, useScoresClient } from '@/lib/scores';

// ── Layout / visual constants (same as solo game) ─────────────────────────────

const W = 1024, H = 640;
const CARD_W = 72, CARD_H = 104;
const CARD_OVERLAP = 26, BOT_OVERLAP = 18;

const RANK_TO_SVG: Record<string, string> = {
  A: '1', '2':'2','3':'3','4':'4','5':'5',
  '6':'6','7':'7','8':'8','9':'9','10':'10',
  J:'jack', Q:'queen', K:'king',
};
const SUIT_TO_SVG: Record<string, string> = { C:'clubs', D:'diams', H:'hearts', S:'spades' };
function cardToSvgId(card: string) {
  const suit = card.slice(-1), rank = card.slice(0,-1);
  return `${RANK_TO_SVG[rank]}_of_${SUIT_TO_SVG[suit]}`;
}
const PLAYER_POS = [
  { x: W/2,     y: H-80  },
  { x: 100,     y: H/2   },
  { x: W/2,     y: 80    },
  { x: W-100,   y: H/2   },
];
const TRICK_POS = [
  { x: W/2,       y: H/2+110 },
  { x: W/2-120,   y: H/2     },
  { x: W/2,       y: H/2-110 },
  { x: W/2+120,   y: H/2     },
];
const FELT_COLOR = 0x1a5c2a, FELT_DARK = 0x134520;
const SUIT_ORDER: Record<string, number> = { C:0, D:1, S:2, H:3 };

// ── Phaser Preload scene (reused from solo) ───────────────────────────────────

function makePreloadScene() {
  class PreloadScene extends (window as any).Phaser.Scene {
    constructor() { super({ key: 'Preload' }); }
    preload() {
      const bar = this.add.graphics(), bg = this.add.graphics();
      bg.fillStyle(0x222222).fillRect(W/2-200, H/2-20, 400, 40);
      this.load.on('progress', (v: number) => {
        bar.clear().fillStyle(0x4ade80).fillRect(W/2-198, H/2-18, 396*v, 36);
      });
      this.add.text(W/2, H/2-50, 'Loading cards…', { fontSize:'20px', color:'#ffffff', fontFamily:'sans-serif' }).setOrigin(0.5);
      this.load.text('cards-svg', '/cards/svg-cards.svg');
      // table-bg no longer needed — felt drawn in code
    }
    async create() {
      await this.buildTextures(this.cache.text.get('cards-svg'));
      this.scene.start('OnlineGame');
    }
    private async buildTextures(svgText: string) {
      const parser = new DOMParser(), serializer = new XMLSerializer();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const defs = doc.querySelector('defs');
      const defsStr = defs ? serializer.serializeToString(defs) : '<defs/>';
      const allCards = ['back', ...['C','D','H','S'].flatMap(s =>
        ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r => `${r}${s}`)
      )];
      await Promise.all(allCards.map(card => new Promise<void>(resolve => {
        const id = card === 'back' ? 'back' : cardToSvgId(card);
        const el = doc.getElementById(id);
        if (!el) { this.makeFallback(card); resolve(); return; }
        const elStr = serializer.serializeToString(el);
        const svgBlob = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 169.075 244.64" width="${CARD_W}" height="${CARD_H}">${defsStr}${elStr}</svg>`;
        const url = URL.createObjectURL(new Blob([svgBlob], { type:'image/svg+xml;charset=utf-8' }));
        const img = new Image(CARD_W, CARD_H);
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = CARD_W; cv.height = CARD_H;
          cv.getContext('2d')!.drawImage(img, 0, 0, CARD_W, CARD_H);
          this.textures.addCanvas(card, cv);
          URL.revokeObjectURL(url); resolve();
        };
        img.onerror = () => { this.makeFallback(card); URL.revokeObjectURL(url); resolve(); };
        img.src = url;
      })));
    }
    private makeFallback(card: string) {
      const cv = document.createElement('canvas');
      cv.width = CARD_W; cv.height = CARD_H;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle='#fff'; ctx.strokeStyle='#555'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(1,1,CARD_W-2,CARD_H-2,6); ctx.fill(); ctx.stroke();
      if (card === 'back') {
        ctx.fillStyle='#1a3a8e'; ctx.fillRect(5,5,CARD_W-10,CARD_H-10);
        ctx.fillStyle='#ffd700'; ctx.font='24px serif'; ctx.textAlign='center';
        ctx.fillText('♠', CARD_W/2, CARD_H/2+8);
      } else {
        const suit = card.slice(-1), rank = card.slice(0,-1);
        const sym = ({H:'♥',D:'♦',C:'♣',S:'♠'} as any)[suit];
        const col = suit==='H'||suit==='D' ? '#cc0000' : '#111';
        ctx.fillStyle=col; ctx.font='bold 14px sans-serif'; ctx.textAlign='left';
        ctx.fillText(rank,4,16); ctx.fillText(sym,4,30);
        ctx.font='bold 30px serif'; ctx.textAlign='center'; ctx.fillText(sym,CARD_W/2,CARD_H/2+10);
      }
      this.textures.addCanvas(card, cv);
    }
  }
  return PreloadScene;
}

// ── Phaser Online Game Scene ──────────────────────────────────────────────────

function makeOnlineGameScene(
  mySeat: number,
  sendAction: (type: 'play' | 'pass', payload: any) => Promise<void>,
) {
  class OnlineGameScene extends (window as any).Phaser.Scene {
    private currentState: HeartsRoomState | null = null;
    private prevState:    HeartsRoomState | null = null;
    private isAnimating   = false;
    private pendingState: HeartsRoomState | null = null;
    private currentTrickLedSuit: string | null = null;
    private cardObjects: Record<string, any> = {};
    private trickGroup!: any;
    private scoreTexts: any[] = [];
    private statusText!: any;
    private selectedPassCards: Set<string> = new Set();
    private passIndicator: any = null;
    private modalGroup: any[] = [];

    // Sort and return the display hand for a given seat
    private displayHand(seat: number): string[] {
      const hand = this.currentState!.hands[seat];
      if (seat !== mySeat) return hand;
      // sort own hand by suit then rank
      return [...hand].sort((a, b) => {
        const sa = SUIT_ORDER[a.slice(-1)] ?? 0;
        const sb = SUIT_ORDER[b.slice(-1)] ?? 0;
        if (sa !== sb) return sa - sb;
        const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        return RANKS.indexOf(a.slice(0,-1)) - RANKS.indexOf(b.slice(0,-1));
      });
    }

    constructor() { super({ key: 'OnlineGame' }); }

    create() {
      this.drawTable();
      this.showStatus('Waiting for game to start…');
      // Register the live-update listener.
      this.registry.events.on('stateUpdate', (state: HeartsRoomState) => {
        this.onStateUpdate(state);
      });
      // Apply any state already stored in the registry by the React component.
      // registry.set() is persistent storage, so this works regardless of
      // whether the state arrived before or after this scene was created.
      const stored = this.registry.get('latestState') as HeartsRoomState | undefined;
      if (stored) this.onStateUpdate(stored);
    }

    // ── Table ────────────────────────────────────────────────────────────────

    private drawTable() {
      const g = this.add.graphics();

      // ── Wood frame background ──────────────────────────────────────────────
      const FRAME = 30;
      g.fillStyle(0x3D1F0A);
      g.fillRect(0, 0, W, H);
      ([0x4A2610, 0x3D1F0A, 0x4E2B12, 0x3A1C08] as number[]).forEach((c, i) => {
        g.fillStyle(c, 0.25);
        g.fillRect(0, i * 80, W, 80);
        g.fillRect(0, i * 80 + 320, W, 80);
      });
      g.fillStyle(0x6B3A1F);
      g.fillRect(0, 0, W, FRAME);
      g.fillRect(0, H - FRAME, W, FRAME);
      g.fillRect(0, 0, FRAME, H);
      g.fillRect(W - FRAME, 0, FRAME, H);
      g.lineStyle(2, 0xB07040, 0.8); g.strokeRect(3, 3, W-6, H-6);
      g.lineStyle(1, 0x7A4820, 0.5); g.strokeRect(7, 7, W-14, H-14);
      g.lineStyle(3, 0x1A0A02, 0.9); g.strokeRect(FRAME, FRAME, W-FRAME*2, H-FRAME*2);

      // ── Green felt ─────────────────────────────────────────────────────────
      const FX = FRAME+2, FY = FRAME+2, FW = W-(FRAME+2)*2, FH = H-(FRAME+2)*2, R = 44;
      g.fillStyle(0x1a5c2a); g.fillRoundedRect(FX, FY, FW, FH, R);
      g.lineStyle(2, 0x0f3a1a, 1.0); g.strokeRoundedRect(FX, FY, FW, FH, R);
      g.lineStyle(1, 0x2e7d40, 0.35); g.strokeRoundedRect(FX+6, FY+6, FW-12, FH-12, R-4);

      // ── Scores ─────────────────────────────────────────────────────────────
      const offs = [{ x:0,y:-70 },{ x:58,y:0 },{ x:0,y:70 },{ x:-58,y:0 }];
      PLAYER_POS.forEach((pos, i) => {
        this.scoreTexts.push(this.add.text(pos.x+offs[i].x, pos.y+offs[i].y, '0 pts', {
          fontSize:'13px', color:'#fde68a', fontFamily:'sans-serif',
        }).setOrigin(0.5));
      });

      // ── Status text ────────────────────────────────────────────────────────
      this.statusText = this.add.text(W/2, H/2, '', {
        fontSize:'18px', color:'#fff', fontFamily:'sans-serif',
        backgroundColor:'#00000088', padding:{ x:12, y:6 },
      }).setOrigin(0.5).setDepth(10).setVisible(false);

      // ── Trick area outline ─────────────────────────────────────────────────
      const tg = this.add.graphics();
      tg.lineStyle(1, 0x4ade80, 0.15); tg.strokeEllipse(W/2, H/2, 300, 220);
      this.trickGroup = this.add.group();
    }

    // ── State update ─────────────────────────────────────────────────────────

    private onStateUpdate(state: HeartsRoomState) {
      if (this.isAnimating) { this.pendingState = state; return; }
      this.applyState(state);
    }

    private applyState(state: HeartsRoomState) {
      const prev = this.currentState;

      // A trick just resolved when tricksInHand increases (reliable regardless of
      // whether trickCards was emptied in this snapshot or a previous one).
      const trickJustResolved = prev != null && state.tricksInHand > prev.tricksInHand;

      // A new hand started (or passes were applied and cards changed).
      const isNewHand = state.phase !== 'waiting' && state.phase !== 'hand_end' && (
        !prev ||
        prev.phase === 'waiting' ||
        prev.handNumber !== state.handNumber ||
        (prev.phase === 'passing' && state.phase === 'playing')
      );

      if (trickJustResolved && !isNewHand) {
        // Capture the led suit before updating state (needed for winner computation).
        const ledSuit = prev!.trickLedSuit ?? this.currentTrickLedSuit;
        this.isAnimating = true;
        this.currentState = state;

        // Detect bots who played AFTER the human in this trick.
        // These cards were auto-played by advance() server-side and never
        // appeared in trickGroup — diff the hands to find them.
        const nextTrickKeys = new Set(state.trickCards.map(tc => tc.card));
        const prevTrickKeys = new Set(prev!.trickCards.map(tc => tc.card));
        const botsToAnimate: { card: string; seat: number }[] = [];
        for (let seat = 0; seat < 4; seat++) {
          if (seat === mySeat) continue;
          const prevHand = prev!.hands[seat] ?? [];
          const newHand  = state.hands[seat]  ?? [];
          prevHand.forEach(card => {
            if (!newHand.includes(card) && !nextTrickKeys.has(card) && !prevTrickKeys.has(card)) {
              botsToAnimate.push({ card, seat });
            }
          });
        }

        const runResolution = () => this.runTrickAnimation(ledSuit, () => {
          this.isAnimating = false;
          this.prevState = state;
          this.currentTrickLedSuit = state.trickLedSuit;
          this.flushPending() || this.redraw();
        });

        if (botsToAnimate.length > 0) {
          this.animateBotPlays(botsToAnimate, runResolution);
        } else {
          runResolution();
        }
      } else if (isNewHand) {
        // Deal animation: pile jiggles, cards fly to seats.
        this.isAnimating = true;
        this.currentState = state;
        this.runDealAnimation(() => {
          this.isAnimating = false;
          this.prevState = state;
          this.flushPending();
        });
      } else {
        this.currentState = state;
        this.prevState = state;
        this.redraw();
      }
    }

    /** Apply any queued state. Returns true if a pending state was consumed. */
    private flushPending(): boolean {
      if (!this.pendingState) return false;
      const next = this.pendingState;
      this.pendingState = null;
      this.applyState(next);
      return true;
    }

    // ── Bot card-play animation ───────────────────────────────────────────────

    /** Animate each bot card from its hand position to the trick area in sequence,
     *  rebuilding the bot's hand display as each card leaves.  Calls onComplete
     *  when all cards have landed so the trick-resolution animation can start. */
    private animateBotPlays(plays: { card: string; seat: number }[], onComplete: () => void) {
      if (plays.length === 0) { onComplete(); return; }
      let idx = 0;
      const playNext = () => {
        if (idx >= plays.length) { onComplete(); return; }
        const { card, seat } = plays[idx++];
        const key = `hand_${seat}_${card}`;
        const img = this.cardObjects[key];

        if (img) {
          delete this.cardObjects[key];
          img.setTexture(card).setDepth(50).setData('seat', seat); // flip bot card face-up
          this.tweens.add({
            targets: img,
            x: TRICK_POS[seat].x, y: TRICK_POS[seat].y,
            angle: 0, displayWidth: CARD_W, displayHeight: CARD_H,
            duration: 220, ease: 'Quad.easeOut',
            onComplete: () => {
              // Rebuild bot's remaining hand from the already-updated currentState
              const pfx = `hand_${seat}_`;
              Object.keys(this.cardObjects).filter(k => k.startsWith(pfx))
                .forEach(k => { this.cardObjects[k].destroy(); delete this.cardObjects[k]; });
              this.layoutHand(seat);
              this.trickGroup.add(img);
              this.time.delayedCall(60, playNext);
            },
          });
        } else {
          // Card object missing — place it directly and move on
          const tImg = this.add.image(TRICK_POS[seat].x, TRICK_POS[seat].y, card)
            .setDisplaySize(CARD_W, CARD_H).setDepth(20).setData('seat', seat);
          this.trickGroup.add(tImg);
          this.time.delayedCall(60, playNext);
        }
      };
      playNext();
    }

    // ── Deal animation ────────────────────────────────────────────────────────

    private runDealAnimation(onComplete: () => void) {
      this.destroyCards();
      this.trickGroup.clear(true, true);
      const state = this.currentState!;

      // Jiggling pile in the center, then cards fly out
      const pile = this.add.image(W/2, H/2, 'back').setDisplaySize(CARD_W, CARD_H);
      this.tweens.add({
        targets: pile, x: W/2 + 8, duration: 80, yoyo: true, repeat: 3,
        onComplete: () => {
          pile.destroy();
          [0,1,2,3].forEach(seat => {
            this.layoutHand(seat, true, seat === 3 ? () => {
              // Place any in-progress trick cards that arrived with the new state
              state.trickCards.forEach(({ card, seat: s }) => {
                const img = this.add.image(TRICK_POS[s].x, TRICK_POS[s].y, card)
                  .setDisplaySize(CARD_W, CARD_H).setDepth(20).setData('seat', s);
                this.trickGroup.add(img);
              });
              this.currentTrickLedSuit = state.trickLedSuit;
              state.playerNames.forEach((_, i) => {
                if (this.scoreTexts[i]) this.scoreTexts[i].setText(`${state.gamePoints[i]} pts`);
              });
              if (state.phase === 'passing') {
                this.hideStatus(); this.showPassPhase();
              } else if (state.phase === 'playing') {
                this.hidePassPhase(); this.hideStatus();
                if (state.curSeat === mySeat) this.highlightLegalPlays();
              }
              onComplete();
            } : undefined);
          });
        },
      });
    }

    // ── Trick resolution animation ────────────────────────────────────────────

    /** Animate trickGroup children flying to the trick winner, then call onComplete.
     *  Each image in trickGroup must have `seat` stored via img.setData('seat', n). */
    private runTrickAnimation(ledSuit: string | null, onComplete: () => void) {
      const children = this.trickGroup.getChildren() as any[];
      if (children.length === 0) { onComplete(); return; }

      // Reconstruct trick-card array from the images currently on the table
      const trickCards = children.map((img: any) => ({
        card: img.texture?.key as string,
        seat: img.getData('seat') as number,
      })).filter(tc => tc.card);

      const winnerSeat = this.computeTrickWinner(trickCards, ledSuit);
      const wpos = PLAYER_POS[winnerSeat];

      // Pulse the winning card
      const winImg = children.find((img: any) => img.getData('seat') === winnerSeat);
      if (winImg) {
        this.tweens.add({ targets: winImg, scale: 1.25, duration: 200, yoyo: true, repeat: 1 });
      }

      // After a short pause, shrink all trick cards toward the winner and fade out
      this.time.delayedCall(500, () => {
        this.tweens.add({
          targets: children, x: wpos.x, y: wpos.y,
          displayWidth: CARD_W * 0.4, displayHeight: CARD_H * 0.4,
          alpha: 0, duration: 350, ease: 'Quad.easeIn',
          onComplete: () => {
            this.trickGroup.clear(true, true);
            onComplete();
          },
        });
      });
    }

    /** Return the seat that wins a trick given the trick cards and led suit. */
    private computeTrickWinner(trickCards: { card: string; seat: number }[], ledSuit: string | null): number {
      const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
      if (!ledSuit || trickCards.length === 0) return trickCards[0]?.seat ?? 0;
      let best: { card: string; seat: number } | null = null;
      for (const tc of trickCards) {
        if (tc.card.slice(-1) !== ledSuit) continue;
        if (!best || RANKS.indexOf(tc.card.slice(0,-1)) > RANKS.indexOf(best.card.slice(0,-1))) best = tc;
      }
      return best?.seat ?? trickCards[0].seat;
    }

    private redraw() {
      const s = this.currentState!;
      this.destroyCards();
      this.trickGroup.clear(true, true);

      if (s.phase === 'waiting' || s.phase === 'hand_end') return;

      [0,1,2,3].forEach(seat => this.layoutHand(seat));

      s.trickCards.forEach(({ card, seat }) => {
        const pos = TRICK_POS[seat];
        const img = this.add.image(pos.x, pos.y, card)
          .setDisplaySize(CARD_W, CARD_H).setAngle(0).setDepth(20).setData('seat', seat);
        this.trickGroup.add(img);
      });
      this.currentTrickLedSuit = s.trickLedSuit;

      s.playerNames.forEach((_, i) => {
        if (this.scoreTexts[i]) this.scoreTexts[i].setText(`${s.gamePoints[i]} pts`);
      });

      if (s.phase === 'passing') {
        this.hideStatus();
        this.showPassPhase();
      } else if (s.phase === 'playing') {
        this.hidePassPhase();
        this.hideStatus();
        if (s.curSeat === mySeat) this.highlightLegalPlays();
      } else if (s.phase === 'game_over') {
        this.hidePassPhase();
        this.showGameOver();
      }
    }

    // ── Hand layout ───────────────────────────────────────────────────────────

    private layoutHand(seat: number, animate = false, onComplete?: () => void) {
      const faceUp = seat === mySeat;
      const isVert = seat === 1 || seat === 3;
      const pos = PLAYER_POS[seat];
      const hand = this.displayHand(seat);
      const overlap = seat === mySeat ? CARD_OVERLAP : BOT_OVERLAP;
      const span = (hand.length - 1) * overlap;
      const count = hand.length;

      hand.forEach((card, idx) => {
        const key = `hand_${seat}_${card}`;
        const offset = -span/2 + idx*overlap;
        const tx = isVert ? pos.x : pos.x + offset;
        const ty = isVert ? pos.y + offset : pos.y;
        const angle = isVert ? 90 : 0;

        if (!this.cardObjects[key]) {
          const img = this.add.image(tx, ty, faceUp ? card : 'back')
            .setDisplaySize(CARD_W, CARD_H).setAngle(angle).setDepth(idx+1);
          this.cardObjects[key] = img;
          if (animate) img.setPosition(W/2, H/2).setAlpha(0);
        }

        const img = this.cardObjects[key];

        if (seat === mySeat && !img.input) {
          img.setInteractive({ cursor:'pointer' });
          img.on('pointerover', () => this.onHover(img, ty));
          img.on('pointerout',  () => this.onHoverOut(img, card, ty));
          img.on('pointerdown', () => this.onCardClick(card, img, ty));
        }

        if (animate) {
          this.tweens.add({
            targets: img, x: tx, y: ty, alpha: 1,
            duration: 350,
            delay: (seat * 13 + idx) * 45,
            ease: 'Quad.easeOut',
            onComplete: idx === count-1 && seat === 3 ? onComplete : undefined,
          });
        } else {
          img.setPosition(tx, ty).setAlpha(1);
        }
      });
    }

    private onHover(img: any, ty: number) {
      const s = this.currentState!;
      if (s.phase === 'playing' && s.curSeat === mySeat) img.setY(ty - 14);
      else if (s.phase === 'passing') img.setY(ty - 10);
    }
    private onHoverOut(img: any, card: string, ty: number) {
      if (!this.selectedPassCards.has(card)) img.setY(ty);
    }

    private onCardClick(card: string, img: any, baseY: number) {
      const s = this.currentState!;
      if (s.phase === 'passing') {
        if (this.selectedPassCards.has(card)) {
          this.selectedPassCards.delete(card);
          this.tweens.add({ targets:img, y:baseY, duration:150 });
          img.clearTint();
        } else if (this.selectedPassCards.size < 3) {
          this.selectedPassCards.add(card);
          this.tweens.add({ targets:img, y:baseY-22, duration:150 });
          img.setTint(0x88ff88);
        }
        const ready = this.selectedPassCards.size === 3;
        if (this.passIndicator) {
          this.tweens.add({
            targets:[this.passIndicator.btnBg, this.passIndicator.btnTxt],
            alpha: ready ? 1 : 0, duration:200,
          });
        }
        return;
      }

      if (s.phase !== 'playing' || s.curSeat !== mySeat) return;
      if (!this.getLegalPlays().includes(card)) {
        this.tweens.add({ targets:img, x:img.x+8, duration:60, yoyo:true, repeat:2 });
        return;
      }

      // ── Optimistic card-play animation ─────────────────────────────────────
      // Track the led suit now (before state updates) so the trick winner can be
      // computed later even when the state snapshot has already cleared trickLedSuit.
      if (s.trickCards.length === 0) this.currentTrickLedSuit = card.slice(-1);

      this.isAnimating = true;
      const key = `hand_${mySeat}_${card}`;
      delete this.cardObjects[key];   // remove before rebuild so it isn't destroyed
      img.setDepth(50).setData('seat', mySeat);

      // Immediately rebuild the human's hand without the played card
      const hPrefix = `hand_${mySeat}_`;
      Object.keys(this.cardObjects).filter(k => k.startsWith(hPrefix))
        .forEach(k => { this.cardObjects[k].destroy(); delete this.cardObjects[k]; });
      this.rebuildHandExcluding(mySeat, card);

      this.tweens.add({
        targets: img,
        x: TRICK_POS[mySeat].x, y: TRICK_POS[mySeat].y,
        angle: 0, displayWidth: CARD_W, displayHeight: CARD_H,
        duration: 300, ease: 'Quad.easeOut',
        onComplete: () => {
          this.trickGroup.add(img);
          this.isAnimating = false;
          this.flushPending();
        },
      });

      sendAction('play', { card });
    }

    /** Re-layout a seat's hand from the current state, skipping one specific card.
     *  Used after the human plays so the fan closes up while the card animates out. */
    private rebuildHandExcluding(seat: number, excludeCard: string) {
      const faceUp = seat === mySeat;
      const isVert = seat === 1 || seat === 3;
      const pos = PLAYER_POS[seat];
      const hand = this.displayHand(seat).filter(c => c !== excludeCard);
      const overlap = seat === mySeat ? CARD_OVERLAP : BOT_OVERLAP;
      const span = (hand.length - 1) * overlap;

      hand.forEach((card, idx) => {
        const key = `hand_${seat}_${card}`;
        const offset = -span / 2 + idx * overlap;
        const tx = isVert ? pos.x : pos.x + offset;
        const ty = isVert ? pos.y + offset : pos.y;
        const angle = isVert ? 90 : 0;

        const img = this.add.image(tx, ty, faceUp ? card : 'back')
          .setDisplaySize(CARD_W, CARD_H).setAngle(angle).setDepth(idx + 1);
        this.cardObjects[key] = img;

        if (seat === mySeat) {
          img.setInteractive({ cursor: 'pointer' });
          img.on('pointerover', () => this.onHover(img, ty));
          img.on('pointerout',  () => this.onHoverOut(img, card, ty));
          img.on('pointerdown', () => this.onCardClick(card, img, ty));
        }
      });
    }

    // ── Legal plays (client-side mirror of server logic for highlighting) ─────

    private getLegalPlays(): string[] {
      const s = this.currentState!;
      const hand = s.hands[mySeat];
      if (s.trickCards.length === 0) {
        if (s.tricksInHand === 0) return hand.includes('2C') ? ['2C'] : hand;
        if (!s.heartsBroken) {
          const nh = hand.filter(c => c.slice(-1) !== 'H');
          return nh.length > 0 ? nh : hand;
        }
        return hand;
      }
      const ledSuit = s.trickLedSuit!;
      const inSuit = hand.filter(c => c.slice(-1) === ledSuit);
      return inSuit.length > 0 ? inSuit : hand;
    }

    private highlightLegalPlays() {
      const legal = this.getLegalPlays();
      const hand = this.displayHand(mySeat);
      hand.forEach(card => {
        const img = this.cardObjects[`hand_${mySeat}_${card}`];
        if (!img) return;
        if (legal.includes(card)) img.setAlpha(1).clearTint();
        else img.setAlpha(0.4).setTint(0x888888);
      });
    }

    // ── Pass phase UI ─────────────────────────────────────────────────────────

    private showPassPhase() {
      if (this.passIndicator) return; // already shown
      const s = this.currentState!;
      if (s.passSelections[mySeat] !== null) {
        this.showStatus('Waiting for others to pass…');
        return;
      }

      const DIR_LABELS: Record<string,string> = {
        left:'← Pass Left', right:'→ Pass Right', across:'↑ Pass Across', none:'No Pass',
      };
      this.showStatus(`${DIR_LABELS[s.passDirection] ?? ''}: select 3 cards  ·  Enter to confirm`);

      const btnBg = this.add.rectangle(W/2, H-30, 200, 38, 0x15803d)
        .setInteractive({ cursor:'pointer' }).setAlpha(0).setDepth(20).setStrokeStyle(1,0x4ade80);
      const btnTxt = this.add.text(W/2, H-30, 'Pass Cards  ↵', {
        fontSize:'16px', color:'#fff', fontFamily:'sans-serif',
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

      this.passIndicator = { btnBg, btnTxt };
      this.selectedPassCards.clear();

      const confirm = () => {
        if (this.selectedPassCards.size !== 3) return;
        sendAction('pass', { cards: [...this.selectedPassCards] });
        this.hidePassPhase();
        this.showStatus('Waiting for others to pass…');
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

    private hidePassPhase() {
      if (!this.passIndicator) return;
      this.passIndicator.btnBg?.destroy();
      this.passIndicator.btnTxt?.destroy();
      if (this.passIndicator.enterKey) {
        this.passIndicator.enterKey.removeAllListeners();
        this.input.keyboard?.removeKey(this.passIndicator.enterKey);
      }
      this.passIndicator = null;
      this.selectedPassCards.clear();
    }

    // ── Game over ─────────────────────────────────────────────────────────────

    private showGameOver() {
      const s = this.currentState!;
      const winner = s.playerNames[s.winnerSeat!];
      const pts = s.playerNames.map((n,i) => `${n}: ${s.gamePoints[i]} pts`).join('\n');
      const youWon = s.winnerSeat === mySeat;
      this.showModal(youWon ? '🎉 You Win!' : `${winner} Wins`, pts, 'Back to Lobby', () => {
        window.location.href = '/games/hearts/lobby';
      });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private destroyCards() {
      Object.values(this.cardObjects).forEach(o => o.destroy());
      this.cardObjects = {};
    }

    private showStatus(msg: string) { this.statusText.setText(msg).setVisible(true); }
    private hideStatus() { this.statusText.setVisible(false); }

    private showModal(title: string, body: string, btnLabel: string, onBtn: () => void) {
      this.hideModal();
      const bg = this.add.rectangle(W/2,H/2,W,H,0x000000,0.65).setDepth(50);
      const card = this.add.rectangle(W/2,H/2,440,300,0x1e3a2f).setStrokeStyle(2,0x4ade80).setDepth(51);
      const t = this.add.text(W/2,H/2-110,title,{fontSize:'28px',color:'#f87171',fontFamily:'Georgia, serif',fontStyle:'bold'}).setOrigin(0.5).setDepth(52);
      const b = this.add.text(W/2,H/2-30,body,{fontSize:'16px',color:'#d1fae5',fontFamily:'monospace',align:'center'}).setOrigin(0.5).setDepth(52);
      const btnBg = this.add.rectangle(W/2,H/2+100,180,44,0x16a34a).setInteractive({cursor:'pointer'}).setDepth(52);
      const btnTxt = this.add.text(W/2,H/2+100,btnLabel,{fontSize:'18px',color:'#fff',fontFamily:'sans-serif',fontStyle:'bold'}).setOrigin(0.5).setDepth(53);
      btnBg.on('pointerover',()=>btnBg.setFillStyle(0x22c55e));
      btnBg.on('pointerout', ()=>btnBg.setFillStyle(0x16a34a));
      btnBg.on('pointerdown', onBtn);
      this.modalGroup = [bg,card,t,b,btnBg,btnTxt];
      [card,t,b,btnBg,btnTxt].forEach(o=>{ o.setAlpha(0); this.tweens.add({targets:o,alpha:1,duration:300,delay:50}); });
    }
    private hideModal() { this.modalGroup.forEach(o=>o.destroy()); this.modalGroup=[]; }
  }
  return OnlineGameScene;
}

// ── React page ────────────────────────────────────────────────────────────────

export default function OnlineHeartsRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef  = useRef<any>(null);
  const phaserRef = useRef<any>(null);
  const scoreSubmittedRef = useRef(false);

  const { submit } = useSubmitScore();
  const client     = useScoresClient();

  const {
    roomStatus, mySeat, seats, isOwner, gameState, error,
    sendAction, startGame, starting,
  } = useRoomBootstrap<HeartsRoomState>({
    code:     (code as string) ?? '',
    gameSlug: 'hearts',
  });

  // Always-current ref so async Phaser callbacks see the latest gameState
  // without needing to re-run the init effect on every state change.
  const gameStateRef = useRef<HeartsRoomState | null>(null);
  gameStateRef.current = gameState;

  // ── Start Phaser once mySeat is known and we're in 'playing' state ─────────
  // gameState is intentionally NOT in the dep array — state updates are pushed
  // via the registry effect below.  Including it would destroy+recreate Phaser
  // on every card play.

  useEffect(() => {
    if (roomStatus !== 'playing' || mySeat === null || !containerRef.current) return;
    if (gameRef.current) return; // already started

    let cancelled = false;

    import('phaser').then(Phaser => {
      if (cancelled || gameRef.current || !containerRef.current) return;

      (window as any).Phaser = Phaser.default ?? Phaser;

      const PreloadScene     = makePreloadScene();
      const OnlineGameScene  = makeOnlineGameScene(mySeat, sendAction);

      const game = new (window as any).Phaser.Game({
        type: (window as any).Phaser.AUTO,
        width: W, height: H,
        parent: containerRef.current,
        backgroundColor: '#3D1F0A',
        scene: [PreloadScene, OnlineGameScene],
        scale: {
          mode: (window as any).Phaser.Scale.FIT,
          autoCenter: (window as any).Phaser.Scale.CENTER_BOTH,
        },
      });

      // Pre-store the latest known state so OnlineGameScene.create() can
      // read it immediately via registry.get('latestState'), regardless of
      // whether the Realtime state update arrived before or after this point.
      if (gameStateRef.current) {
        game.registry.set('latestState', gameStateRef.current);
      }
      phaserRef.current = game;
      if (!cancelled) gameRef.current = game;
    });

    // Only cancel the in-flight import; Phaser itself is destroyed on unmount.
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomStatus, mySeat]);

  // ── Destroy Phaser when the room page unmounts ────────────────────────────
  // Kept separate so it never fires mid-game (e.g. when gameState updates).

  useEffect(() => {
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current  = null;
      phaserRef.current = null;
    };
  }, []);

  // ── Push state into Phaser whenever it changes (Realtime updates) ────────────
  // Also keep registry.latestState current so that OnlineGameScene.create()
  // always has the latest state if it hasn't run yet.

  useEffect(() => {
    if (phaserRef.current && gameState) {
      phaserRef.current.registry.set('latestState', gameState);
      phaserRef.current.registry.events.emit('stateUpdate', gameState);
    }
  }, [gameState]);

  // ── Submit scores once when the game ends ─────────────────────────────────

  useEffect(() => {
    if (
      roomStatus !== 'done' ||
      mySeat === null ||
      !gameState ||
      scoreSubmittedRef.current
    ) return;

    scoreSubmittedRef.current = true;
    const won = gameState.winnerSeat === mySeat;
    const points = gameState.gamePoints[mySeat] ?? 0;

    if (won) {
      submit({ gameSlug: 'hearts', ladderSlug: 'global', primaryValue: 1 });
    }
    submit({ gameSlug: 'hearts', ladderSlug: 'avg-points', primaryValue: points });
    client.updatePlayerStats('hearts', { plays: 1, wins: won ? 1 : 0, losses: won ? 0 : 1 });
  }, [roomStatus, mySeat, gameState, submit, client]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (roomStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Connecting to room…</div>
      </div>
    );
  }

  if (roomStatus === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-xl">{error || 'Room not found'}</p>
        <button onClick={() => router.push('/games/hearts/lobby')}
          className="text-slate-400 hover:text-white underline">Back to lobby</button>
      </div>
    );
  }

  // Lobby view — waiting for players
  if (roomStatus === 'waiting') {
    return (
      <RoomLobby
        code={(code as string).toUpperCase()}
        seats={seats}
        mySeat={mySeat}
        maxSeats={4}
        isOwner={isOwner}
        starting={starting}
        onStart={startGame}
        error={error}
        icon="♥"
        title="Hearts Online"
        backPath="/games/hearts/lobby"
        onBack={() => router.push('/games/hearts/lobby')}
      />
    );
  }

  // Game view — Phaser canvas
  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 pt-4">
      <div className="relative w-full max-w-[1024px]">
        <div ref={containerRef} className="w-full aspect-[1024/640]" />

        {/* Deal Cards overlay — owner needs to initialise game state */}
        {roomStatus === 'playing' && !gameState && isOwner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 rounded">
            <p className="text-white text-lg font-semibold drop-shadow">All players are in. Ready to deal?</p>
            <button
              onClick={startGame}
              disabled={starting}
              className="px-8 py-3 rounded-lg text-white font-bold text-lg shadow-lg transition-all
                bg-green-700 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {starting ? 'Dealing…' : '🃏 Deal Cards'}
            </button>
          </div>
        )}

        {/* Non-owner waiting message */}
        {roomStatus === 'playing' && !gameState && !isOwner && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/70 text-base bg-black/50 rounded px-4 py-2">
              Waiting for host to deal cards…
            </p>
          </div>
        )}

        {/* Seat name tags */}
        {gameState && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
            {gameState.playerNames.map((name, i) => (
              <div key={i} className={`rounded px-3 py-1 text-xs font-mono flex items-center gap-2
                ${gameState.curSeat === i && gameState.phase === 'playing'
                  ? 'bg-green-700/90 text-white ring-1 ring-green-400'
                  : 'bg-black/60 text-slate-300'}`}>
                <span className="font-bold w-20 truncate">{name}{i === mySeat ? ' ★' : ''}</span>
                <span>{gameState.gamePoints[i]} pts</span>
                {gameState.handPoints[i] > 0 && (
                  <span className="text-red-400">+{gameState.handPoints[i]}</span>
                )}
              </div>
            ))}
            {gameState.heartsBroken && (
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
