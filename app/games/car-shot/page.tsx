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
        {
          name: "Level 1 – Milk Run",
          structures: [
            { x: 660, y: 420, w: 40, h: 80 },
            { x: 710, y: 420, w: 40, h: 80 },
            { x: 685, y: 340, w: 80, h: 40 },
          ],
          wheels: [
            { x: 550, y: 300 }, { x: 620, y: 260 }, { x: 750, y: 200 },
            { x: 800, y: 310 }, { x: 850, y: 180 },
          ],
          landZone: { x: 820, w: 120 },
        },
        {
          name: "Level 2 – The Gap",
          structures: [
            { x: 680, y: 420, w: 30, h: 100 }, { x: 720, y: 420, w: 30, h: 100 },
            { x: 700, y: 320, w: 70, h: 30 },  { x: 700, y: 290, w: 50, h: 30 },
          ],
          wheels: [
            { x: 500, y: 280 }, { x: 570, y: 230 }, { x: 650, y: 190 },
            { x: 730, y: 170 }, { x: 810, y: 210 }, { x: 870, y: 270 },
          ],
          landZone: { x: 840, w: 110 },
        },
        {
          name: "Level 3 – Tower Smash",
          structures: [
            { x: 640, y: 420, w: 28, h: 120 }, { x: 676, y: 420, w: 28, h: 120 },
            { x: 712, y: 420, w: 28, h: 120 }, { x: 658, y: 300, w: 56, h: 28 },
            { x: 676, y: 272, w: 28, h: 28 },  { x: 748, y: 420, w: 28, h: 80 },
            { x: 748, y: 340, w: 28, h: 28 },
          ],
          wheels: [
            { x: 480, y: 250 }, { x: 560, y: 200 }, { x: 640, y: 170 },
            { x: 720, y: 150 }, { x: 800, y: 160 }, { x: 870, y: 200 }, { x: 920, y: 270 },
          ],
          landZone: { x: 860, w: 100 },
        },
        {
          name: "Level 4 – Pyramid",
          structures: [
            { x: 630, y: 420, w: 30, h: 90 }, { x: 668, y: 420, w: 30, h: 90 },
            { x: 706, y: 420, w: 30, h: 90 }, { x: 744, y: 420, w: 30, h: 90 },
            { x: 649, y: 330, w: 30, h: 90 }, { x: 687, y: 330, w: 30, h: 90 },
            { x: 725, y: 330, w: 30, h: 90 }, { x: 668, y: 240, w: 30, h: 90 },
            { x: 706, y: 240, w: 30, h: 90 }, { x: 687, y: 150, w: 30, h: 90 },
          ],
          wheels: [
            { x: 450, y: 220 }, { x: 530, y: 175 }, { x: 610, y: 145 },
            { x: 690, y: 120 }, { x: 770, y: 140 }, { x: 850, y: 175 }, { x: 920, y: 230 },
          ],
          landZone: { x: 880, w: 80 },
        },
        // ── City levels (5–8) use real layered PNG backgrounds ──────────────
        {
          name: "Level 5 – Neon District",
          cityTheme: "city 1", layerCount: 10,
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
          cityTheme: "city 2", layerCount: 10,
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
          cityTheme: "city 3", layerCount: 9,
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
          cityTheme: "city 4", layerCount: 10,
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
          CAR_DEFS.forEach((car) => {
            if (!this.textures.exists(car.previewKey))
              this.load.image(car.previewKey, `/sprites/${car.previewKey}.png`);
          });
        }

        create() {
          const { width, height } = this.scale;

          const bg = this.add.graphics();
          bg.fillGradientStyle(0x0f0f2a, 0x0f0f2a, 0x1a1a3a, 0x1a1a3a, 1);
          bg.fillRect(0, 0, width, height);

          this.add.text(width / 2, 52, "🚗  CAR SHOT", {
            fontSize: "42px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 6,
          }).setOrigin(0.5);

          this.add.text(width / 2, 104, "Choose your car", {
            fontSize: "20px", fontFamily: "Arial", color: "#94a3b8",
          }).setOrigin(0.5);

          const cardW = 240, cardH = 220, gap = 28;
          const totalW = CAR_DEFS.length * (cardW + gap) - gap;
          const startX = (width - totalW) / 2;
          const borderColors = [0xe74c3c, 0xf1c40f, 0x3498db];

          CAR_DEFS.forEach((car, i) => {
            const cx = startX + i * (cardW + gap) + cardW / 2;
            const cy = height / 2 + 10;
            const borderColor = borderColors[i];

            const card = this.add.graphics();
            const drawCard = (hover: boolean) => {
              card.clear();
              card.fillStyle(hover ? 0x2d3f55 : 0x1e293b, 1);
              card.lineStyle(3, borderColor, 1);
              card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
              card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
            };
            drawCard(false);

            const sprite = this.add.image(cx, cy - 28, car.previewKey);
            const scaleW = 180 / sprite.width;
            const scaleH = 100 / sprite.height;
            sprite.setScale(Math.min(scaleW, scaleH, 1));

            this.add.text(cx, cy + 68, car.label, {
              fontSize: "18px", fontFamily: "Arial Black, Arial", color: "#f1f5f9",
            }).setOrigin(0.5);

            this.add.text(cx, cy + 92, car.tagline, {
              fontSize: "12px", fontFamily: "Arial", color: "#64748b",
            }).setOrigin(0.5);

            const btn = this.add.rectangle(cx, cy, cardW, cardH, 0xffffff, 0)
              .setInteractive({ cursor: "pointer" });
            btn.on("pointerover", () => { drawCard(true); sprite.setAlpha(1); });
            btn.on("pointerout",  () => { drawCard(false); sprite.setAlpha(0.9); });
            btn.on("pointerdown", () => {
              this.registry.set("selectedCar", car);
              this.registry.set("currentLevel", 0);
              this.registry.set("totalWheels", 0);
              this.scene.start("Game");
            });
          });

          this.add.text(width / 2, height - 24, "Click & drag on the car to pull back → release to launch!", {
            fontSize: "14px", fontFamily: "Arial", color: "#475569",
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
        private retryBtn!: { g: Phaser.GameObjects.Graphics; txt: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Rectangle };

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
              this.load.spritesheet(key, `/cars/${folder}/${name}.png`, {
                frameWidth: car.frameW, frameHeight: car.frameH,
              });
            }
          });

          // City background layers
          const ld = this.levelDef as { cityTheme?: string; layerCount?: number };
          if (ld.cityTheme && ld.layerCount) {
            const cityEnc = ld.cityTheme.replace(/ /g, "%20");
            for (let i = 1; i <= ld.layerCount; i++) {
              const key = `${ld.cityTheme}_${i}`;
              if (!this.textures.exists(key))
                this.load.image(key, `/cyperpunk/${cityEnc}/${i}.png`);
            }
          }

          // Preview sprites (needed if reloading scene)
          CAR_DEFS.forEach(c => {
            if (!this.textures.exists(c.previewKey))
              this.load.image(c.previewKey, `/sprites/${c.previewKey}.png`);
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
          const ld = this.levelDef as { cityTheme?: string; groundColor?: number; groundLine?: number };
          const isCityLevel = !!ld.cityTheme;

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

          const groundBody = this.add.rectangle(width / 2, groundY, width, groundH);
          this.ground.add(groundBody);
          this.physics.add.existing(groundBody, true);

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
          const ld = this.levelDef as { cityTheme: string; layerCount: number };
          for (let i = 1; i <= ld.layerCount; i++) {
            this.add.image(width / 2, height / 2, `${ld.cityTheme}_${i}`)
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

          // Car sits with its bottom at the ramp top surface
          this.carStart = new Phaser.Math.Vector2(rampTopX + 15, rampTopY);
          this.aimLine = this.add.graphics();
        }

        buildStructures(isCityLevel: boolean) {
          const ld = this.levelDef as { neonPalette?: number[] };
          const neonColors = ld.neonPalette ?? [0x00e8ff, 0xff00cc, 0x9900ff, 0x00ff99];

          this.levelDef.structures.forEach((s, i) => {
            // Draw graphics in LOCAL coords (container positioned at top-left of structure)
            const gx = s.x - s.w / 2, gy = s.y - s.h;
            const g = this.add.graphics();
            g.setPosition(gx, gy);

            if (isCityLevel) {
              const neon = neonColors[i % neonColors.length];
              g.fillStyle(0x15052a, 1);   g.fillRect(0, 0, s.w, s.h);
              g.lineStyle(2, neon, 1);    g.strokeRect(0, 0, s.w, s.h);
              g.lineStyle(1, neon, 0.35); g.strokeRect(3, 3, s.w - 6, s.h - 6);
              for (let wy = 10; wy < s.h - 10; wy += 18) {
                g.fillStyle(neon, 0.55);
                g.fillRect(5, wy, 6, 4);
                if (s.w > 40) g.fillRect(s.w / 2 + 3, wy, 6, 4);
              }
            } else {
              g.fillStyle(0x8B6914, 1); g.fillRect(0, 0, s.w, s.h);
              g.lineStyle(2, 0x5d4509, 1); g.strokeRect(0, 0, s.w, s.h);
              g.lineStyle(1, 0x5d4509, 0.5);
              for (let ly = 0; ly < s.h; ly += 15) g.lineBetween(0, ly, s.w, ly);
            }

            const body = this.physics.add.staticImage(s.x, s.y - s.h / 2, "__DEFAULT");
            body.setDisplaySize(s.w, s.h);
            body.setVisible(false);
            (body.body as Phaser.Physics.Arcade.StaticBody).setSize(s.w, s.h);
            // Store graphic + dimensions so we can animate destruction later
            body.setData("gfx", g);
            body.setData("sw", s.w);
            body.setData("sh", s.h);
            this.structures.add(body);
          });
        }

        destroyObstacle(body: Phaser.Physics.Arcade.Image) {
          if (!body.active) return;
          body.setActive(false);
          (body.body as Phaser.Physics.Arcade.StaticBody).enable = false;

          const gfx = body.getData("gfx") as Phaser.GameObjects.Graphics;
          const sw  = body.getData("sw")  as number;
          const sh  = body.getData("sh")  as number;

          // White flash overlay on structure
          const flash = this.add.graphics();
          flash.fillStyle(0xffffff, 0.8);
          flash.fillRect(gfx.x, gfx.y, sw, sh);
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

          // Scatter fragments (3–5 small coloured squares)
          const fragColor = gfx.defaultFillColor ?? 0x8B6914;
          const cx = gfx.x + sw / 2, cy = gfx.y + sh / 2;
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

          this.levelText = this.add.text(width / 2, 18, this.levelDef.name, {
            fontSize: "18px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 4,
          }).setOrigin(0.5, 0).setDepth(10);

          this.hud = this.add.text(16, 16, this.getHudText(), {
            fontSize: "16px", fontFamily: "Arial", color: "#fbbf24",
            stroke: "#000", strokeThickness: 3,
          }).setDepth(10);

          const barG = this.add.graphics().setDepth(10);
          barG.fillStyle(0x1e293b, 0.8);
          barG.fillRoundedRect(14, 50, 154, 18, 4);
          barG.lineStyle(1, 0x475569, 1);
          barG.strokeRoundedRect(14, 50, 154, 18, 4);
          this.powerBar = this.add.graphics().setDepth(10);
          this.add.text(16, 71, "POWER", { fontSize: "10px", fontFamily: "Arial", color: "#64748b" }).setDepth(10);

          this.add.text(width - 16, 16, "Drag car to aim & charge\nRelease to launch!", {
            fontSize: "13px", fontFamily: "Arial", color: "#94a3b8", align: "right",
          }).setOrigin(1, 0).setDepth(10);

          // Persistent retry button
          const bw = 100, bh = 32, bx = width - 16 - 50, by = 72;
          const bg2 = this.add.graphics().setDepth(10);
          const drawBtn = (hover: boolean) => {
            bg2.clear();
            bg2.fillStyle(hover ? 0x475569 : 0x334155, 1);
            bg2.fillRoundedRect(bx - 50, by - 16, bw, bh, 6);
          };
          drawBtn(false);
          const btxt = this.add.text(bx, by, "↺  Retry  [R]", {
            fontSize: "12px", fontFamily: "Arial", color: "#94a3b8",
          }).setOrigin(0.5).setDepth(11);
          const bhit = this.add.rectangle(bx, by, bw, bh, 0xffffff, 0)
            .setInteractive({ cursor: "pointer" }).setDepth(12);
          bhit.on("pointerover", () => { drawBtn(true); btxt.setColor("#e2e8f0"); });
          bhit.on("pointerout",  () => { drawBtn(false); btxt.setColor("#94a3b8"); });
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
          const overlay = this.add.graphics().setDepth(30);
          overlay.fillStyle(0x000000, 0.6);
          overlay.fillRect(0, 0, width, height);

          const panel = this.add.graphics().setDepth(31);
          panel.fillStyle(0x1e293b, 1);
          panel.lineStyle(3, inZone ? 0xf1c40f : 0xef4444, 1);
          panel.strokeRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 16);
          panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 16);

          const title = inZone ? (this.wheelsThisRun > 0 ? "🏆 Perfect Landing!" : "✅ Landed!") : "💥 Missed!";
          this.add.text(width / 2, height / 2 - 90, title, {
            fontSize: "28px", fontFamily: "Arial Black, Arial",
            color: inZone ? "#f1c40f" : "#ef4444", stroke: "#000", strokeThickness: 4,
          }).setOrigin(0.5).setDepth(32);

          this.add.text(width / 2, height / 2 - 45, `Golden wheels: ${this.wheelsThisRun}`, {
            fontSize: "18px", fontFamily: "Arial", color: "#fbbf24",
          }).setOrigin(0.5).setDepth(32);

          this.add.text(width / 2, height / 2 - 18, `Total: ${this.totalWheels + this.wheelsThisRun} 🏆`, {
            fontSize: "16px", fontFamily: "Arial", color: "#94a3b8",
          }).setOrigin(0.5).setDepth(32);

          const nextLevel = this.levelIdx < LEVELS.length - 1;
          const btnY = height / 2 + 40;

          if (inZone && nextLevel) {
            this.makeButton(width / 2 - 110, btnY, "Next Level →", 0x6366f1, () => {
              this.registry.set("currentLevel", this.levelIdx + 1);
              this.registry.set("totalWheels", this.totalWheels + this.wheelsThisRun);
              this.scene.restart();
            });
          }

          this.makeButton(width / 2 + (inZone && nextLevel ? 10 : -90), btnY, "↺ Retry", 0x475569, () => {
            this.registry.set("totalWheels", this.totalWheels);
            this.scene.restart();
          });

          this.makeButton(width / 2 - 90, btnY + 58, "Change Car", 0x334155, () => {
            this.scene.start("CarSelect");
          });
        }

        makeButton(x: number, y: number, label: string, color: number, cb: () => void) {
          const bw = 160, bh = 44;
          const g = this.add.graphics().setDepth(32);
          g.fillStyle(color, 1); g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
          this.add.text(x, y, label, {
            fontSize: "15px", fontFamily: "Arial Black, Arial", color: "#ffffff",
          }).setOrigin(0.5).setDepth(33);
          const hit = this.add.rectangle(x, y, bw, bh, 0xffffff, 0)
            .setInteractive({ cursor: "pointer" }).setDepth(34);
          hit.on("pointerover", () => { g.clear(); g.fillStyle(color + 0x111111, 1); g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
          hit.on("pointerout",  () => { g.clear(); g.fillStyle(color, 1); g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
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
