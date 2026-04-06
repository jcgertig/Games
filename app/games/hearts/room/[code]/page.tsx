'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';
import type { HeartsRoomState } from '@/app/api/hearts/_game';

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

// ── Supabase browser client ───────────────────────────────────────────────────

function makeBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

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

function makeOnlineGameScene(mySeat: number, sendAction: (type: 'play' | 'pass', payload: any) => Promise<void>) {
  class OnlineGameScene extends (window as any).Phaser.Scene {
    private currentState: HeartsRoomState | null = null;
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
      // Listen for state updates pushed from the React component
      this.registry.events.on('stateUpdate', (state: HeartsRoomState) => {
        this.onStateUpdate(state);
      });
      // Show waiting message until first state arrives
      this.showStatus('Waiting for game to start…');
    }

    // ── Table ────────────────────────────────────────────────────────────────

    private drawTable() {
      this.add.rectangle(W/2, H/2, W, H, FELT_COLOR);
      const g = this.add.graphics();
      g.fillStyle(FELT_DARK, 0.5); g.fillEllipse(W/2, H/2, 580, 400);
      ['','','',''].forEach((_, i) => {
        const pos = PLAYER_POS[i];
        const off = [{ x:0,y:-70 },{ x:55,y:0 },{ x:0,y:70 },{ x:-55,y:0 }][i];
        this.scoreTexts.push(this.add.text(pos.x+off.x, pos.y+off.y, '0 pts', {
          fontSize:'13px', color:'#fde68a', fontFamily:'sans-serif',
        }).setOrigin(0.5));
      });
      this.statusText = this.add.text(W/2, H/2, '', {
        fontSize:'18px', color:'#fff', fontFamily:'sans-serif',
        backgroundColor:'#00000088', padding:{ x:12, y:6 },
      }).setOrigin(0.5).setDepth(10).setVisible(false);
      const tg = this.add.graphics();
      tg.lineStyle(1, 0x4ade80, 0.2); tg.strokeEllipse(W/2, H/2, 340, 240);
      this.trickGroup = this.add.group();
    }

    // ── State update ─────────────────────────────────────────────────────────

    private onStateUpdate(state: HeartsRoomState) {
      this.currentState = state;
      this.redraw();
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
          .setDisplaySize(CARD_W, CARD_H).setAngle(0).setDepth(20);
        this.trickGroup.add(img);
      });

      s.playerNames.forEach((name, i) => {
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

    private layoutHand(seat: number) {
      const faceUp = seat === mySeat;
      const isVert = seat === 1 || seat === 3;
      const pos = PLAYER_POS[seat];
      const hand = this.displayHand(seat);
      const overlap = seat === mySeat ? CARD_OVERLAP : BOT_OVERLAP;
      const span = (hand.length - 1) * overlap;

      hand.forEach((card, idx) => {
        const key = `hand_${seat}_${card}`;
        const offset = -span/2 + idx*overlap;
        const tx = isVert ? pos.x : pos.x + offset;
        const ty = isVert ? pos.y + offset : pos.y;
        const angle = isVert ? 90 : 0;

        const img = this.add.image(tx, ty, faceUp ? card : 'back')
          .setDisplaySize(CARD_W, CARD_H).setAngle(angle).setDepth(idx+1);
        this.cardObjects[key] = img;

        if (seat === mySeat) {
          img.setInteractive({ cursor:'pointer' });
          img.on('pointerover', () => this.onHover(img, ty));
          img.on('pointerout',  () => this.onHoverOut(img, card, ty));
          img.on('pointerdown', () => this.onCardClick(card, img, ty));
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
      // Optimistic: dim card, then send to server
      img.setAlpha(0.4);
      sendAction('play', { card });
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

type RoomStatus = 'loading' | 'waiting' | 'playing' | 'done' | 'error';

interface SeatInfo {
  seat: number;
  display_name: string;
  is_bot: boolean;
  user_id: string | null;
}

export default function OnlineHeartsRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const scoresClient = useScoresClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const phaserRef = useRef<any>(null);

  const [roomStatus, setRoomStatus] = useState<RoomStatus>('loading');
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [gameState, setGameState] = useState<HeartsRoomState | null>(null);

  const supabase = useRef(makeBrowserClient());

  // Get current user session token
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.current.auth.getSession();
    if (session) return session.access_token;
    // Fall back to scores client session
    const sc = scoresClient.getSupabaseClient();
    const { data: { session: s2 } } = await sc.auth.refreshSession();
    return s2?.access_token ?? null;
  }, [scoresClient]);

  // Send an action to the API
  const sendAction = useCallback(async (type: 'play' | 'pass', payload: any) => {
    const token = await getToken();
    if (!token) return;
    const url = `/api/hearts/rooms/${code}/${type}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  }, [code, getToken]);

  // ── Bootstrap: join room, fetch initial state, subscribe to Realtime ─────

  useEffect(() => {
    if (!code) return;
    const upperCode = (code as string).toUpperCase();
    let channel: any;
    let cancelled = false;

    (async () => {
      // Ensure session is active
      const token = await getToken();

      // Join the room (idempotent if already seated)
      if (token) {
        const joinRes = await fetch(`/api/hearts/rooms/${upperCode}/join`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const joinJson = await joinRes.json();
        if (!cancelled && joinRes.ok) setMySeat(joinJson.yourSeat ?? null);
      }

      // Fetch room + seats directly from Supabase
      const { data: room } = await supabase.current
        .from('hearts_rooms')
        .select('id, status, owner_id, hearts_seats(*), hearts_game_state(state)')
        .eq('code', upperCode)
        .maybeSingle();

      if (cancelled) return;
      if (!room) { setError('Room not found'); setRoomStatus('error'); return; }

      const currentUser = (await supabase.current.auth.getUser()).data.user;
      setIsOwner(room.owner_id === currentUser?.id);
      setSeats((room as any).hearts_seats ?? []);
      setRoomStatus(room.status as RoomStatus);

      const state = (room as any).hearts_game_state?.[0]?.state ?? null;
      if (state) setGameState(state);

      // ── Realtime subscription ────────────────────────────────────────────
      channel = supabase.current
        .channel(`hearts:${room.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'hearts_game_state', filter: `room_id=eq.${room.id}` },
          (payload: any) => {
            if (cancelled) return;
            const newState: HeartsRoomState = payload.new.state;
            setGameState(newState);
            setRoomStatus(newState.phase === 'game_over' ? 'done' : 'playing');
            // Push into Phaser scene if it's running
            if (phaserRef.current) {
              phaserRef.current.registry.events.emit('stateUpdate', newState);
            }
          },
        )
        .subscribe();

      // Also watch room status changes (e.g. someone starts the game)
      supabase.current
        .channel(`hearts-room:${room.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'hearts_rooms', filter: `id=eq.${room.id}` },
          (payload: any) => {
            if (cancelled) return;
            setRoomStatus(payload.new.status as RoomStatus);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [code, getToken]);

  // ── Start Phaser once mySeat is known and we're in 'playing' state ─────────

  useEffect(() => {
    if (roomStatus !== 'playing' || mySeat === null || !containerRef.current) return;
    if (gameRef.current) return; // already started
    if (!gameState) return;

    let cancelled = false;

    import('phaser').then(Phaser => {
      if (cancelled || gameRef.current || !containerRef.current) return;

      (window as any).Phaser = Phaser.default ?? Phaser;

      const PreloadScene = makePreloadScene();
      const OnlineGameScene = makeOnlineGameScene(mySeat, sendAction);

      const game = new (window as any).Phaser.Game({
        type: (window as any).Phaser.AUTO,
        width: W, height: H,
        parent: containerRef.current,
        backgroundColor: '#000000',
        scene: [PreloadScene, OnlineGameScene],
        scale: {
          mode: (window as any).Phaser.Scale.FIT,
          autoCenter: (window as any).Phaser.Scale.CENTER_BOTH,
        },
      });

      // Wait for OnlineGame scene to be ready, then send initial state
      game.events.on('ready', () => {
        if (gameState) {
          game.registry.events.emit('stateUpdate', gameState);
        }
      });

      phaserRef.current = game;
      if (!cancelled) gameRef.current = game;
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      phaserRef.current = null;
    };
  }, [roomStatus, mySeat, gameState, sendAction]);

  // ── Trigger delayed state push once Phaser is ready ───────────────────────

  useEffect(() => {
    if (!phaserRef.current || !gameState) return;
    // Small delay to let Phaser scene init
    const t = setTimeout(() => {
      phaserRef.current?.registry.events.emit('stateUpdate', gameState);
    }, 500);
    return () => clearTimeout(t);
  }, [phaserRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start game (host only) ─────────────────────────────────────────────────

  async function startGame() {
    setStarting(true);
    const token = await getToken();
    if (!token) { setError('Not signed in'); setStarting(false); return; }
    const res = await fetch(`/api/hearts/rooms/${(code as string).toUpperCase()}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to start'); }
    setStarting(false);
  }

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <div className="text-5xl mb-2">♥</div>
          <h1 className="text-3xl font-bold text-red-400 font-serif">Room {(code as string).toUpperCase()}</h1>
          <p className="text-slate-400 mt-1">Share this code with friends to join</p>
        </div>

        {/* Seat list */}
        <div className="w-full max-w-sm flex flex-col gap-2">
          {[0,1,2,3].map(s => {
            const seat = seats.find(x => x.seat === s);
            const isMe = s === mySeat;
            return (
              <div key={s} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                isMe ? 'bg-green-900/40 border-green-600' : 'bg-slate-800 border-slate-700'
              }`}>
                <span className="text-slate-500 w-6">#{s}</span>
                {seat ? (
                  <>
                    <span className="text-white font-medium flex-1">{seat.display_name}</span>
                    {seat.is_bot
                      ? <span className="text-xs text-slate-500">Bot</span>
                      : <span className="text-xs text-green-400">Ready</span>
                    }
                    {isMe && <span className="text-xs text-green-400 font-bold">YOU</span>}
                  </>
                ) : (
                  <span className="text-slate-500 italic flex-1">Empty</span>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {isOwner ? (
          <button
            onClick={startGame}
            disabled={starting}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <p className="text-slate-400 text-sm animate-pulse">Waiting for host to start…</p>
        )}
      </div>
    );
  }

  // Game view — Phaser canvas
  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 pt-4">
      <div className="relative w-full max-w-[1024px]">
        <div ref={containerRef} className="w-full aspect-[1024/640]" />

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
