"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function CarShotPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    import("phaser").then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      const W = 960;
      const H = 540;

      // ─── CAR DEFINITIONS ────────────────────────────────────────────────────
      const CAR_DEFS = [
        {
          id: "jeep1", label: "Bandit", tagline: "Built for chaos",
          previewKey: "jeep1_preview",
          folder: "Jeep_1",
          frameW: 192, frameH: 192, scale: 0.50,
          // bounding box of car within frame (original px)
          bodyOffX: 24, bodyOffY: 124, bodyW: 144, bodyH: 68,
          hasIdle: true,
          idleFrames: 4, rideFrames: 8, destroyedFrames: 11, damageFrames: 3, brakeFrames: 3,
        },
        {
          id: "jeep2", label: "Wrangler", tagline: "Tank of the ramp",
          previewKey: "jeep2_preview",
          folder: "Jeep_2",
          frameW: 256, frameH: 256, scale: 0.38,
          bodyOffX: 15, bodyOffY: 177, bodyW: 205, bodyH: 79,
          hasIdle: true,
          idleFrames: 3, rideFrames: 8, destroyedFrames: 10, damageFrames: 5, brakeFrames: 3,
        },
        {
          id: "passenger", label: "Cruiser", tagline: "Loaded for launch",
          previewKey: "passenger_preview",
          folder: "Passenger car",
          frameW: 192, frameH: 192, scale: 0.50,
          bodyOffX: 31, bodyOffY: 130, bodyW: 131, bodyH: 62,
          hasIdle: false,
          idleFrames: 0, rideFrames: 8, destroyedFrames: 10, damageFrames: 3, brakeFrames: 3,
        },
      ];

      // ─── LEVEL DEFINITIONS ───────────────────────────────────────────────────
      const LEVELS = [
        // {
        //   name: "Level 1 – Milk Run",
        //   structures: [
        //     { x: 660, y: 420, w: 40, h: 80 },
        //     { x: 710, y: 420, w: 40, h: 80 },
        //     { x: 685, y: 340, w: 80, h: 40 },
        //   ],
        //   wheels: [
        //     { x: 550, y: 300 }, { x: 620, y: 260 }, { x: 750, y: 200 },
        //     { x: 800, y: 310 }, { x: 850, y: 180 },
        //   ],
        //   landZone: { x: 820, w: 120 },
        // },
        // {
        //   name: "Level 2 – The Gap",
        //   structures: [
        //     { x: 680, y: 420, w: 30, h: 100 }, { x: 720, y: 420, w: 30, h: 100 },
        //     { x: 700, y: 320, w: 70, h: 30 },  { x: 700, y: 290, w: 50, h: 30 },
        //   ],
        //   wheels: [
        //     { x: 500, y: 280 }, { x: 570, y: 230 }, { x: 650, y: 190 },
        //     { x: 730, y: 170 }, { x: 810, y: 210 }, { x: 870, y: 270 },
        //   ],
        //   landZone: { x: 840, w: 110 },
        // },
        // {
        //   name: "Level 3 – Tower Smash",
        //   structures: [
        //     { x: 640, y: 420, w: 28, h: 120 }, { x: 676, y: 420, w: 28, h: 120 },
        //     { x: 712, y: 420, w: 28, h: 120 }, { x: 658, y: 300, w: 56, h: 28 },
        //     { x: 676, y: 272, w: 28, h: 28 },  { x: 748, y: 420, w: 28, h: 80 },
        //     { x: 748, y: 340, w: 28, h: 28 },
        //   ],
        //   wheels: [
        //     { x: 480, y: 250 }, { x: 560, y: 200 }, { x: 640, y: 170 },
        //     { x: 720, y: 150 }, { x: 800, y: 160 }, { x: 870, y: 200 }, { x: 920, y: 270 },
        //   ],
        //   landZone: { x: 860, w: 100 },
        // },
        // {
        //   name: "Level 4 – Pyramid",
        //   structures: [
        //     { x: 630, y: 420, w: 30, h: 90 }, { x: 668, y: 420, w: 30, h: 90 },
        //     { x: 706, y: 420, w: 30, h: 90 }, { x: 744, y: 420, w: 30, h: 90 },
        //     { x: 649, y: 330, w: 30, h: 90 }, { x: 687, y: 330, w: 30, h: 90 },
        //     { x: 725, y: 330, w: 30, h: 90 }, { x: 668, y: 240, w: 30, h: 90 },
        //     { x: 706, y: 240, w: 30, h: 90 }, { x: 687, y: 150, w: 30, h: 90 },
        //   ],
        //   wheels: [
        //     { x: 450, y: 220 }, { x: 530, y: 175 }, { x: 610, y: 145 },
        //     { x: 690, y: 120 }, { x: 770, y: 140 }, { x: 850, y: 175 }, { x: 920, y: 230 },
        //   ],
        //   landZone: { x: 880, w: 80 },
        // },
        // ── City levels (5–8) use real layered PNG backgrounds ──────────────
        {
          name: "Level 5 – Neon District",
          bgId: 1, bgVariant: "Night", layerCount: 5,
          groundColor: 0x1a0a2e, groundLine: 0x9900ff,
          neonPalette: [0x00e8ff, 0xff00cc, 0x9900ff, 0x00ff99],
          structures: [
            { x: 580, y: 420, w: 32, h: 150 }, { x: 580, y: 270, w: 64, h: 32 },
            { x: 700, y: 420, w: 32, h: 130 }, { x: 700, y: 290, w: 64, h: 32 },
            { x: 640, y: 258, w: 32, h: 28 },  { x: 640, y: 230, w: 32, h: 28 },
            { x: 780, y: 420, w: 28, h: 100 }, { x: 816, y: 420, w: 28, h: 120 },
            { x: 798, y: 300, w: 56, h: 28 },
          ],
          wheels: [
            { x: 420, y: 230 }, { x: 490, y: 180 }, { x: 570, y: 145 },
            { x: 650, y: 120 }, { x: 730, y: 135 }, { x: 810, y: 160 }, { x: 890, y: 200 },
          ],
          landZone: { x: 850, w: 100 },
        },
        {
          name: "Level 6 – Purple Heights",
          bgId: 2, bgVariant: "Night", layerCount: 5,
          groundColor: 0x160820, groundLine: 0x9966ff,
          neonPalette: [0xcc00ff, 0xff44aa, 0x8800ff, 0x44ffcc],
          structures: [
            // Left tower
            { x: 600, y: 420, w: 28, h: 200 }, { x: 600, y: 220, w: 90, h: 28 },
            // Right tower
            { x: 690, y: 420, w: 28, h: 180 },
            // Stacked crates on bridge
            { x: 645, y: 192, w: 28, h: 28 }, { x: 645, y: 164, w: 28, h: 28 },
            // Right cluster
            { x: 780, y: 420, w: 36, h: 110 }, { x: 824, y: 420, w: 36, h: 140 },
            { x: 802, y: 280, w: 72, h: 28 },
          ],
          wheels: [
            { x: 400, y: 210 }, { x: 470, y: 170 }, { x: 545, y: 135 },
            { x: 645, y: 105 }, { x: 730, y: 125 }, { x: 810, y: 155 }, { x: 890, y: 190 },
          ],
          landZone: { x: 860, w: 95 },
        },
        {
          name: "Level 7 – Blue Skyline",
          bgId: 3, bgVariant: "Night", layerCount: 5,
          groundColor: 0x0a1028, groundLine: 0x0088ff,
          neonPalette: [0x4488ff, 0x00ccff, 0x0088ff, 0x00ffee],
          structures: [
            // Staircase going up-right
            { x: 560, y: 420, w: 32, h: 60  }, { x: 600, y: 420, w: 32, h: 60  },
            { x: 560, y: 360, w: 64, h: 28  },
            { x: 640, y: 420, w: 32, h: 110 }, { x: 680, y: 420, w: 32, h: 110 },
            { x: 640, y: 310, w: 64, h: 28  },
            { x: 720, y: 420, w: 32, h: 170 }, { x: 760, y: 420, w: 32, h: 170 },
            { x: 720, y: 250, w: 64, h: 28  },
            { x: 740, y: 222, w: 28, h: 28  },
          ],
          wheels: [
            { x: 430, y: 240 }, { x: 500, y: 195 }, { x: 575, y: 160 },
            { x: 650, y: 130 }, { x: 720, y: 110 }, { x: 800, y: 130 }, { x: 880, y: 170 },
          ],
          landZone: { x: 860, w: 95 },
        },
        {
          name: "Level 8 – Desert Run",
          bgId: 4, bgVariant: "Day", layerCount: 5,
          groundColor: 0x2a1a08, groundLine: 0xcc8800,
          neonPalette: [0xffcc00, 0xff8800, 0xffaa44, 0xcc4400],
          structures: [
            // Wide arch: two pillars + cap
            { x: 610, y: 420, w: 30, h: 180 }, { x: 750, y: 420, w: 30, h: 180 },
            { x: 680, y: 240, w: 170, h: 30 },
            // Crates on top of arch
            { x: 650, y: 210, w: 30, h: 30 }, { x: 710, y: 210, w: 30, h: 30 },
            { x: 680, y: 180, w: 30, h: 30 },
            // Guard tower right
            { x: 830, y: 420, w: 28, h: 120 }, { x: 830, y: 300, w: 56, h: 28 },
          ],
          wheels: [
            { x: 410, y: 220 }, { x: 480, y: 175 }, { x: 560, y: 140 },
            { x: 680, y: 115 }, { x: 760, y: 135 }, { x: 840, y: 165 }, { x: 910, y: 210 },
          ],
          landZone: { x: 870, w: 90 },
        },
      ];

      // ════════════════════════════════════════════════════════════════════════
      //  SCENE 1 – Car Select
      // ════════════════════════════════════════════════════════════════════════
      class CarSelectScene extends Phaser.Scene {
        constructor() { super("CarSelect"); }

        preload() {
          // GUI assets — loaded here first so they're in the shared texture cache for GameScene too
          const GUI = "/car_shot/gui";
          const guiAssets: [string, string][] = [
            ["gui_mon1",    "1%20Monitor/1.png"],
            ["gui_mon2",    "1%20Monitor/2.png"],
            ["gui_mon3",    "1%20Monitor/3.png"],
            ["gui_mon4",    "1%20Monitor/4.png"],
            ["gui_mon7_2",  "1%20Monitor/7_2.png"],
            ["gui_buttons", "1%20Monitor/Buttons.png"],
            ["gui_buttons2","1%20Monitor/Buttons2.png"],
            ["gui_bulb",    "1%20Monitor/Bulb.png"],
            ["gui_osc",     "3%20Other/Oscilloscope_sine.png"],
            ["gui_granted", "3%20Other/Access_granted.png"],
            ["gui_denied",  "3%20Other/Access_denied.png"],
            ["gui_display", "3%20Other/Display.png"],
            ["gui_arrows",  "3%20Other/Arrows.png"],
          ];
          guiAssets.forEach(([key, file]) => {
            if (!this.textures.exists(key))
              this.load.image(key, `${GUI}/${file}`);
          });
          // Ring spritesheet: 544×136, 4 frames of 136×136 each
          if (!this.textures.exists("gui_ring"))
            this.load.spritesheet("gui_ring", `${GUI}/1%20Monitor/Ring136x136.png`, { frameWidth: 136, frameHeight: 136 });

          // Load the idle (or ride) spritesheet for every car so we can animate them
          CAR_DEFS.forEach((car) => {
            const folder = car.folder.replace(/ /g, "%20");

            // Primary sheet: Idle when available, otherwise Ride
            const sheet = car.hasIdle ? "Idle" : "Ride";
            const key   = `${car.id}_select`;
            if (!this.textures.exists(key)) {
              this.load.spritesheet(key, `/car_shot/cars/${folder}/${sheet}.png`, {
                frameWidth:  car.frameW,
                frameHeight: car.frameH,
              });
            }
          });
        }

        create() {
          const { width, height } = this.scale;

          const bg = this.add.graphics();
          bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x12122a, 0x12122a, 1);
          bg.fillRect(0, 0, width, height);

          // Decorative oscilloscope strips top & bottom
          const oscTop = this.add.image(width / 2, 12, "gui_osc").setScale(2.5, 1.2).setAlpha(0.35).setDepth(0);
          const oscBot = this.add.image(width / 2, height - 12, "gui_osc").setScale(2.5, 1.2).setAlpha(0.35).setDepth(0);
          void oscTop; void oscBot;

          this.add.text(width / 2, 52, "🚗  CAR SHOT", {
            fontSize: "42px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 6,
          }).setOrigin(0.5);

          this.add.text(width / 2, 104, "Choose your car", {
            fontSize: "20px", fontFamily: "Arial", color: "#00e8ff",
          }).setOrigin(0.5);

          // Create a looping anim for each car using its select sheet
          CAR_DEFS.forEach((car) => {
            const animKey = `${car.id}_select_anim`;
            if (!this.anims.exists(animKey)) {
              const frames = car.hasIdle ? car.idleFrames : car.rideFrames;
              this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(`${car.id}_select`, { start: 0, end: frames - 1 }),
                frameRate: 8,
                repeat: -1,
              });
            }
          });

          const cardW = 252, cardH = 230, gap = 24;
          const totalW = CAR_DEFS.length * (cardW + gap) - gap;
          const startX = (width - totalW) / 2;

          CAR_DEFS.forEach((car, i) => {
            const cx = startX + i * (cardW + gap) + cardW / 2;
            const cy = height / 2 + 8;

            // Monitor/2.png (262×202) used as the card frame, scaled to card dimensions
            const monFrame = this.add.image(cx, cy - 14, "gui_mon2")
              .setDisplaySize(cardW, 190).setOrigin(0.5, 0.5).setDepth(1);

            // Dark backing panel so the card area is opaque
            const backing = this.add.graphics().setDepth(0);
            backing.fillStyle(0x0a0a1e, 1);
            backing.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 4);

            // Animated car sprite – scale so car body ≈ 160 px wide
            const spriteScale = 160 / car.bodyW;
            const sprite = this.add.sprite(cx, cy - 28, `${car.id}_select`);
            sprite.setOrigin(0.5, 1.0).setScale(spriteScale).setDepth(2);
            sprite.play(`${car.id}_select_anim`);

            // Car label & tagline
            this.add.text(cx, cy + 82, car.label, {
              fontSize: "17px", fontFamily: "Arial Black, Arial", color: "#00e8ff",
            }).setOrigin(0.5).setDepth(2);
            this.add.text(cx, cy + 104, car.tagline, {
              fontSize: "11px", fontFamily: "Arial", color: "#9966ff",
            }).setOrigin(0.5).setDepth(2);

            // Invisible hit zone over whole card
            const hit = this.add.rectangle(cx, cy, cardW, cardH, 0xffffff, 0)
              .setInteractive({ cursor: "pointer" }).setDepth(3);
            hit.on("pointerover",  () => { monFrame.setTint(0x88ffee); sprite.setAlpha(1); });
            hit.on("pointerout",   () => { monFrame.clearTint();        sprite.setAlpha(0.85); });
            hit.on("pointerdown",  () => {
              this.registry.set("selectedCar", car);
              this.registry.set("currentLevel", 0);
              this.registry.set("totalWheels", 0);
              this.scene.start("Game");
            });
            sprite.setAlpha(0.85);
          });

          this.add.text(width / 2, height - 22, "Click & drag on the car to pull back → release to launch!", {
            fontSize: "13px", fontFamily: "Arial", color: "#334155",
          }).setOrigin(0.5);
        }
      }

      // ════════════════════════════════════════════════════════════════════════
      //  SCENE 2 – Game
      // ════════════════════════════════════════════════════════════════════════
      class GameScene extends Phaser.Scene {
        private car!: Phaser.Physics.Arcade.Sprite;
        private rampGraphics!: Phaser.GameObjects.Graphics;
        private aimLine!: Phaser.GameObjects.Graphics;
        private structures!: Phaser.Physics.Arcade.StaticGroup;
        private wheels!: Phaser.Physics.Arcade.StaticGroup;
        private ground!: Phaser.Physics.Arcade.StaticGroup;
        private particles!: Phaser.GameObjects.Graphics;
        private hud!: Phaser.GameObjects.Text;
        private levelText!: Phaser.GameObjects.Text;
        private powerBar!: Phaser.GameObjects.Graphics;

        private levelDef!: (typeof LEVELS)[0];
        private carDef!: (typeof CAR_DEFS)[0];
        private levelIdx!: number;
        private totalWheels!: number;
        private wheelsThisRun = 0;
        private launched = false;
        private wasDestroyed = false;
        private isDragging = false;
        private dragStart!: Phaser.Math.Vector2;
        private carStart!: Phaser.Math.Vector2;
        private landed = false;
        private landTimer = 0;
        private stuckTimer = 0;
        private retryBtn!: { g: Phaser.GameObjects.GameObject; txt: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Rectangle };

        constructor() { super("Game"); }

        // ── Preload ────────────────────────────────────────────────────────────
        preload() {
          // Car sprite sheets
          const car = this.registry.get("selectedCar") as typeof CAR_DEFS[0];
          const folder = car.folder.replace(/ /g, "%20");
          const sheetDefs: { name: string; frames: number }[] = [
            { name: "Ride",      frames: car.rideFrames },
            { name: "Destroyed", frames: car.destroyedFrames },
            { name: "Damage",    frames: car.damageFrames },
            { name: "Brake",     frames: car.brakeFrames },
          ];
          if (car.hasIdle) sheetDefs.unshift({ name: "Idle", frames: car.idleFrames });

          sheetDefs.forEach(({ name }) => {
            const key = `${car.id}_${name.toLowerCase()}`;
            if (!this.textures.exists(key)) {
              this.load.spritesheet(key, `/car_shot/cars/${folder}/${name}.png`, {
                frameWidth: car.frameW, frameHeight: car.frameH,
              });
            }
          });

          // Resolve levelDef here so it's available during preload (create() runs later)
          const levelIdx = this.registry.get("currentLevel") as number;
          this.levelDef = LEVELS[levelIdx % LEVELS.length];

          // City background layers
          const ld = this.levelDef as { bgId?: number; bgVariant?: string; layerCount?: number };
          if (ld.bgId && ld.layerCount) {
            for (let i = 1; i <= ld.layerCount; i++) {
              const key = `bg_${ld.bgId}_${ld.bgVariant}_${i}`;
              if (!this.textures.exists(key))
                this.load.image(key, `/car_shot/backgrounds/${ld.bgId}/${ld.bgVariant}/${i}.png`);
            }
          }

          // Preview sprites (needed if reloading scene)
          CAR_DEFS.forEach(c => {
            if (!this.textures.exists(c.previewKey))
              this.load.image(c.previewKey, `/sprites/${c.previewKey}.png`);
          });

          // Sign assets – billboards used for obstacles + ramp marker
          const signFiles: [string, string][] = [
            ["sign_22x40",    "2%20Billboard/22x40.png"],
            ["sign_22x40_2",  "2%20Billboard/22x40_2.png"],
            ["sign_64x64",    "2%20Billboard/64x64.png"],
            ["sign_64x64_2",  "2%20Billboard/64x64_2.png"],
            ["sign_128x64",   "2%20Billboard/128x64.png"],
            ["sign_128x64_2", "2%20Billboard/128x64_2.png"],
            ["sign_pillar",   "2%20Billboard/Pillar.png"],
            ["sign_pillar2",  "2%20Billboard/Pillar2.png"],
          ];
          signFiles.forEach(([key, file]) => {
            if (!this.textures.exists(key))
              this.load.image(key, `/car_shot/signs/${file}`);
          });
        }

        // ── Create ─────────────────────────────────────────────────────────────
        create() {
          this.launched = false;
          this.wasDestroyed = false;
          this.isDragging = false;
          this.landed = false;
          this.landTimer = 0;
          this.stuckTimer = 0;
          this.wheelsThisRun = 0;

          this.carDef = this.registry.get("selectedCar") as typeof CAR_DEFS[0];
          this.levelIdx = this.registry.get("currentLevel") as number;
          this.totalWheels = (this.registry.get("totalWheels") as number) || 0;
          this.levelDef = LEVELS[this.levelIdx % LEVELS.length];

          this.buildAnims();
          this.buildTextures();
          this.buildWorld();
          this.buildHUD();
          this.setupInput();
        }

        // ── Animations ─────────────────────────────────────────────────────────
        buildAnims() {
          const c = this.carDef;
          const mk = (key: string, sheet: string, frames: number, rate: number, repeat: number) => {
            const animKey = `${c.id}_${key}`;
            if (!this.anims.exists(animKey)) {
              this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(`${c.id}_${sheet}`, { start: 0, end: frames - 1 }),
                frameRate: rate,
                repeat,
              });
            }
          };
          if (c.hasIdle) mk("idle",      "idle",      c.idleFrames,      8,  -1);
          mk("ride",      "ride",      c.rideFrames,      12, -1);
          mk("destroyed", "destroyed", c.destroyedFrames, 14,  0);
          mk("damage",    "damage",    c.damageFrames,    10, -1);
          mk("brake",     "brake",     c.brakeFrames,      8,  0);
        }

        // ── Textures ───────────────────────────────────────────────────────────
        buildTextures() {
          if (!this.textures.exists("wheel")) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xf1c40f, 1); g.fillCircle(14, 14, 14);
            g.fillStyle(0xd4ac0d, 1); g.fillCircle(14, 14, 10);
            g.fillStyle(0xf1c40f, 1); g.fillCircle(14, 14, 6);
            g.fillStyle(0xffeaa7, 1); g.fillCircle(14, 14, 3);
            g.lineStyle(2, 0xd4ac0d, 1);
            for (let a = 0; a < 360; a += 60) {
              const rad = Phaser.Math.DegToRad(a);
              g.lineBetween(14, 14, 14 + Math.cos(rad) * 10, 14 + Math.sin(rad) * 10);
            }
            g.generateTexture("wheel", 28, 28); g.destroy();
          }
        }

        // ── World ──────────────────────────────────────────────────────────────
        buildWorld() {
          const { width, height } = this.scale;
          const ld = this.levelDef as { bgId?: number; groundColor?: number; groundLine?: number };
          const isCityLevel = !!ld.bgId;

          if (isCityLevel) {
            this.buildCityBg();
          } else {
            const bg = this.add.graphics();
            bg.fillGradientStyle(0x0f0f2a, 0x0f0f2a, 0x1a2a4a, 0x1a2a4a, 1);
            bg.fillRect(0, 0, width, height);
            for (let i = 0; i < 80; i++) {
              const x = Phaser.Math.Between(0, width);
              const y = Phaser.Math.Between(0, height * 0.7);
              bg.fillStyle(0xffffff, Math.random() * 0.6 + 0.2);
              bg.fillCircle(x, y, Math.random() * 1.5 + 0.5);
            }
          }

          // Ground
          this.ground = this.physics.add.staticGroup();
          const groundH = 40;
          const groundY = height - groundH / 2;
          const groundGfx = this.add.graphics();

          if (isCityLevel) {
            const gc = (ld.groundColor ?? 0x1a0a2e);
            const gl = (ld.groundLine ?? 0x9900ff);
            groundGfx.fillStyle(gc, 1);
            groundGfx.fillRect(0, height - groundH, width, groundH);
            groundGfx.lineStyle(2, gl, 0.9);
            groundGfx.lineBetween(0, height - groundH, width, height - groundH);
            groundGfx.lineStyle(1, 0x00e8ff, 0.4);
            for (let x = 0; x < width; x += 60)
              groundGfx.lineBetween(x, height - groundH + 20, x + 30, height - groundH + 20);
          } else {
            groundGfx.fillStyle(0x2d5016, 1);
            groundGfx.fillRect(0, height - groundH, width, groundH);
            groundGfx.fillStyle(0x8B6914, 1);
            groundGfx.fillRect(0, height - groundH, width, 8);
          }

          // Use staticImage + manually set body so Phaser 3.87 doesn't mis-size via display-scale
          const groundImg = this.physics.add.staticImage(width / 2, groundY, "__DEFAULT");
          groundImg.setVisible(false);
          const gsBody = groundImg.body as Phaser.Physics.Arcade.StaticBody;
          gsBody.position.x = 0;
          gsBody.position.y = height - groundH;
          gsBody.width     = width;
          gsBody.height    = groundH;
          gsBody.halfWidth  = width  / 2;
          gsBody.halfHeight = groundH / 2;
          gsBody.updateCenter();
          this.ground.add(groundImg);

          this.buildRamp(isCityLevel);

          this.structures = this.physics.add.staticGroup();
          this.buildStructures(isCityLevel);

          this.wheels = this.physics.add.staticGroup();
          this.buildWheels();

          // Landing zone
          const lz = this.levelDef.landZone;
          const lzGfx = this.add.graphics();
          const lzColor = isCityLevel ? 0x00ffcc : 0x00ff00;
          lzGfx.fillStyle(lzColor, 0.12);
          lzGfx.fillRect(lz.x, height - groundH - 60, lz.w, 60);
          lzGfx.lineStyle(2, lzColor, 0.5);
          lzGfx.strokeRect(lz.x, height - groundH - 60, lz.w, 60);
          this.add.text(lz.x + lz.w / 2, height - groundH - 30, "LAND HERE", {
            fontSize: "11px", fontFamily: "Arial",
            color: isCityLevel ? "#00ffcc" : "#00ff00",
          }).setOrigin(0.5).setAlpha(0.7);

          this.particles = this.add.graphics();
        }

        buildCityBg() {
          const { width, height } = this.scale;
          const ld = this.levelDef as { bgId: number; bgVariant: string; layerCount: number };
          for (let i = 1; i <= ld.layerCount; i++) {
            this.add.image(width / 2, height / 2, `bg_${ld.bgId}_${ld.bgVariant}_${i}`)
              .setDisplaySize(width, height);
          }
        }

        buildRamp(isCityLevel: boolean) {
          const { height } = this.scale;
          const groundH = 40;
          const rampBaseX = 80, rampTopX = 180;
          const rampBaseY = height - groundH;
          const rampTopY  = height - groundH - 140;

          const g = this.add.graphics();
          if (isCityLevel) {
            g.fillStyle(0x1e0a38, 1);
            g.fillTriangle(rampBaseX, rampBaseY, rampTopX, rampTopY, rampBaseX, rampTopY);
            g.fillRect(rampBaseX, rampTopY, rampTopX - rampBaseX, rampBaseY - rampTopY);
            g.lineStyle(3, 0x00e8ff, 1);
            g.lineBetween(rampBaseX, rampBaseY, rampTopX, rampTopY);
            g.fillStyle(0x2a0a4e, 1);
            g.fillRect(rampTopX, rampTopY, 30, 12);
            g.lineStyle(2, 0x9900ff, 1);
            g.strokeRect(rampTopX, rampTopY, 30, 12);
          } else {
            g.fillStyle(0x7f5539, 1);
            g.fillTriangle(rampBaseX, rampBaseY, rampTopX, rampTopY, rampBaseX, rampTopY);
            g.fillRect(rampBaseX, rampTopY, rampTopX - rampBaseX, rampBaseY - rampTopY);
            g.lineStyle(3, 0xd4a373, 1);
            g.lineBetween(rampBaseX, rampBaseY, rampTopX, rampTopY);
            g.fillStyle(0x7f5539, 1);
            g.fillRect(rampTopX, rampTopY, 30, 12);
          }
          this.rampGraphics = g;

          // Launch-marker sign standing at the ramp-top platform edge
          const markerSign = this.add.image(rampTopX + 38, rampTopY, "sign_22x40");
          markerSign.setOrigin(0.5, 1.0);   // bottom-center anchored to ramp surface
          markerSign.setScale(2.2);
          markerSign.setDepth(4);

          // Car sits with its bottom at the ramp top surface
          this.carStart = new Phaser.Math.Vector2(rampTopX + 15, rampTopY);
          this.aimLine = this.add.graphics();
        }

        buildStructures(_isCityLevel: boolean) {
          this.levelDef.structures.forEach((s, i) => {
            // Pick billboard sign based on aspect ratio; alternate variants by index
            const ratio   = s.w / s.h;
            const variant = i % 2 === 0 ? "" : "_2";
            let signKey: string;
            if      (ratio > 1.5) signKey = `sign_128x64${variant}`;
            else if (ratio < 0.6) signKey = `sign_22x40${variant}`;
            else                  signKey = `sign_64x64${variant}`;

            // Sign image centered on the structure, scaled to fill its bounds
            const signImg = this.add.image(s.x, s.y - s.h / 2, signKey);
            signImg.setOrigin(0.5, 0.5);
            signImg.setDisplaySize(s.w, s.h);
            signImg.setDepth(2);

            // Invisible physics body pinned exactly to structure bounds
            const body = this.physics.add.staticImage(s.x, s.y - s.h / 2, "__DEFAULT");
            body.setVisible(false);
            const sBody = body.body as Phaser.Physics.Arcade.StaticBody;
            sBody.position.x = s.x - s.w / 2;
            sBody.position.y = s.y - s.h;
            sBody.width      = s.w;
            sBody.height     = s.h;
            sBody.halfWidth  = s.w / 2;
            sBody.halfHeight = s.h / 2;
            sBody.updateCenter();
            body.setData("gfx", signImg);
            body.setData("sw",  s.w);
            body.setData("sh",  s.h);
            this.structures.add(body);
          });
        }

        destroyObstacle(body: Phaser.Physics.Arcade.Image) {
          if (!body.active) return;
          body.setActive(false);
          (body.body as Phaser.Physics.Arcade.StaticBody).enable = false;

          // gfx is now a center-origin Image (origin 0.5, 0.5)
          const gfx = body.getData("gfx") as Phaser.GameObjects.Image;
          const sw  = body.getData("sw")  as number;
          const sh  = body.getData("sh")  as number;

          // White flash overlay — offset to top-left since gfx.x/y is center
          const flash = this.add.graphics();
          flash.fillStyle(0xffffff, 0.8);
          flash.fillRect(gfx.x - sw / 2, gfx.y - sh / 2, sw, sh);
          this.time.delayedCall(60, () => flash.destroy());

          // Shake then fly up & fade
          this.tweens.add({
            targets: gfx,
            x: { value: gfx.x + Phaser.Math.Between(-6, 6) },
            duration: 40, yoyo: true, repeat: 3,
            onComplete: () => {
              this.tweens.add({
                targets: gfx,
                y: gfx.y - sh * 0.8,
                angle: Phaser.Math.Between(-45, 45),
                alpha: 0,
                duration: 400,
                ease: "Power2",
                onComplete: () => gfx.destroy(),
              });
            },
          });

          // Scatter fragments — cx/cy is already the image center
          const cx = gfx.x, cy = gfx.y;
          const fragColor = 0xf1c40f;
          for (let f = 0; f < 5; f++) {
            const frag = this.add.graphics();
            frag.fillStyle(fragColor, 1);
            const fs = Phaser.Math.Between(5, 12);
            frag.fillRect(-fs / 2, -fs / 2, fs, fs);
            frag.x = cx + Phaser.Math.Between(-sw / 3, sw / 3);
            frag.y = cy + Phaser.Math.Between(-sh / 3, sh / 3);
            this.tweens.add({
              targets: frag,
              x: frag.x + Phaser.Math.Between(-120, 120),
              y: frag.y + Phaser.Math.Between(-150, 50),
              angle: Phaser.Math.Between(-360, 360),
              alpha: 0,
              duration: Phaser.Math.Between(400, 700),
              ease: "Power2",
              onComplete: () => frag.destroy(),
            });
          }
        }

        buildWheels() {
          this.levelDef.wheels.forEach((w) => {
            const halo = this.add.graphics();
            halo.fillStyle(0xf1c40f, 0.15);
            halo.fillCircle(w.x, w.y, 22);
            const img = this.physics.add.staticImage(w.x, w.y, "wheel");
            this.wheels.add(img);
            this.tweens.add({ targets: img, angle: 360, duration: 2000, repeat: -1 });
            this.tweens.add({ targets: img, y: w.y - 6, duration: 1000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          });
        }

        buildHUD() {
          const { width } = this.scale;

          // Level name centred at top
          this.levelText = this.add.text(width / 2, 18, this.levelDef.name, {
            fontSize: "18px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 4,
          }).setOrigin(0.5, 0).setDepth(10);

          // GUI monitor panel behind the wheel counter + power bar (top-left)
          this.add.image(100, 52, "gui_mon7_2")
            .setDisplaySize(196, 64).setOrigin(0.5, 0.5).setDepth(9).setAlpha(0.85);

          this.hud = this.add.text(14, 12, this.getHudText(), {
            fontSize: "15px", fontFamily: "Arial Black, Arial", color: "#00e8ff",
            stroke: "#000", strokeThickness: 3,
          }).setDepth(10);

          // Power bar track inside the panel
          const barG = this.add.graphics().setDepth(10);
          barG.fillStyle(0x050518, 0.9);
          barG.fillRect(14, 50, 154, 16);
          barG.lineStyle(1, 0x00e8ff, 0.5);
          barG.strokeRect(14, 50, 154, 16);
          this.powerBar = this.add.graphics().setDepth(10);
          this.add.text(14, 68, "POWER", {
            fontSize: "9px", fontFamily: "Arial", color: "#00e8ff",
          }).setDepth(10);

          this.add.text(width - 16, 16, "Drag car to aim & charge\nRelease to launch!", {
            fontSize: "13px", fontFamily: "Arial", color: "#00e8ff", align: "right",
          }).setOrigin(1, 0).setDepth(10);

          // Persistent retry button — uses Buttons.png as the background image
          const bw = 110, bh = 38, bx = width - 16 - 55, by = 70;
          const bg2 = this.add.image(bx, by, "gui_buttons")
            .setDisplaySize(bw, bh).setOrigin(0.5, 0.5).setDepth(10);
          const btxt = this.add.text(bx, by, "↺  Retry  [R]", {
            fontSize: "11px", fontFamily: "Arial Black, Arial", color: "#00ffcc",
          }).setOrigin(0.5).setDepth(11);
          const bhit = this.add.rectangle(bx, by, bw, bh, 0xffffff, 0)
            .setInteractive({ cursor: "pointer" }).setDepth(12);
          bhit.on("pointerover", () => { bg2.setTint(0x88ffee); btxt.setColor("#ffffff"); });
          bhit.on("pointerout",  () => { bg2.clearTint();       btxt.setColor("#00ffcc"); });
          bhit.on("pointerdown", () => { this.registry.set("totalWheels", this.totalWheels); this.scene.restart(); });
          this.retryBtn = { g: bg2, txt: btxt, hit: bhit };

          this.input.keyboard!.on("keydown-R", () => {
            if (this.landed) return;
            this.registry.set("totalWheels", this.totalWheels);
            this.scene.restart();
          });
        }

        getHudText() { return `🏆 ${this.totalWheels + this.wheelsThisRun} wheels`; }

        // ── Input & Car setup ─────────────────────────────────────────────────
        setupInput() {
          const c = this.carDef;
          const initKey = c.hasIdle ? `${c.id}_idle` : `${c.id}_ride`;

          // Sprite with bottom-center origin so car sits neatly on ramp
          this.car = this.physics.add.sprite(this.carStart.x, this.carStart.y, initKey);
          this.car.setOrigin(0.5, 1.0);
          this.car.setScale(c.scale);
          this.car.setDepth(5);
          (this.car.body as Phaser.Physics.Arcade.Body).enable = false;

          // Physics body matches actual car bounds within the frame
          const s = c.scale;
          const bw = c.bodyW * s, bh = c.bodyH * s;
          const ox = c.bodyOffX * s, oy = c.bodyOffY * s;
          (this.car.body as Phaser.Physics.Arcade.Body).setSize(bw, bh);
          (this.car.body as Phaser.Physics.Arcade.Body).setOffset(ox, oy);

          // Play idle (or first ride frame) while on ramp
          if (c.hasIdle) {
            this.car.play(`${c.id}_idle`);
          } else {
            this.car.setFrame(0);
          }

          this.input.on("pointerdown", this.onDown, this);
          this.input.on("pointermove", this.onMove, this);
          this.input.on("pointerup",   this.onUp,   this);
        }

        onDown(pointer: Phaser.Input.Pointer) {
          if (this.launched) return;
          // Detection center is visual center of car, not sprite anchor (which is bottom)
          const carVisualCenterY = this.car.y - this.carDef.frameH * this.carDef.scale / 2;
          const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.car.x, carVisualCenterY);
          if (dist < 80) {
            this.isDragging = true;
            this.dragStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
          }
        }

        onMove(pointer: Phaser.Input.Pointer) {
          if (!this.isDragging || this.launched) return;
          const pullVec = new Phaser.Math.Vector2(pointer.x - this.dragStart.x, pointer.y - this.dragStart.y);
          const maxPull = 180;
          const pullLen = Math.min(pullVec.length(), maxPull);
          const power = pullLen / maxPull;

          this.aimLine.clear();
          const launchDir = pullVec.clone().negate().normalize();
          const carCY = this.car.y - this.carDef.frameH * this.carDef.scale / 2;
          const steps = 8;
          this.aimLine.lineStyle(2, 0xffffff, 0.4);
          for (let i = 0; i < steps; i++) {
            if (i % 2 === 0) {
              const t0 = i / steps * pullLen * 1.5, t1 = (i + 0.7) / steps * pullLen * 1.5;
              this.aimLine.lineBetween(
                this.car.x + launchDir.x * t0, carCY + launchDir.y * t0,
                this.car.x + launchDir.x * t1, carCY + launchDir.y * t1,
              );
            }
          }
          const lineEnd = new Phaser.Math.Vector2(this.car.x + launchDir.x * pullLen * 1.5, carCY + launchDir.y * pullLen * 1.5);
          this.aimLine.fillStyle(0xffffff, 0.6);
          this.aimLine.fillTriangle(
            lineEnd.x, lineEnd.y,
            lineEnd.x - launchDir.x * 12 + launchDir.y * 6, lineEnd.y - launchDir.y * 12 - launchDir.x * 6,
            lineEnd.x - launchDir.x * 12 - launchDir.y * 6, lineEnd.y - launchDir.y * 12 + launchDir.x * 6,
          );

          const barColor = power < 0.4 ? 0x22c55e : power < 0.75 ? 0xf59e0b : 0xef4444;
          this.powerBar.clear();
          this.powerBar.fillStyle(barColor, 1);
          this.powerBar.fillRoundedRect(15, 51, Math.round(152 * power), 16, 3);

          this.car.setPosition(this.carStart.x + launchDir.x * -8, this.carStart.y + launchDir.y * -8);
        }

        onUp(pointer: Phaser.Input.Pointer) {
          if (!this.isDragging || this.launched) return;
          this.isDragging = false;
          this.aimLine.clear();
          this.powerBar.clear();

          const pullVec = new Phaser.Math.Vector2(pointer.x - this.dragStart.x, pointer.y - this.dragStart.y);
          const pullLen = Math.min(pullVec.length(), 180);
          if (pullLen < 10) return;

          const power = pullLen / 180;
          const launchDir = pullVec.clone().negate().normalize();

          this.launched = true;
          this.car.setPosition(this.carStart.x, this.carStart.y);
          const body = this.car.body as Phaser.Physics.Arcade.Body;
          body.enable = true;
          this.physics.world.enable(this.car);

          const vx = launchDir.x * 1400 * power;
          const vy = launchDir.y * 1400 * power;
          this.car.setVelocity(vx, vy);
          body.setGravityY(600);
          body.setCollideWorldBounds(false);

          // Switch to ride animation while flying
          this.car.play(`${this.carDef.id}_ride`);

          this.physics.add.collider(this.car, this.ground,     this.onLand,         undefined, this);
          this.physics.add.collider(this.car, this.structures, this.onHitStructure,  undefined, this);
          this.physics.add.overlap(this.car,  this.wheels,     this.onCollectWheel,  undefined, this);
        }

        onLand() {
          if (this.landed || this.wasDestroyed) return;
          this.landed = true;
          const lz = this.levelDef.landZone;
          const inZone = this.car.x >= lz.x && this.car.x <= lz.x + lz.w;

          // Play brake animation on landing
          this.car.play(`${this.carDef.id}_brake`);
          this.car.setAngle(0);

          this.time.delayedCall(800, () => this.showResult(inZone));
        }

        onHitStructure(_car: unknown, structure: unknown) {
          const s = structure as Phaser.Physics.Arcade.Image;

          // Destroy the obstacle (visual + physics removal)
          this.destroyObstacle(s);

          // Slow the car slightly on each impact
          const carBody = this.car.body as Phaser.Physics.Arcade.Body;
          carBody.setVelocity(carBody.velocity.x * 0.7, carBody.velocity.y * 0.7);

          // Play damage anim briefly on the car, then return to ride
          if (!this.wasDestroyed) {
            this.car.play(`${this.carDef.id}_damage`);
            this.time.delayedCall(400, () => {
              if (!this.wasDestroyed && !this.landed)
                this.car.play(`${this.carDef.id}_ride`);
            });
          }

          // If car is going too slow after impact, treat it as a crash
          if (carBody.speed < 80 && !this.wasDestroyed) {
            this.wasDestroyed = true;
            this.car.play(`${this.carDef.id}_destroyed`);
            this.car.setAngularVelocity(0);
            this.car.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              if (!this.landed) {
                this.landed = true;
                this.time.delayedCall(300, () => this.showResult(false));
              }
            });
          }
        }

        onCollectWheel(_car: unknown, wheel: unknown) {
          const w = wheel as Phaser.Physics.Arcade.Image;
          if (!w.active) return;
          w.setActive(false).setVisible(false);
          this.wheelsThisRun++;
          this.hud.setText(this.getHudText());
          this.spawnSparkle(w.x, w.y);
        }

        spawnSparkle(x: number, y: number) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const star = this.add.graphics();
            star.fillStyle(0xf1c40f, 1);
            star.fillCircle(x, y, 5);
            this.tweens.add({
              targets: star, x: x + Math.cos(angle) * 40, y: y + Math.sin(angle) * 40,
              alpha: 0, scaleX: 0, scaleY: 0, duration: 500, ease: "Power2",
              onComplete: () => star.destroy(),
            });
          }
          const txt = this.add.text(x, y - 20, "+1 🏆", {
            fontSize: "18px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: txt, y: y - 60, alpha: 0, duration: 800, ease: "Power2",
            onComplete: () => txt.destroy(),
          });
        }

        spawnDebris(x: number, y: number) {
          for (let i = 0; i < 8; i++) {
            const d = this.add.graphics();
            d.fillStyle(0x8B6914, 1);
            d.fillRect(-5, -5, 10, 10);
            d.x = x; d.y = y;
            this.tweens.add({
              targets: d,
              x: x + Phaser.Math.Between(-140, 140),
              y: y + Phaser.Math.Between(-220, -50) + 100,
              angle: Phaser.Math.Between(-360, 360),
              alpha: 0, duration: 750, ease: "Power2",
              onComplete: () => d.destroy(),
            });
          }
        }

        showResult(inZone: boolean) {
          const { width, height } = this.scale;
          const cx = width / 2, cy = height / 2;

          // Dark overlay
          const overlay = this.add.graphics().setDepth(30);
          overlay.fillStyle(0x000000, 0.72);
          overlay.fillRect(0, 0, width, height);

          // Monitor/3.png (312×255) as panel frame, scaled to 400×280
          this.add.image(cx, cy, "gui_mon3")
            .setDisplaySize(400, 280).setOrigin(0.5, 0.5).setDepth(31);

          // Access_granted / Access_denied badge – scaled 2× and placed near top of panel
          const badgeKey = inZone ? "gui_granted" : "gui_denied";
          this.add.image(cx, cy - 98, badgeKey)
            .setScale(2).setOrigin(0.5, 0.5).setDepth(32);

          // Result title
          const title = inZone
            ? (this.wheelsThisRun > 0 ? "🏆 Perfect Landing!" : "✅ Landed!")
            : "💥 Missed!";
          this.add.text(cx, cy - 60, title, {
            fontSize: "24px", fontFamily: "Arial Black, Arial",
            color: inZone ? "#00e8ff" : "#ff4466", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setDepth(32);

          this.add.text(cx, cy - 26, `Golden wheels: ${this.wheelsThisRun}`, {
            fontSize: "16px", fontFamily: "Arial", color: "#f1c40f",
          }).setOrigin(0.5).setDepth(32);

          this.add.text(cx, cy - 4, `Total: ${this.totalWheels + this.wheelsThisRun} 🏆`, {
            fontSize: "14px", fontFamily: "Arial", color: "#9966ff",
          }).setOrigin(0.5).setDepth(32);

          const nextLevel = this.levelIdx < LEVELS.length - 1;
          const btnY = cy + 48;

          if (inZone && nextLevel) {
            this.makeButton(cx - 90, btnY, "Next Level →", 0x6366f1, () => {
              this.registry.set("currentLevel", this.levelIdx + 1);
              this.registry.set("totalWheels", this.totalWheels + this.wheelsThisRun);
              this.scene.restart();
            });
            this.makeButton(cx + 90, btnY, "↺ Retry", 0x475569, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.scene.restart();
            });
          } else {
            this.makeButton(cx, btnY, "↺ Retry", 0x475569, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.scene.restart();
            });
          }

          this.makeButton(cx, btnY + 50, "Change Car", 0x334155, () => {
            this.scene.start("CarSelect");
          });
        }

        makeButton(x: number, y: number, label: string, _color: number, cb: () => void) {
          const bw = 160, bh = 42;
          const btnImg = this.add.image(x, y, "gui_buttons")
            .setDisplaySize(bw, bh).setOrigin(0.5, 0.5).setDepth(32);
          this.add.text(x, y, label, {
            fontSize: "13px", fontFamily: "Arial Black, Arial", color: "#00ffcc",
            stroke: "#000", strokeThickness: 2,
          }).setOrigin(0.5).setDepth(33);
          const hit = this.add.rectangle(x, y, bw, bh, 0xffffff, 0)
            .setInteractive({ cursor: "pointer" }).setDepth(34);
          hit.on("pointerover", () => btnImg.setTint(0x88ffee));
          hit.on("pointerout",  () => btnImg.clearTint());
          hit.on("pointerdown", cb);
        }

        update(_time: number, delta: number) {
          if (this.launched && !this.landed) {
            const body = this.car.body as Phaser.Physics.Arcade.Body;

            // Rotate car to match velocity direction only while not destroyed
            if (!this.wasDestroyed) {
              const angle = Math.atan2(body.velocity.y, body.velocity.x) * (180 / Math.PI);
              this.car.setAngle(angle);
            }

            // Out of bounds fallback
            if (this.car.y > this.scale.height + 100 || this.car.x > this.scale.width + 100) {
              if (!this.landed) {
                this.landed = true;
                this.time.delayedCall(200, () => this.showResult(false));
              }
            }

            this.landTimer += delta;

            // Stuck detection: low speed for 2.5s after first second of flight
            if (this.landTimer > 1000 && !this.wasDestroyed) {
              if (body.speed < 20) {
                this.stuckTimer += delta;
                if (this.stuckTimer >= 2500) {
                  this.landed = true;
                  const { width, height } = this.scale;
                  const flash = this.add.text(width / 2, height / 2 - 20, "⚠️ Stuck!", {
                    fontSize: "28px", fontFamily: "Arial Black, Arial",
                    color: "#f59e0b", stroke: "#000", strokeThickness: 5,
                  }).setOrigin(0.5).setDepth(50);
                  this.time.delayedCall(700, () => { flash.destroy(); this.showResult(false); });
                }
              } else {
                this.stuckTimer = 0;
              }
            }
          }
        }
      }

      // ─── Boot ─────────────────────────────────────────────────────────────────
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: W, height: H,
        backgroundColor: "#0f0f2a",
        parent: containerRef.current!,
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 500 }, debug: false },
        },
        scene: [CarSelectScene, GameScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      };

      gameRef.current = new Phaser.Game(config);
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f2a] flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-4 w-full">
        <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Back to games
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div
          ref={containerRef}
          className="w-full max-w-[960px] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
        />
      </div>
    </div>
  );
}
