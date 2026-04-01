"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function CarShotPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    // Dynamically import Phaser (client-only)
    import("phaser").then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      // ─── CONSTANTS ───────────────────────────────────────────────────────────
      const W = 960;
      const H = 540;

      // ─── CAR DEFINITIONS ─────────────────────────────────────────────────────
      const CAR_DEFS = [
        { id: "red",    label: "Blaze",   color: 0xe74c3c, accent: 0xc0392b },
        { id: "blue",   label: "Comet",   color: 0x3498db, accent: 0x2980b9 },
        { id: "green",  label: "Viper",   color: 0x2ecc71, accent: 0x27ae60 },
        { id: "purple", label: "Phantom", color: 0x9b59b6, accent: 0x8e44ad },
        { id: "gold",   label: "King",    color: 0xf1c40f, accent: 0xd4ac0d },
      ];

      // ─── LEVEL DEFINITIONS ───────────────────────────────────────────────────
      // Each level: ramp angle, structures (boxes to knock over), wheel positions
      const LEVELS = [
        {
          name: "Level 1 – Milk Run",
          rampAngle: -20, // degrees (negative = tilts up-left so car launches right)
          structures: [
            { x: 660, y: 420, w: 40, h: 80 },
            { x: 710, y: 420, w: 40, h: 80 },
            { x: 685, y: 340, w: 80, h: 40 },
          ],
          wheels: [
            { x: 550, y: 300 },
            { x: 620, y: 260 },
            { x: 750, y: 200 },
            { x: 800, y: 310 },
            { x: 850, y: 180 },
          ],
          landZone: { x: 820, w: 120 }, // x start, width of green landing zone
        },
        {
          name: "Level 2 – The Gap",
          rampAngle: -25,
          structures: [
            { x: 680, y: 420, w: 30, h: 100 },
            { x: 720, y: 420, w: 30, h: 100 },
            { x: 700, y: 320, w: 70, h: 30 },
            { x: 700, y: 290, w: 50, h: 30 },
          ],
          wheels: [
            { x: 500, y: 280 },
            { x: 570, y: 230 },
            { x: 650, y: 190 },
            { x: 730, y: 170 },
            { x: 810, y: 210 },
            { x: 870, y: 270 },
          ],
          landZone: { x: 840, w: 110 },
        },
        {
          name: "Level 3 – Tower Smash",
          rampAngle: -30,
          structures: [
            { x: 640, y: 420, w: 28, h: 120 },
            { x: 676, y: 420, w: 28, h: 120 },
            { x: 712, y: 420, w: 28, h: 120 },
            { x: 658, y: 300, w: 56, h: 28 },
            { x: 676, y: 272, w: 28, h: 28 },
            { x: 748, y: 420, w: 28, h: 80 },
            { x: 748, y: 340, w: 28, h: 28 },
          ],
          wheels: [
            { x: 480, y: 250 },
            { x: 560, y: 200 },
            { x: 640, y: 170 },
            { x: 720, y: 150 },
            { x: 800, y: 160 },
            { x: 870, y: 200 },
            { x: 920, y: 270 },
          ],
          landZone: { x: 860, w: 100 },
        },
        {
          name: "Level 4 – Pyramid",
          rampAngle: -28,
          structures: [
            { x: 630, y: 420, w: 30, h: 90 },
            { x: 668, y: 420, w: 30, h: 90 },
            { x: 706, y: 420, w: 30, h: 90 },
            { x: 744, y: 420, w: 30, h: 90 },
            { x: 649, y: 330, w: 30, h: 90 },
            { x: 687, y: 330, w: 30, h: 90 },
            { x: 725, y: 330, w: 30, h: 90 },
            { x: 668, y: 240, w: 30, h: 90 },
            { x: 706, y: 240, w: 30, h: 90 },
            { x: 687, y: 150, w: 30, h: 90 },
          ],
          wheels: [
            { x: 450, y: 220 },
            { x: 530, y: 175 },
            { x: 610, y: 145 },
            { x: 690, y: 120 },
            { x: 770, y: 140 },
            { x: 850, y: 175 },
            { x: 920, y: 230 },
          ],
          landZone: { x: 880, w: 80 },
        },
      ];

      // ─── SHARED STATE (across scenes via game registry) ──────────────────────
      // We'll store selectedCar, currentLevel, totalWheels in game.registry

      // ════════════════════════════════════════════════════════════════════════
      //  SCENE 1 – Car Select
      // ════════════════════════════════════════════════════════════════════════
      class CarSelectScene extends Phaser.Scene {
        constructor() { super("CarSelect"); }

        create() {
          const { width, height } = this.scale;

          // Background gradient
          const bg = this.add.graphics();
          bg.fillGradientStyle(0x0f0f2a, 0x0f0f2a, 0x1a1a3a, 0x1a1a3a, 1);
          bg.fillRect(0, 0, width, height);

          // Title
          this.add.text(width / 2, 60, "🚗  CAR SHOT", {
            fontSize: "42px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 6,
          }).setOrigin(0.5);

          this.add.text(width / 2, 110, "Choose your car", {
            fontSize: "20px", fontFamily: "Arial", color: "#94a3b8",
          }).setOrigin(0.5);

          // Car cards
          const cardW = 140, cardH = 170, gap = 20;
          const totalW = CAR_DEFS.length * (cardW + gap) - gap;
          const startX = (width - totalW) / 2;

          CAR_DEFS.forEach((car, i) => {
            const cx = startX + i * (cardW + gap) + cardW / 2;
            const cy = height / 2;

            const card = this.add.graphics();
            card.fillStyle(0x1e293b, 1);
            card.lineStyle(3, car.color, 1);
            card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
            card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);

            // Draw car icon (simple box car graphic)
            this.drawCarIcon(cx, cy - 20, car.color, car.accent);

            this.add.text(cx, cy + 55, car.label, {
              fontSize: "16px", fontFamily: "Arial Black, Arial",
              color: "#" + car.color.toString(16).padStart(6, "0"),
            }).setOrigin(0.5);

            // Hit area
            const btn = this.add.rectangle(cx, cy, cardW, cardH, 0xffffff, 0)
              .setInteractive({ cursor: "pointer" });

            btn.on("pointerover", () => {
              card.clear();
              card.fillStyle(0x334155, 1);
              card.lineStyle(3, car.color, 1);
              card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
              card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
            });
            btn.on("pointerout", () => {
              card.clear();
              card.fillStyle(0x1e293b, 1);
              card.lineStyle(3, car.color, 1);
              card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
              card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
            });
            btn.on("pointerdown", () => {
              this.registry.set("selectedCar", car);
              this.registry.set("currentLevel", 0);
              this.registry.set("totalWheels", 0);
              this.scene.start("Game");
            });
          });

          // Controls hint
          this.add.text(width / 2, height - 30, "Click & drag on car to pull back → release to launch!", {
            fontSize: "14px", fontFamily: "Arial", color: "#64748b",
          }).setOrigin(0.5);
        }

        drawCarIcon(cx: number, cy: number, color: number, accent: number) {
          const g = this.add.graphics();
          // Body
          g.fillStyle(color, 1);
          g.fillRoundedRect(cx - 44, cy - 16, 88, 28, 6);
          // Roof
          g.fillStyle(accent, 1);
          g.fillRoundedRect(cx - 28, cy - 30, 56, 18, 4);
          // Wheels
          g.fillStyle(0x1a1a1a, 1);
          g.fillCircle(cx - 28, cy + 14, 11);
          g.fillCircle(cx + 28, cy + 14, 11);
          g.fillStyle(0xaaaaaa, 1);
          g.fillCircle(cx - 28, cy + 14, 5);
          g.fillCircle(cx + 28, cy + 14, 5);
          // Windshield
          g.fillStyle(0x7ecbff, 0.6);
          g.fillRoundedRect(cx - 22, cy - 27, 44, 14, 2);
        }
      }

      // ════════════════════════════════════════════════════════════════════════
      //  SCENE 2 – Game
      // ════════════════════════════════════════════════════════════════════════
      class GameScene extends Phaser.Scene {
        // phaser objects
        private car!: Phaser.Physics.Arcade.Image;
        private rampGraphics!: Phaser.GameObjects.Graphics;
        private aimLine!: Phaser.GameObjects.Graphics;
        private structures!: Phaser.Physics.Arcade.StaticGroup;
        private wheels!: Phaser.Physics.Arcade.StaticGroup;
        private ground!: Phaser.Physics.Arcade.StaticGroup;
        private particles!: Phaser.GameObjects.Graphics;

        // ui
        private hud!: Phaser.GameObjects.Text;
        private levelText!: Phaser.GameObjects.Text;
        private powerBar!: Phaser.GameObjects.Graphics;

        // state
        private levelDef!: (typeof LEVELS)[0];
        private carDef!: (typeof CAR_DEFS)[0];
        private levelIdx!: number;
        private totalWheels!: number;
        private wheelsThisRun = 0;
        private launched = false;
        private isDragging = false;
        private dragStart!: Phaser.Math.Vector2;
        private carStart!: Phaser.Math.Vector2;
        private carTexKey!: string;
        private landed = false;
        private landTimer = 0;

        constructor() { super("Game"); }

        preload() {
          // We'll generate all textures procedurally
        }

        create() {
          this.launched = false;
          this.isDragging = false;
          this.landed = false;
          this.landTimer = 0;
          this.wheelsThisRun = 0;

          this.carDef = this.registry.get("selectedCar") as typeof CAR_DEFS[0];
          this.levelIdx = this.registry.get("currentLevel") as number;
          this.totalWheels = (this.registry.get("totalWheels") as number) || 0;
          this.levelDef = LEVELS[this.levelIdx % LEVELS.length];

          this.buildTextures();
          this.buildWorld();
          this.buildHUD();
          this.setupInput();
        }

        // ── Texture generation ───────────────────────────────────────────────
        buildTextures() {
          const key = `car_${this.carDef.id}`;
          this.carTexKey = key;
          if (!this.textures.exists(key)) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const bw = 64, bh = 28, rx = 32, ry = 14;
            // body
            g.fillStyle(this.carDef.color, 1);
            g.fillRoundedRect(0, ry - 10, bw, bh, 5);
            // roof
            g.fillStyle(this.carDef.accent, 1);
            g.fillRoundedRect(10, 4, 44, 14, 3);
            // windshield
            g.fillStyle(0x7ecbff, 0.7);
            g.fillRoundedRect(12, 6, 40, 10, 2);
            // wheels
            g.fillStyle(0x111111, 1);
            g.fillCircle(14, ry + 16, 10);
            g.fillCircle(50, ry + 16, 10);
            g.fillStyle(0xcccccc, 1);
            g.fillCircle(14, ry + 16, 4);
            g.fillCircle(50, ry + 16, 4);
            g.generateTexture(key, bw, bh + 20);
            g.destroy();
          }

          if (!this.textures.exists("wheel")) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            // golden wheel
            g.fillStyle(0xf1c40f, 1);
            g.fillCircle(14, 14, 14);
            g.fillStyle(0xd4ac0d, 1);
            g.fillCircle(14, 14, 10);
            g.fillStyle(0xf1c40f, 1);
            g.fillCircle(14, 14, 6);
            g.fillStyle(0xffeaa7, 1);
            g.fillCircle(14, 14, 3);
            // spokes
            g.lineStyle(2, 0xd4ac0d, 1);
            for (let a = 0; a < 360; a += 60) {
              const rad = Phaser.Math.DegToRad(a);
              g.lineBetween(14, 14, 14 + Math.cos(rad) * 10, 14 + Math.sin(rad) * 10);
            }
            g.generateTexture("wheel", 28, 28);
            g.destroy();
          }

          if (!this.textures.exists("box")) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x8B6914, 1);
            g.fillRect(0, 0, 30, 30);
            g.lineStyle(2, 0x5d4509, 1);
            g.strokeRect(1, 1, 28, 28);
            g.lineBetween(0, 0, 30, 30);
            g.lineBetween(30, 0, 0, 30);
            g.generateTexture("box", 30, 30);
            g.destroy();
          }
        }

        // ── World building ───────────────────────────────────────────────────
        buildWorld() {
          const { width, height } = this.scale;

          // Sky gradient
          const bg = this.add.graphics();
          bg.fillGradientStyle(0x0f0f2a, 0x0f0f2a, 0x1a2a4a, 0x1a2a4a, 1);
          bg.fillRect(0, 0, width, height);

          // Stars
          for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height * 0.7);
            const r = Math.random() * 1.5 + 0.5;
            bg.fillStyle(0xffffff, Math.random() * 0.6 + 0.2);
            bg.fillCircle(x, y, r);
          }

          // Ground
          this.ground = this.physics.add.staticGroup();
          const groundH = 40;
          const groundY = height - groundH / 2;
          const groundGfx = this.add.graphics();
          groundGfx.fillStyle(0x2d5016, 1);
          groundGfx.fillRect(0, height - groundH, width, groundH);
          // dirt stripe
          groundGfx.fillStyle(0x8B6914, 1);
          groundGfx.fillRect(0, height - groundH, width, 8);

          const groundBody = this.add.rectangle(width / 2, groundY, width, groundH);
          this.ground.add(groundBody);
          this.physics.add.existing(groundBody, true);

          // Ramp
          this.buildRamp();

          // Structures
          this.structures = this.physics.add.staticGroup();
          this.buildStructures();

          // Golden wheels
          this.wheels = this.physics.add.staticGroup();
          this.buildWheels();

          // Landing zone indicator
          const lz = this.levelDef.landZone;
          const lzGfx = this.add.graphics();
          lzGfx.fillStyle(0x00ff00, 0.12);
          lzGfx.fillRect(lz.x, height - groundH - 60, lz.w, 60);
          lzGfx.lineStyle(2, 0x00ff00, 0.5);
          lzGfx.strokeRect(lz.x, height - groundH - 60, lz.w, 60);
          this.add.text(lz.x + lz.w / 2, height - groundH - 30, "LAND HERE", {
            fontSize: "11px", fontFamily: "Arial", color: "#00ff00",
          }).setOrigin(0.5).setAlpha(0.7);

          // Particles graphic (for collection fx)
          this.particles = this.add.graphics();
        }

        buildRamp() {
          const { width, height } = this.scale;
          const groundH = 40;

          // Ramp: left side, angled surface
          const rampBaseX = 80;
          const rampTopX = 180;
          const rampBaseY = height - groundH;
          const rampTopY = height - groundH - 140;

          const g = this.add.graphics();
          // Ramp surface (brown)
          g.fillStyle(0x7f5539, 1);
          g.fillTriangle(rampBaseX, rampBaseY, rampTopX, rampTopY, rampBaseX, rampTopY);
          g.fillRect(rampBaseX, rampTopY, rampTopX - rampBaseX, rampBaseY - rampTopY);

          // Launch surface highlight
          g.lineStyle(3, 0xd4a373, 1);
          g.lineBetween(rampBaseX, rampBaseY, rampTopX, rampTopY);

          // Ramp end platform
          g.fillStyle(0x7f5539, 1);
          g.fillRect(rampTopX, rampTopY, 30, 12);

          this.rampGraphics = g;

          // Car start position (top of ramp)
          this.carStart = new Phaser.Math.Vector2(rampTopX + 15, rampTopY - 20);

          // Aim line graphics
          this.aimLine = this.add.graphics();
        }

        buildStructures() {
          const { height } = this.scale;
          const groundH = 40;

          this.levelDef.structures.forEach((s) => {
            // Draw visual
            const g = this.add.graphics();
            g.fillStyle(0x8B6914, 1);
            g.fillRect(s.x - s.w / 2, s.y - s.h, s.w, s.h);
            g.lineStyle(2, 0x5d4509, 1);
            g.strokeRect(s.x - s.w / 2, s.y - s.h, s.w, s.h);
            // cross hatching
            g.lineStyle(1, 0x5d4509, 0.5);
            for (let y = s.y - s.h; y < s.y; y += 15) {
              g.lineBetween(s.x - s.w / 2, y, s.x + s.w / 2, y);
            }

            // Physics body
            const body = this.physics.add.staticImage(s.x, s.y - s.h / 2, "__DEFAULT");
            body.setDisplaySize(s.w, s.h);
            body.setVisible(false);
            (body.body as Phaser.Physics.Arcade.StaticBody).setSize(s.w, s.h);
            this.structures.add(body);
          });
        }

        buildWheels() {
          this.levelDef.wheels.forEach((w) => {
            // Glowing halo
            const halo = this.add.graphics();
            halo.fillStyle(0xf1c40f, 0.15);
            halo.fillCircle(w.x, w.y, 22);

            const img = this.physics.add.staticImage(w.x, w.y, "wheel");
            this.wheels.add(img);

            // Spinning tween
            this.tweens.add({
              targets: img,
              angle: 360,
              duration: 2000,
              repeat: -1,
            });
            this.tweens.add({
              targets: img,
              y: w.y - 6,
              duration: 1000,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          });
        }

        buildHUD() {
          const { width } = this.scale;

          // Level name
          this.levelText = this.add.text(width / 2, 18, this.levelDef.name, {
            fontSize: "18px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 4,
          }).setOrigin(0.5, 0).setDepth(10);

          // Wheels counter
          this.hud = this.add.text(16, 16, this.getHudText(), {
            fontSize: "16px", fontFamily: "Arial", color: "#fbbf24",
            stroke: "#000", strokeThickness: 3,
          }).setDepth(10);

          // Power bar background
          const barG = this.add.graphics().setDepth(10);
          barG.fillStyle(0x1e293b, 0.8);
          barG.fillRoundedRect(14, 50, 154, 18, 4);
          barG.lineStyle(1, 0x475569, 1);
          barG.strokeRoundedRect(14, 50, 154, 18, 4);

          this.powerBar = this.add.graphics().setDepth(10);

          this.add.text(16, 71, "POWER", {
            fontSize: "10px", fontFamily: "Arial", color: "#64748b",
          }).setDepth(10);

          // Instructions
          this.add.text(width - 16, 16, "Drag car to aim & charge\nRelease to launch!", {
            fontSize: "13px", fontFamily: "Arial", color: "#94a3b8",
            align: "right",
          }).setOrigin(1, 0).setDepth(10);
        }

        getHudText() {
          return `🏆 ${this.totalWheels + this.wheelsThisRun} wheels`;
        }

        // ── Input ────────────────────────────────────────────────────────────
        setupInput() {
          // Place car at ramp top
          this.car = this.physics.add.image(this.carStart.x, this.carStart.y, this.carTexKey);
          this.car.setDepth(5);
          this.car.body.enable = false;

          // Pointer events
          this.input.on("pointerdown", this.onDown, this);
          this.input.on("pointermove", this.onMove, this);
          this.input.on("pointerup", this.onUp, this);
        }

        onDown(pointer: Phaser.Input.Pointer) {
          if (this.launched) return;
          const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.car.x, this.car.y);
          if (dist < 60) {
            this.isDragging = true;
            this.dragStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
          }
        }

        onMove(pointer: Phaser.Input.Pointer) {
          if (!this.isDragging || this.launched) return;

          const pullVec = new Phaser.Math.Vector2(
            pointer.x - this.dragStart.x,
            pointer.y - this.dragStart.y
          );
          const maxPull = 180;
          const pullLen = Math.min(pullVec.length(), maxPull);
          const power = pullLen / maxPull;

          // Draw aim line (opposite direction = launch direction)
          this.aimLine.clear();

          const launchDir = pullVec.clone().negate().normalize();
          const lineEnd = new Phaser.Math.Vector2(
            this.car.x + launchDir.x * pullLen * 1.5,
            this.car.y + launchDir.y * pullLen * 1.5
          );

          // Dashed line
          this.aimLine.lineStyle(2, 0xffffff, 0.4);
          const steps = 8;
          for (let i = 0; i < steps; i++) {
            if (i % 2 === 0) {
              const t0 = i / steps, t1 = (i + 0.7) / steps;
              this.aimLine.lineBetween(
                this.car.x + launchDir.x * pullLen * 1.5 * t0,
                this.car.y + launchDir.y * pullLen * 1.5 * t0,
                this.car.x + launchDir.x * pullLen * 1.5 * t1,
                this.car.y + launchDir.y * pullLen * 1.5 * t1,
              );
            }
          }
          // Arrow head
          this.aimLine.fillStyle(0xffffff, 0.6);
          this.aimLine.fillTriangle(
            lineEnd.x, lineEnd.y,
            lineEnd.x - launchDir.x * 12 + launchDir.y * 6,
            lineEnd.y - launchDir.y * 12 - launchDir.x * 6,
            lineEnd.x - launchDir.x * 12 - launchDir.y * 6,
            lineEnd.y - launchDir.y * 12 + launchDir.x * 6,
          );

          // Power bar
          this.powerBar.clear();
          const barColor = power < 0.4 ? 0x22c55e : power < 0.75 ? 0xf59e0b : 0xef4444;
          this.powerBar.fillStyle(barColor, 1);
          this.powerBar.fillRoundedRect(15, 51, Math.round(152 * power), 16, 3);

          // Car recoils slightly
          this.car.setPosition(
            this.carStart.x + launchDir.x * -8,
            this.carStart.y + launchDir.y * -8
          );
        }

        onUp(pointer: Phaser.Input.Pointer) {
          if (!this.isDragging || this.launched) return;
          this.isDragging = false;
          this.aimLine.clear();
          this.powerBar.clear();

          const pullVec = new Phaser.Math.Vector2(
            pointer.x - this.dragStart.x,
            pointer.y - this.dragStart.y
          );
          const maxPull = 180;
          const pullLen = Math.min(pullVec.length(), maxPull);
          if (pullLen < 10) return; // too small a pull, reset

          const power = pullLen / maxPull;
          const maxSpeed = 1400;
          const launchDir = pullVec.clone().negate().normalize();

          // Launch!
          this.launched = true;
          this.car.setPosition(this.carStart.x, this.carStart.y);
          (this.car.body as Phaser.Physics.Arcade.Body).enable = true;
          this.car.body.setGravityY(0);
          this.physics.world.enable(this.car);

          const vx = launchDir.x * maxSpeed * power;
          const vy = launchDir.y * maxSpeed * power;
          this.car.setVelocity(vx, vy);
          (this.car.body as Phaser.Physics.Arcade.Body).setGravityY(600);
          (this.car.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);

          // Collision with ground
          this.physics.add.collider(this.car, this.ground, this.onLand, undefined, this);
          // Collision with structures (knock them)
          this.physics.add.collider(this.car, this.structures, this.onHitStructure, undefined, this);
          // Overlap with wheels
          this.physics.add.overlap(this.car, this.wheels, this.onCollectWheel, undefined, this);
        }

        onLand() {
          if (this.landed) return;
          this.landed = true;
          // Check if inside land zone
          const lz = this.levelDef.landZone;
          const inZone = this.car.x >= lz.x && this.car.x <= lz.x + lz.w;

          this.time.delayedCall(600, () => {
            this.showResult(inZone);
          });
        }

        onHitStructure(_car: unknown, structure: unknown) {
          const s = structure as Phaser.GameObjects.GameObject;
          // Flash
          const gfx = this.add.graphics();
          gfx.fillStyle(0xffffff, 0.6);
          const body = (s as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
          gfx.fillRect(body.x, body.y, body.width, body.height);
          this.time.delayedCall(80, () => gfx.destroy());
          // Visual shake
          s.setVisible(false);
          // Debris particles
          this.spawnDebris((s as Phaser.Physics.Arcade.Image).x, (s as Phaser.Physics.Arcade.Image).y);
        }

        onCollectWheel(_car: unknown, wheel: unknown) {
          const w = wheel as Phaser.Physics.Arcade.Image;
          if (!w.active) return;
          w.setActive(false);
          w.setVisible(false);
          this.wheelsThisRun++;
          this.hud.setText(this.getHudText());
          // Sparkle
          this.spawnSparkle(w.x, w.y);
        }

        spawnSparkle(x: number, y: number) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const star = this.add.graphics();
            star.fillStyle(0xf1c40f, 1);
            star.fillCircle(x, y, 5);
            this.tweens.add({
              targets: star,
              x: x + Math.cos(angle) * 40,
              y: y + Math.sin(angle) * 40,
              alpha: 0,
              scaleX: 0,
              scaleY: 0,
              duration: 500,
              ease: "Power2",
              onComplete: () => star.destroy(),
            });
          }
          // Score popup
          const txt = this.add.text(x, y - 20, "+1 🏆", {
            fontSize: "18px", fontFamily: "Arial Black, Arial",
            color: "#f1c40f", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: txt,
            y: y - 60,
            alpha: 0,
            duration: 800,
            ease: "Power2",
            onComplete: () => txt.destroy(),
          });
        }

        spawnDebris(x: number, y: number) {
          for (let i = 0; i < 6; i++) {
            const d = this.add.graphics();
            d.fillStyle(0x8B6914, 1);
            d.fillRect(-4, -4, 8, 8);
            d.x = x;
            d.y = y;
            const vx = Phaser.Math.Between(-120, 120);
            const vy = Phaser.Math.Between(-200, -50);
            this.tweens.add({
              targets: d,
              x: x + vx * 0.8,
              y: y + vy * 0.4 + 80,
              angle: Phaser.Math.Between(-360, 360),
              alpha: 0,
              duration: 700,
              ease: "Power2",
              onComplete: () => d.destroy(),
            });
          }
        }

        showResult(inZone: boolean) {
          const { width, height } = this.scale;

          // Dim overlay
          const overlay = this.add.graphics().setDepth(30);
          overlay.fillStyle(0x000000, 0.6);
          overlay.fillRect(0, 0, width, height);

          const panel = this.add.graphics().setDepth(31);
          panel.fillStyle(0x1e293b, 1);
          panel.lineStyle(3, inZone ? 0xf1c40f : 0xef4444, 1);
          panel.strokeRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 16);
          panel.fillRoundedRect(width / 2 - 200, height / 2 - 130, 400, 260, 16);

          const title = inZone
            ? (this.wheelsThisRun > 0 ? "🏆 Perfect Landing!" : "✅ Landed!")
            : "💥 Missed!";

          this.add.text(width / 2, height / 2 - 90, title, {
            fontSize: "28px", fontFamily: "Arial Black, Arial",
            color: inZone ? "#f1c40f" : "#ef4444",
            stroke: "#000", strokeThickness: 4,
          }).setOrigin(0.5).setDepth(32);

          this.add.text(width / 2, height / 2 - 45, `Golden wheels: ${this.wheelsThisRun}`, {
            fontSize: "18px", fontFamily: "Arial", color: "#fbbf24",
          }).setOrigin(0.5).setDepth(32);

          this.add.text(width / 2, height / 2 - 18, `Total: ${this.totalWheels + this.wheelsThisRun} 🏆`, {
            fontSize: "16px", fontFamily: "Arial", color: "#94a3b8",
          }).setOrigin(0.5).setDepth(32);

          // Buttons
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
          g.fillStyle(color, 1);
          g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);

          const txt = this.add.text(x, y, label, {
            fontSize: "15px", fontFamily: "Arial Black, Arial", color: "#ffffff",
          }).setOrigin(0.5).setDepth(33);

          const hit = this.add.rectangle(x, y, bw, bh, 0xffffff, 0)
            .setInteractive({ cursor: "pointer" }).setDepth(34);
          hit.on("pointerover", () => { g.clear(); g.fillStyle(color + 0x222222, 1); g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
          hit.on("pointerout", () => { g.clear(); g.fillStyle(color, 1); g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
          hit.on("pointerdown", cb);

          return { g, txt, hit };
        }

        update(_time: number, delta: number) {
          if (this.launched && !this.landed) {
            // Rotate car based on velocity
            const body = this.car.body as Phaser.Physics.Arcade.Body;
            const angle = Math.atan2(body.velocity.y, body.velocity.x) * (180 / Math.PI);
            this.car.setAngle(angle);

            // Out of world bounds fallback
            if (this.car.y > this.scale.height + 100 || this.car.x > this.scale.width + 100) {
              if (!this.landed) {
                this.landed = true;
                this.time.delayedCall(200, () => this.showResult(false));
              }
            }

            this.landTimer += delta;
          }
        }
      }

      // ─── BOOT ─────────────────────────────────────────────────────────────
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: W,
        height: H,
        backgroundColor: "#0f0f2a",
        parent: containerRef.current!,
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 500 }, debug: false },
        },
        scene: [CarSelectScene, GameScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
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
