"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSubmitScore } from "@/lib/scores/hooks/useSubmitScore";
import { useScoresClient } from "@/lib/scores/components/AuthModalProvider";

const GROUND_H = 40;
const LANDING_ZONE_H = 60;

export default function CarShotPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const { submit } = useSubmitScore();
  const client = useScoresClient();

  // Stable ref so Phaser scenes always call the latest version
  const onRunEndRef = useRef<(wheels: number, level: number) => void>(() => {});
  onRunEndRef.current = useCallback((wheels: number, level: number) => {
    // Submit to global composite ladder (wheels = primary, highest level = secondary)
    submit({
      gameSlug:       "car-shot",
      ladderSlug:     "global",
      primaryValue:   wheels,
      secondaryValue: level,
      metadata:       { highestLevel: level, totalWheels: wheels },
    });
    client.updatePlayerStats("car-shot", {
      plays:      1,
      totalScore: wheels,
      bestScore:  wheels,
      extra:      { highestLevel: level },
    });
  }, [submit, client]);

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
          folder: "Jeep_1",
          frameW: 192, frameH: 192, scale: 0.50,
          // bounding box of car within frame (original px)
          bodyOffX: 24, bodyOffY: 124, bodyW: 144, bodyH: 68,
          hasIdle: true,
          idleFrames: 4, rideFrames: 8, destroyedFrames: 11, damageFrames: 3, brakeFrames: 3,
        },
        {
          id: "jeep2", label: "Wrangler", tagline: "Tank of the ramp",
          folder: "Jeep_2",
          frameW: 256, frameH: 256, scale: 0.38,
          bodyOffX: 15, bodyOffY: 177, bodyW: 205, bodyH: 79,
          hasIdle: true,
          idleFrames: 3, rideFrames: 8, destroyedFrames: 10, damageFrames: 5, brakeFrames: 3,
        },
        {
          id: "passenger", label: "Cruiser", tagline: "Loaded for launch",
          folder: "Passenger car",
          frameW: 192, frameH: 192, scale: 0.50,
          bodyOffX: 31, bodyOffY: 130, bodyW: 131, bodyH: 62,
          hasIdle: false,
          idleFrames: 0, rideFrames: 8, destroyedFrames: 10, damageFrames: 3, brakeFrames: 3,
        },
      ];

      // ─── LEVEL DEFINITIONS ───────────────────────────────────────────────────
      const LEVELS = [
        // ── Levels 1–4 ────────────────────────────────────────────────────────
        {
          name: "Level 1 – Easy Street",
          bgId: 1, bgVariant: "Night", layerCount: 5,
          groundColor: 0x071a0e, groundLine: 0x00ff88,
          neonPalette: [0x00ff88, 0x44ffaa, 0x00cc55, 0x88ffcc],
          structures: [
            // One short tower well left of the landing zone
            { x: 610, y: 420, w: 40, h: 80 },
            { x: 610, y: 340, w: 80, h: 26 },
          ],
          wheels: [
            { x: 470, y: 330 }, { x: 560, y: 295 }, { x: 650, y: 270 },
            { x: 745, y: 290 }, { x: 840, y: 320 },
          ],
          landZone: { x: 800, w: 150, overlap: 0.65 },
        },
        {
          name: "Level 2 – The Bridge",
          bgId: 2, bgVariant: "Night", layerCount: 5,
          groundColor: 0x100820, groundLine: 0xcc44ff,
          neonPalette: [0xcc44ff, 0xff66cc, 0x9922ff, 0x66ffcc],
          structures: [
            // Gate: two tall pillars + bridge cap
            { x: 610, y: 420, w: 26, h: 170 },
            { x: 700, y: 420, w: 26, h: 170 },
            { x: 655, y: 250, w: 116, h: 26 },
            // Stack on the bridge
            { x: 655, y: 224, w: 30, h: 28 },
            { x: 655, y: 196, w: 30, h: 28 },
            // Right flanking tower
            { x: 810, y: 420, w: 30, h: 100 },
            { x: 810, y: 320, w: 60, h: 26 },
          ],
          wheels: [
            { x: 430, y: 220 }, { x: 500, y: 180 }, { x: 590, y: 148 },
            { x: 680, y: 128 }, { x: 770, y: 158 }, { x: 860, y: 210 },
          ],
          landZone: { x: 850, w: 95, overlap: 0.45 },
        },
        {
          name: "Level 3 – Staircase",
          bgId: 3, bgVariant: "Night", layerCount: 5,
          groundColor: 0x080e1a, groundLine: 0x0099ff,
          neonPalette: [0x0099ff, 0x44ccff, 0x0066dd, 0x44ffee],
          structures: [
            // Short left tower
            { x: 560, y: 420, w: 30, h: 70  },
            { x: 560, y: 350, w: 62, h: 24  },
            // Medium centre tower + crate
            { x: 665, y: 420, w: 30, h: 130 },
            { x: 665, y: 290, w: 66, h: 24  },
            { x: 665, y: 266, w: 28, h: 28  },
            // Tall right tower + crates
            { x: 780, y: 420, w: 30, h: 200 },
            { x: 780, y: 220, w: 70, h: 24  },
            { x: 780, y: 196, w: 28, h: 28  },
            { x: 780, y: 168, w: 28, h: 28  },
          ],
          wheels: [
            { x: 420, y: 240 }, { x: 490, y: 195 }, { x: 570, y: 155 },
            { x: 650, y: 125 }, { x: 730, y: 108 }, { x: 810, y: 138 }, { x: 880, y: 185 },
          ],
          landZone: { x: 860, w: 90, overlap: 0.4 },
        },
        {
          name: "Level 4 – The Fortress",
          bgId: 4, bgVariant: "Night", layerCount: 5,
          groundColor: 0x1a0808, groundLine: 0xff3300,
          neonPalette: [0xff3300, 0xff6622, 0xcc2200, 0xff9944],
          structures: [
            // Outer gate — two tall pillars + cap
            { x: 590, y: 420, w: 24, h: 165 },
            { x: 690, y: 420, w: 24, h: 165 },
            { x: 640, y: 255, w: 124, h: 26 },
            // Inner tower rising above the gate
            { x: 640, y: 255, w: 28, h: 80  },
            { x: 640, y: 175, w: 72, h: 24  },
            { x: 640, y: 151, w: 30, h: 28  },
            { x: 640, y: 123, w: 30, h: 28  },
            // Right guard post
            { x: 790, y: 420, w: 28, h: 130 },
            { x: 790, y: 290, w: 58, h: 26  },
            { x: 790, y: 264, w: 28, h: 28  },
          ],
          wheels: [
            { x: 400, y: 210 }, { x: 460, y: 170 }, { x: 530, y: 130 },
            { x: 620, y: 100 }, { x: 710, y:  95 }, { x: 790, y: 118 },
            { x: 865, y: 162 }, { x: 925, y: 220 },
          ],
          landZone: { x: 870, w: 75, overlap: 0.30 },
        },
        // ── Levels 9–15: progressively lower billboard clearance ─────────────
        {
          // Arch opening = pillar_h = 165 px   |  pillar base gap to ground = 55 px
          name: "Level 9 – The Drop",
          bgId: 5, bgVariant: "Day", layerCount: 5,
          groundColor: 0x1a1208, groundLine: 0xff9900,
          neonPalette: [0xff9900, 0xffcc44, 0xff7700, 0xffdd88],
          structures: [
            // Main arch gate — pillars reach y=445, cap at y=280, opening 165 px
            { x: 580, y: 445, w: 28, h: 165 }, { x: 680, y: 445, w: 28, h: 165 },
            { x: 630, y: 280, w: 128, h: 30 },
            { x: 630, y: 250, w: 34, h: 30 },
            // Guard post right
            { x: 822, y: 445, w: 30, h: 152 }, { x: 822, y: 293, w: 66, h: 28 },
          ],
          wheels: [
            { x: 395, y: 215 }, { x: 465, y: 175 }, { x: 545, y: 140 },
            { x: 635, y: 112 }, { x: 718, y: 128 }, { x: 800, y: 155 }, { x: 878, y: 196 },
          ],
          landZone: { x: 856, w: 84 },
        },
        {
          // Gate 1 opening = 152 px  |  Gate 2 opening = 128 px  |  pillar base y=448
          name: "Level 10 – Double Gate",
          bgId: 6, bgVariant: "Day", layerCount: 5,
          groundColor: 0x081510, groundLine: 0x00ccbb,
          neonPalette: [0x00ccbb, 0x44ffee, 0x009988, 0x66ffdd],
          structures: [
            // Gate 1 (opening 152 px)
            { x: 555, y: 448, w: 26, h: 152 }, { x: 651, y: 448, w: 26, h: 152 },
            { x: 603, y: 296, w: 110, h: 28 },
            { x: 603, y: 268, w: 32, h: 28 }, { x: 603, y: 240, w: 32, h: 28 },
            // Gate 2 (opening 128 px — lower clearance)
            { x: 718, y: 448, w: 26, h: 128 }, { x: 814, y: 448, w: 26, h: 128 },
            { x: 766, y: 320, w: 110, h: 28 },
            { x: 766, y: 292, w: 32, h: 28 }, { x: 766, y: 264, w: 32, h: 28 },
          ],
          wheels: [
            { x: 390, y: 210 }, { x: 455, y: 168 }, { x: 530, y: 132 },
            { x: 608, y: 104 }, { x: 688, y: 118 }, { x: 768, y: 144 }, { x: 845, y: 186 },
          ],
          landZone: { x: 860, w: 78 },
        },
        {
          // Arch 1 opening = 118 px  |  Arch 2 opening = 100 px  |  pillar base y=452
          name: "Level 11 – The Squeeze",
          bgId: 7, bgVariant: "Day", layerCount: 5,
          groundColor: 0x100814, groundLine: 0xdd44ff,
          neonPalette: [0xdd44ff, 0xff88ee, 0xaa22dd, 0xee66ff],
          structures: [
            // Arch 1 (opening 118 px)
            { x: 537, y: 452, w: 26, h: 118 }, { x: 633, y: 452, w: 26, h: 118 },
            { x: 585, y: 334, w: 110, h: 28 },
            { x: 585, y: 306, w: 32, h: 28 }, { x: 585, y: 278, w: 32, h: 28 },
            // Arch 2 (opening 100 px — tighter)
            { x: 698, y: 452, w: 26, h: 100 }, { x: 794, y: 452, w: 26, h: 100 },
            { x: 746, y: 352, w: 110, h: 28 },
            { x: 746, y: 324, w: 32, h: 28 }, { x: 746, y: 296, w: 32, h: 28 },
            { x: 746, y: 268, w: 32, h: 28 },
            // Right guard
            { x: 866, y: 452, w: 28, h: 158 }, { x: 866, y: 294, w: 60, h: 28 },
          ],
          wheels: [
            { x: 385, y: 205 }, { x: 450, y: 163 }, { x: 524, y: 126 },
            { x: 600, y: 98 }, { x: 682, y: 110 }, { x: 762, y: 138 }, { x: 840, y: 180 },
          ],
          landZone: { x: 872, w: 74 },
        },
        {
          // Single very wide arch — opening = 88 px  |  pillar base y=455 (45 px gap)
          name: "Level 12 – The Bottleneck",
          bgId: 8, bgVariant: "Day", layerCount: 5,
          groundColor: 0x081015, groundLine: 0x0088ff,
          neonPalette: [0x0088ff, 0x44aaff, 0x0055cc, 0x66ccff],
          structures: [
            // Wide arch — 149 px horizontal gap, 88 px vertical opening
            { x: 545, y: 455, w: 26, h: 88 }, { x: 720, y: 455, w: 26, h: 88 },
            { x: 633, y: 367, w: 201, h: 30 },
            // Crate tower on cap
            { x: 633, y: 337, w: 36, h: 30 }, { x: 633, y: 307, w: 36, h: 30 },
            { x: 633, y: 277, w: 36, h: 30 }, { x: 633, y: 247, w: 36, h: 30 },
            // Guard right
            { x: 840, y: 455, w: 30, h: 162 }, { x: 840, y: 293, w: 62, h: 28 },
          ],
          wheels: [
            { x: 380, y: 200 }, { x: 445, y: 157 }, { x: 517, y: 120 },
            { x: 594, y: 90 }, { x: 674, y: 88 }, { x: 754, y: 114 }, { x: 830, y: 158 },
          ],
          landZone: { x: 864, w: 70 },
        },
        {
          // Triple consecutive arches: 78 → 68 → 60 px openings  |  pillar base y=458–460
          // Gap to ground ≤ 42 px — almost impossible to fly under
          name: "Level 13 – Floor Scraper",
          bgId: 5, bgVariant: "Night", layerCount: 5,
          groundColor: 0x120810, groundLine: 0xff2299,
          neonPalette: [0xff2299, 0xff66bb, 0xcc0077, 0xff99cc],
          structures: [
            // Arch 1 (opening 78 px)
            { x: 518, y: 458, w: 24, h: 78 }, { x: 612, y: 458, w: 24, h: 78 },
            { x: 565, y: 380, w: 106, h: 26 },
            // Arch 2 (opening 68 px)
            { x: 662, y: 459, w: 24, h: 68 }, { x: 756, y: 459, w: 24, h: 68 },
            { x: 709, y: 391, w: 106, h: 26 },
            // Arch 3 (opening 60 px)
            { x: 800, y: 460, w: 24, h: 60 }, { x: 878, y: 460, w: 24, h: 60 },
            { x: 839, y: 400, w: 90, h: 26 },
          ],
          wheels: [
            { x: 375, y: 196 }, { x: 440, y: 153 }, { x: 511, y: 115 },
            { x: 587, y: 88 }, { x: 667, y: 94 }, { x: 747, y: 120 }, { x: 818, y: 164 },
          ],
          landZone: { x: 892, w: 66 },
        },
        {
          // Low flanking post + Gate 1 (62 px) + Gate 2 (54 px)  |  pillar base y=462–463
          name: "Level 14 – Squeeze Play",
          bgId: 6, bgVariant: "Night", layerCount: 5,
          groundColor: 0x150808, groundLine: 0xff3322,
          neonPalette: [0xff3322, 0xff7766, 0xcc1100, 0xff9988],
          structures: [
            // Low flanking post (base y=462, gap to ground 38 px)
            { x: 528, y: 462, w: 28, h: 196 }, { x: 528, y: 266, w: 72, h: 26 },
            // Gate 1 (opening 62 px)
            { x: 618, y: 462, w: 24, h: 62 }, { x: 712, y: 462, w: 24, h: 62 },
            { x: 665, y: 400, w: 106, h: 26 },
            // Gate 2 (opening 54 px — near-limit)
            { x: 776, y: 463, w: 24, h: 54 }, { x: 862, y: 463, w: 24, h: 54 },
            { x: 819, y: 409, w: 98, h: 26 },
            { x: 819, y: 383, w: 32, h: 26 }, { x: 819, y: 357, w: 32, h: 26 },
          ],
          wheels: [
            { x: 370, y: 192 }, { x: 434, y: 148 }, { x: 505, y: 110 },
            { x: 580, y: 82 }, { x: 658, y: 78 }, { x: 736, y: 104 }, { x: 808, y: 148 },
          ],
          landZone: { x: 874, w: 62 },
        },
        {
          // Three barriers: flanking post + Gate 1 (58 px) + flanking post + Gate 2 (50 px)
          // Pillar base y=462–464  |  gap to ground ≤ 38 px — flying under is impossible
          name: "Level 15 – Final Gauntlet",
          bgId: 7, bgVariant: "Night", layerCount: 5,
          groundColor: 0x080c14, groundLine: 0x44aaff,
          neonPalette: [0x44aaff, 0x88ccff, 0x0088dd, 0x99ddff],
          structures: [
            // Left flanking post
            { x: 510, y: 462, w: 28, h: 196 }, { x: 510, y: 266, w: 72, h: 26 },
            // Gate 1 (opening 58 px)
            { x: 594, y: 462, w: 24, h: 58 }, { x: 688, y: 462, w: 24, h: 58 },
            { x: 641, y: 404, w: 106, h: 26 },
            // Mid flanking post
            { x: 744, y: 462, w: 28, h: 196 }, { x: 744, y: 266, w: 72, h: 26 },
            // Gate 2 (opening 50 px — extreme)
            { x: 800, y: 464, w: 24, h: 50 }, { x: 876, y: 464, w: 24, h: 50 },
            { x: 838, y: 414, w: 90, h: 26 },
            { x: 838, y: 388, w: 32, h: 26 },
          ],
          wheels: [
            { x: 365, y: 188 }, { x: 428, y: 143 }, { x: 498, y: 104 },
            { x: 572, y: 76 }, { x: 650, y: 72 }, { x: 728, y: 98 }, { x: 800, y: 142 },
          ],
          landZone: { x: 890, w: 56 },
        },
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
          landZone: { x: 850, w: 100, overlap: 0.55 },
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
          landZone: { x: 860, w: 95, overlap: 0.5 },
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
          landZone: { x: 860, w: 95, overlap: 0.5 },
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
          landZone: { x: 870, w: 90, overlap: 0.5 },
        },
      ];

      // ════════════════════════════════════════════════════════════════════════
      //  MUSIC
      // ════════════════════════════════════════════════════════════════════════
      const MUSIC_NOSTALGIA = "music_nostalgia";
      const MUSIC_TRACKS = [
        { key: "music_retro",     src: "/car_shot/music/bransboynd-retro-game-402454.mp3" },
        { key: "music_cyberpunk", src: "/car_shot/music/humanstudioedm-cyberpunk-gaming-505294.mp3" },
        { key: MUSIC_NOSTALGIA,   src: "/car_shot/music/ribhavagrawal-nostalgic-cyberpunk-music-230625.mp3" },
        { key: "music_space",     src: "/car_shot/music/serhii_kliets-spaceship-arcade-shooter-game-background-soundtrack-318508.mp3" },
      ];

      class MusicScene extends Phaser.Scene {
        private music: Phaser.Sound.BaseSound | null = null;
        private muted = false;
        private levelTrackIdx = 0;
        private menuVisited = false;          // prevents double-play on first launch
        private muteBtn!: Phaser.GameObjects.Text;
        private muteBg!: Phaser.GameObjects.Graphics;

        constructor() { super({ key: "Music", active: true }); }

        preload() {
          MUSIC_TRACKS.forEach(t => this.load.audio(t.key, t.src));
          // Load SFX here so they're available in all scenes from the start
          const sfx: [string, string][] = [
            ["sfx_select",  "/car_shot/sound_effects/creatorshome-video-game-select-337214.mp3"],
            ["sfx_collect", "/car_shot/sound_effects/liecio-collect-points-190037.mp3"],
            ["sfx_crash",   "/car_shot/sound_effects/dragon-studio-car-crash-sound-376882.mp3"],
            ["sfx_success", "/car_shot/sound_effects/freesound_community-success-48018.mp3"],
            ["sfx_fail",    "/car_shot/sound_effects/freesound_community-warning-sound-6686.mp3"],
          ];
          sfx.forEach(([key, src]) => this.load.audio(key, src));
        }

        create() {
          // React to scene transitions — set up BEFORE launching CarSelect
          const gameScene   = this.game.scene.getScene("Game");
          const selectScene = this.game.scene.getScene("CarSelect");

          gameScene.events.on("create", () => {
            const track = MUSIC_TRACKS[this.levelTrackIdx % MUSIC_TRACKS.length];
            this.levelTrackIdx++;
            this.playTrack(track.key);
          }, this);

          // Only switch to nostalgia when RETURNING to the menu, not on first launch
          // (first launch is handled by the playTrack call below)
          selectScene.events.on("create", () => {
            if (this.menuVisited) this.playTrack(MUSIC_NOSTALGIA);
            this.menuVisited = true;
          }, this);

          // Mute button — bottom-right corner, always on top
          const { width, height } = this.scale;
          const bx = width - 14, by = height - 14;

          this.muteBg = this.add.graphics().setDepth(200);
          this.muteBtn = this.add.text(bx, by, "🔊", {
            fontSize: "22px",
          }).setOrigin(1, 1).setDepth(201).setInteractive({ cursor: "pointer" });

          this.drawMuteBtn();

          this.muteBtn.on("pointerover",  () => this.muteBg.setAlpha(0.9));
          this.muteBtn.on("pointerout",   () => this.muteBg.setAlpha(0.7));
          this.muteBtn.on("pointerdown",  () => { this.sound.play("sfx_select", { volume: 0.6 }); this.toggleMute(); });

          // Always render on top of other scenes
          this.scene.bringToTop();

          // Start nostalgia — Phaser's WebAudioSound.play() internally queues
          // resumePlay() for the UNLOCKED event when the AudioContext is suspended,
          // so this is safe to call before any user interaction.
          this.playTrack(MUSIC_NOSTALGIA);

          // Extra safety net: some browsers / HTML5Audio backends don't auto-queue.
          // On first pointer interaction, ensure the current track is playing.
          this.input.once("pointerdown", () => {
            if (!this.muted && this.music && !(this.music as Phaser.Sound.WebAudioSound).isPlaying) {
              this.music.play();
            }
          }, this);

          // Start the menu scene
          this.scene.launch("CarSelect");
        }

        drawMuteBtn() {
          const { width, height } = this.scale;
          const bx = width - 14, by = height - 14;
          this.muteBg.clear();
          this.muteBg.fillStyle(0x000000, 0.55);
          this.muteBg.fillRoundedRect(bx - 34, by - 30, 36, 32, 8);
          this.muteBg.lineStyle(1, this.muted ? 0x666666 : 0x00ffcc, 0.7);
          this.muteBg.strokeRoundedRect(bx - 34, by - 30, 36, 32, 8);
          this.muteBg.setAlpha(0.7);
        }

        // Swap in a new looping track. Phaser's WebAudioSound.play() registers
        // an internal resumePlay handler for the UNLOCKED event when the
        // AudioContext is suspended, so no manual locked-check needed here.
        playTrack(key: string) {
          if (this.music) { this.music.stop(); this.music.destroy(); this.music = null; }
          this.music = this.sound.add(key, { loop: true, volume: 0.45 });
          if (!this.muted) this.music.play();
        }

        toggleMute() {
          this.muted = !this.muted;
          if (this.music) {
            if (this.muted) {
              (this.music as Phaser.Sound.WebAudioSound).pause?.();
            } else {
              (this.music as Phaser.Sound.WebAudioSound).resume?.();
            }
          }
          this.muteBtn.setText(this.muted ? "🔇" : "🔊");
          this.drawMuteBtn();
        }
      }

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

          // Monitor/2.png (262×202): screen area ≈ top 60% of frame.
          // With monH=188 centred at cy-22 → monitor spans cy-116 to cy+72.
          // Screen area: cy-116 to cy-116+113 = cy+(-3). Car body bottom at cy-28
          // and scale = min(115/bodyW, 80/bodyH) keeps the body comfortably inside.
          // Labels at cy+90/108 land ~18-26 px below the monitor bottom (cy+72).
          const cardW = 252, cardH = 248, gap = 24;
          const monH = 188, monOffY = -22;   // monitor centre relative to cy
          const totalW = CAR_DEFS.length * (cardW + gap) - gap;
          const startX = (width - totalW) / 2;

          CAR_DEFS.forEach((car, i) => {
            const cx = startX + i * (cardW + gap) + cardW / 2;
            const cy = height / 2 + 8;

            // Monitor frame – moved up 8 px so labels sit clearly below it
            const monFrame = this.add.image(cx, cy + monOffY, "gui_mon2")
              .setDisplaySize(cardW, monH).setOrigin(0.5, 0.5).setDepth(1);

            // Dark backing panel so the card area is opaque
            const backing = this.add.graphics().setDepth(0);
            backing.fillStyle(0x0a0a1e, 1);
            backing.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 4);

            // Animated car sprite – scale so body width ≤ 115 px AND body height ≤ 80 px
            // This keeps the visible car body inside the monitor screen area.
            const spriteScale = Math.min(115 / car.bodyW, 80 / car.bodyH);
            const sprite = this.add.sprite(cx, cy - 28, `${car.id}_select`);
            sprite.setOrigin(0.5, 1.0).setScale(spriteScale).setDepth(2);
            sprite.play(`${car.id}_select_anim`);

            // Car label & tagline – placed clearly below the monitor bottom (cy + monOffY + monH/2)
            this.add.text(cx, cy + 90, car.label, {
              fontSize: "17px", fontFamily: "Arial Black, Arial", color: "#00e8ff",
            }).setOrigin(0.5).setDepth(2);
            this.add.text(cx, cy + 110, car.tagline, {
              fontSize: "11px", fontFamily: "Arial", color: "#9966ff",
            }).setOrigin(0.5).setDepth(2);

            // Invisible hit zone over whole card
            const hit = this.add.rectangle(cx, cy, cardW, cardH, 0xffffff, 0)
              .setInteractive({ cursor: "pointer" }).setDepth(3);
            hit.on("pointerover",  () => { monFrame.setTint(0x88ffee); sprite.setAlpha(1); });
            hit.on("pointerout",   () => { monFrame.clearTint();        sprite.setAlpha(0.85); });
            hit.on("pointerdown",  () => {
              this.sound.play("sfx_select", { volume: 0.6 });
              this.registry.set("selectedCar", car);
              // If arriving from a mid-run "Switch Car", preserve level & wheels
              if (this.registry.get("keepProgress")) {
                this.registry.set("keepProgress", false);
              } else {
                this.registry.set("currentLevel", 0);
                this.registry.set("totalWheels", 0);
              }
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
        private lzGfx!: Phaser.GameObjects.Graphics;
        private lzBaseColor!: number;
        private lzTop!: number;
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
        private slamTriggered = false;
        private isDragging = false;
        private dragStart!: Phaser.Math.Vector2;
        private carStart!: Phaser.Math.Vector2;
        private landed = false;
        private landTimer = 0;
        private stuckTimer = 0;
        private groundHitPlayed = false;
        private preHitVelocity = { x: 0, y: 0 };
        private cursorZones: Map<string, { hit: Phaser.Geom.Rectangle; cursor: string }> = new Map();

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

          // Billboard frame assets
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

          // Ad images (15 per size × 3 sizes)
          const SIGNS = "/car_shot/signs/1%20Ad";
          for (let n = 1; n <= 15; n++) {
            if (!this.textures.exists(`ad_128_${n}`))
              this.load.image(`ad_128_${n}`, `${SIGNS}/128x64/${n}.png`);
            if (!this.textures.exists(`ad_64_${n}`))
              this.load.image(`ad_64_${n}`,  `${SIGNS}/64x64/${n}.png`);
            if (!this.textures.exists(`ad_22_${n}`))
              this.load.image(`ad_22_${n}`,  `${SIGNS}/22x40/${n}.png`);
          }
        }

        // ── Create ─────────────────────────────────────────────────────────────
        create() {
          this.launched = false;
          this.wasDestroyed = false;
          this.slamTriggered = false;
          this.isDragging = false;
          this.landed = false;
          this.landTimer = 0;
          this.stuckTimer = 0;
          this.groundHitPlayed = false;
          this.wheelsThisRun = 0;
          this.cursorZones = new Map();

          this.carDef = this.registry.get("selectedCar") as typeof CAR_DEFS[0];
          this.levelIdx = this.registry.get("currentLevel") as number;
          this.totalWheels = (this.registry.get("totalWheels") as number) || 0;
          this.levelDef = LEVELS[this.levelIdx % LEVELS.length];

          this.buildAnims();
          this.buildTextures();
          this.buildWorld();
          this.buildHUD();
          this.setupInput();
          this.initCursorZone();
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
            const g = this.make.graphics({ x: 0, y: 0 }, false);
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
          const groundY = height - GROUND_H / 2;
          const groundGfx = this.add.graphics();

          if (isCityLevel) {
            const gc = (ld.groundColor ?? 0x1a0a2e);
            const gl = (ld.groundLine ?? 0x9900ff);
            groundGfx.fillStyle(gc, 1);
            groundGfx.fillRect(0, height - GROUND_H, width, GROUND_H);
            groundGfx.lineStyle(2, gl, 0.9);
            groundGfx.lineBetween(0, height - GROUND_H, width, height - GROUND_H);
            groundGfx.lineStyle(1, 0x00e8ff, 0.4);
            for (let x = 0; x < width; x += 60)
              groundGfx.lineBetween(x, height - GROUND_H + 20, x + 30, height - GROUND_H + 20);
          } else {
            groundGfx.fillStyle(0x2d5016, 1);
            groundGfx.fillRect(0, height - GROUND_H, width, GROUND_H);
            groundGfx.fillStyle(0x8B6914, 1);
            groundGfx.fillRect(0, height - GROUND_H, width, 8);
          }

          // Use staticImage + manually set body so Phaser 3.87 doesn't mis-size via display-scale
          const groundImg = this.physics.add.staticImage(width / 2, groundY, "__DEFAULT");
          groundImg.setVisible(false);
          const gsBody = groundImg.body as Phaser.Physics.Arcade.StaticBody;
          gsBody.position.x = 0;
          gsBody.position.y = height - GROUND_H;
          gsBody.width     = width;
          gsBody.height    = GROUND_H;
          gsBody.halfWidth  = width  / 2;
          gsBody.halfHeight = GROUND_H / 2;
          gsBody.updateCenter();
          this.ground.add(groundImg);

          this.buildRamp(isCityLevel);

          this.structures = this.physics.add.staticGroup();
          this.buildStructures(isCityLevel);

          this.wheels = this.physics.add.staticGroup();
          this.buildWheels();

          // Landing zone
          const lz           = this.levelDef.landZone;
          this.lzBaseColor   = isCityLevel ? 0x00ffcc : 0x00ff00;
          const lzHex        = isCityLevel ? "#00ffcc" : "#00ff00";
          this.lzTop         = height - GROUND_H - LANDING_ZONE_H;
          this.lzGfx         = this.add.graphics();
          this.drawLandZone(this.lzBaseColor);

          // Downward chevrons inside (static, drawn once)
          const cxLZ = lz.x + lz.w / 2;
          const chevGfx = this.add.graphics();
          chevGfx.lineStyle(2, this.lzBaseColor, 0.45);
          for (let ca = 0; ca < 3; ca++) {
            const ay = this.lzTop + 14 + ca * 13;
            chevGfx.lineBetween(cxLZ - 8, ay, cxLZ, ay + 7);
            chevGfx.lineBetween(cxLZ,     ay + 7, cxLZ + 8, ay);
          }

          // Pulsing label
          const lzLabel = this.add.text(cxLZ, this.lzTop + 5, "▼ LAND ▼", {
            fontSize: "10px", fontFamily: "Arial", fontStyle: "bold",
            color: lzHex,
          }).setOrigin(0.5, 0).setAlpha(0.9);
          this.tweens.add({ targets: lzLabel, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

          this.particles = this.add.graphics();
        }

        drawLandZone(color: number) {
          const lz  = this.levelDef.landZone;
          const top = this.lzTop;
          const g   = this.lzGfx;
          g.clear();

          // Soft fill
          g.fillStyle(color, color === 0xffd700 ? 0.14 : 0.09);
          g.fillRect(lz.x, top, lz.w, 60);

          // Main border
          g.lineStyle(2, color, color === 0xffd700 ? 0.9 : 0.65);
          g.strokeRect(lz.x, top, lz.w, 60);

          // Corner accent ticks
          const tk = 10;
          g.lineStyle(3, color, 1.0);
          g.lineBetween(lz.x,        top,      lz.x + tk, top);
          g.lineBetween(lz.x,        top,      lz.x,      top + tk);
          g.lineBetween(lz.x + lz.w, top,      lz.x + lz.w - tk, top);
          g.lineBetween(lz.x + lz.w, top,      lz.x + lz.w,      top + tk);
          g.lineBetween(lz.x,        top + 60, lz.x + tk, top + 60);
          g.lineBetween(lz.x,        top + 60, lz.x,      top + 60 - tk);
          g.lineBetween(lz.x + lz.w, top + 60, lz.x + lz.w - tk, top + 60);
          g.lineBetween(lz.x + lz.w, top + 60, lz.x + lz.w,      top + 60 - tk);
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
          const rampBaseX = 80,  rampTopX = 180;
          const rampBaseY = height - groundH;
          const rampTopY  = height - groundH - 140;

          // Slope unit vectors
          const rampLen  = Math.hypot(rampTopX - rampBaseX, rampTopY - rampBaseY);
          const rdX = (rampTopX - rampBaseX) / rampLen;  //  ≈  0.581
          const rdY = (rampTopY - rampBaseY) / rampLen;  //  ≈ -0.813
          // Perpendicular ABOVE the slope (the car-facing side)
          const abX =  rdY;   // ≈ -0.813
          const abY = -rdX;   // ≈ -0.581
          // Perpendicular BELOW the slope (for attaching supports)
          const blX = -rdY;   // ≈  0.813
          const blY =  rdX;   // ≈  0.581
          const thick = 10;   // surface plank thickness

          const g = this.add.graphics();
          g.setDepth(1);

          if (isCityLevel) {
            const neon = 0x00e8ff;

            // ── Two vertical support columns ──────────────────────────────────
            for (const t of [0.3, 0.65]) {
              const sx = rampBaseX + rdX * rampLen * t;
              const sy = rampBaseY + rdY * rampLen * t;
              const bx = sx + blX * thick;          // attachment on underside of plank
              const by = sy + blY * thick;
              const ph = rampBaseY - by;             // column height down to ground

              const cw = 7;
              g.fillStyle(0x05020d, 1);
              g.fillRect(bx - cw / 2, by, cw, ph);
              g.lineStyle(2, neon, 0.9);
              g.lineBetween(bx - cw / 2, by, bx - cw / 2, rampBaseY);
              g.lineBetween(bx + cw / 2, by, bx + cw / 2, rampBaseY);
              // Cross-tick marks on column shaft
              g.lineStyle(1, neon, 0.3);
              for (let ty = by + 14; ty < rampBaseY - 4; ty += 18) {
                g.lineBetween(bx - cw / 2 - 2, ty, bx + cw / 2 + 2, ty);
              }
            }

            // Horizontal connecting beam near ground
            const bx0 = rampBaseX + rdX * rampLen * 0.3  + blX * thick;
            const bx1 = rampBaseX + rdX * rampLen * 0.65 + blX * thick;
            const beamY = rampBaseY - 14;
            g.lineStyle(3, neon, 0.45);
            g.lineBetween(bx0, beamY, bx1, beamY);
            g.lineStyle(1, neon, 0.2);
            g.lineBetween(bx0, beamY - 3, bx1, beamY - 3);

            // ── Thin ramp surface plank ───────────────────────────────────────
            const p0x = rampBaseX,           p0y = rampBaseY;
            const p1x = rampTopX,            p1y = rampTopY;
            const p2x = rampTopX + abX*thick, p2y = rampTopY + abY*thick;
            const p3x = rampBaseX + abX*thick,p3y = rampBaseY + abY*thick;

            g.fillStyle(0x12052a, 1);
            g.fillTriangle(p0x, p0y, p1x, p1y, p2x, p2y);
            g.fillTriangle(p0x, p0y, p2x, p2y, p3x, p3y);

            // Underside edge (dim)
            g.lineStyle(1, neon, 0.18);
            g.lineBetween(p3x, p3y, p2x, p2y);

            // Top surface neon edge
            g.lineStyle(3, neon, 1.0);
            g.lineBetween(rampBaseX, rampBaseY, rampTopX, rampTopY);

            // Arrow chevron marks along the surface
            g.lineStyle(1, 0x9900ff, 0.6);
            for (let t = 0.08; t < 0.95; t += 0.11) {
              const mx = rampBaseX + rdX * rampLen * t;
              const my = rampBaseY + rdY * rampLen * t;
              g.lineBetween(mx + abX * 1, my + abY * 1,
                            mx + abX * (thick - 1), my + abY * (thick - 1));
            }

            // ── Top launch platform ───────────────────────────────────────────
            const platW = 44, platH = 10;
            const platX = rampTopX - 2;
            g.fillStyle(0x1a0535, 1);
            g.fillRect(platX, rampTopY, platW, platH);
            g.lineStyle(2, neon, 1.0);
            g.strokeRect(platX, rampTopY, platW, platH);
            g.lineStyle(1, 0xffffff, 0.3);
            g.lineBetween(platX, rampTopY, platX + platW, rampTopY);

            // ── sign_pillar / sign_pillar2 images as support caps ────────────
            for (const t of [0.3, 0.65]) {
              const sx = rampBaseX + rdX * rampLen * t;
              const sy = rampBaseY + rdY * rampLen * t;
              const bx = sx + blX * thick;
              const by = sy + blY * thick;

              // Base foot
              const foot = this.add.image(bx, rampBaseY, "sign_pillar2");
              foot.setOrigin(0.5, 1.0);
              foot.setScale(1.6);
              foot.setDepth(2);
              // Ramp-connection cap (bracket)
              const cap = this.add.image(bx, by, "sign_pillar");
              cap.setOrigin(0.5, 0.5);
              cap.setScale(1.4);
              cap.setDepth(2);
            }

            // Platform support leg (left side, away from marker sign)
            const platLeg = this.add.image(platX + 10, rampTopY + platH, "sign_pillar2");
            platLeg.setOrigin(0.5, 0.0);
            platLeg.setScale(1.4);
            platLeg.setDepth(2);

          } else {
            // Non-city: wood plank ramp (same geometry, earthy colors)
            const p0x = rampBaseX,            p0y = rampBaseY;
            const p1x = rampTopX,             p1y = rampTopY;
            const p2x = rampTopX + abX*thick,  p2y = rampTopY + abY*thick;
            const p3x = rampBaseX + abX*thick, p3y = rampBaseY + abY*thick;
            g.fillStyle(0x7f5539, 1);
            g.fillTriangle(p0x, p0y, p1x, p1y, p2x, p2y);
            g.fillTriangle(p0x, p0y, p2x, p2y, p3x, p3y);
            g.lineStyle(3, 0xd4a373, 1);
            g.lineBetween(rampBaseX, rampBaseY, rampTopX, rampTopY);
            g.fillStyle(0x7f5539, 1);
            g.fillRect(rampTopX, rampTopY, 30, 12);
          }
          this.rampGraphics = g;

          this.carStart = new Phaser.Math.Vector2(rampTopX + 15, rampTopY);
          this.aimLine = this.add.graphics();
        }

        buildStructures(isCityLevel: boolean) {
          const ld      = this.levelDef as { neonPalette?: number[] };
          const palette = ld.neonPalette ?? [0x00e8ff, 0xff00cc, 0x9900ff, 0x00ff99];

          // Billboard frame info: [frameKey, frameW, frameH, adPrefix, adW, adH]
          // Ad center = frame center for all base variants (verified by pixel dims)
          const BB_WIDE  = { bbKey: "sign_128x64", bbW: 134, bbH: 70,  adPfx: "ad_128", adW: 126, adH: 62 };
          const BB_SQ    = { bbKey: "sign_64x64",  bbW: 70,  bbH: 70,  adPfx: "ad_64",  adW: 62,  adH: 62 };
          const BB_TALL  = { bbKey: "sign_22x40",  bbW: 28,  bbH: 46,  adPfx: "ad_22",  adW: 20,  adH: 38 };

          this.levelDef.structures.forEach((s, i) => {
            const cx        = s.x;
            const cy        = s.y - s.h / 2;   // world-space center y
            const hw        = s.w / 2;
            const hh        = s.h / 2;
            const ratio     = s.w / s.h;
            const neonColor = palette[i % palette.length];
            const adIdx     = (i % 15) + 1;    // 1–15

            // ── Choose billboard type ──
            let bb: typeof BB_WIDE;
            if      (ratio > 1.5)        bb = BB_WIDE;
            else if (ratio < 0.55)       bb = s.w >= 36 ? BB_SQ : BB_TALL;
            else                         bb = BB_SQ;

            // Scale: fit structure width; also cap height for flat beams
            const bbScale = Math.min(s.w / bb.bbW, s.h / bb.bbH, 3.0);
            const bbDispH = bb.bbH * bbScale;

            // Billboard local-Y within the container: top of structure + half billboard height
            const bbLocalY = -hh + bbDispH / 2;

            // ── Container at structure world-center ──
            const container = this.add.container(cx, cy);
            container.setDepth(2);

            // ── Pole support below the billboard ──
            const poleTopLocal = bbLocalY + bbDispH / 2;   // billboard bottom in local space
            const poleH        = hh - poleTopLocal;        // space from bb-bottom to structure bottom
            const poleW        = Math.max(4, Math.min(s.w * 0.28, 10));

            if (poleH > 1) {
              const poleGfx = this.add.graphics();
              if (isCityLevel) {
                // Sleek dark pole with neon side lines
                poleGfx.fillStyle(0x06030e, 1);
                poleGfx.fillRect(-poleW / 2, poleTopLocal, poleW, poleH);
                poleGfx.lineStyle(1, neonColor, 0.9);
                poleGfx.lineBetween(-poleW / 2, poleTopLocal, -poleW / 2, hh);
                poleGfx.lineBetween( poleW / 2, poleTopLocal,  poleW / 2, hh);
                // Horizontal crossbars every ~24px
                poleGfx.lineStyle(1, neonColor, 0.35);
                for (let ty = poleTopLocal + 16; ty < hh - 4; ty += 24) {
                  poleGfx.lineBetween(-poleW / 2 - 3, ty, poleW / 2 + 3, ty);
                }
              } else {
                poleGfx.fillStyle(0x6b4226, 1);
                poleGfx.fillRect(-poleW / 2, poleTopLocal, poleW, poleH);
                poleGfx.lineStyle(2, 0xc4956a, 0.7);
                poleGfx.strokeRect(-poleW / 2, poleTopLocal, poleW, poleH);
              }
              container.add(poleGfx);
            }

            // ── Billboard frame image ──
            const bbImg = this.add.image(0, bbLocalY, bb.bbKey);
            bbImg.setOrigin(0.5, 0.5);
            bbImg.setScale(bbScale);
            container.add(bbImg);

            // ── Ad image — same center as frame (verified: ad center = frame center) ──
            const adKey = `${bb.adPfx}_${adIdx}`;
            const adImg = this.add.image(0, bbLocalY, adKey);
            adImg.setOrigin(0.5, 0.5);
            adImg.setScale(bbScale);
            container.add(adImg);

            // ── Two accurate physics bodies: billboard frame + pole ──
            // Billboard frame body — spans the top portion where the image sits
            const bbBodyW  = bb.bbW * bbScale;          // actual rendered frame width
            const bbBodyH  = bbDispH;                   // actual rendered frame height
            const bbWorldY = (cy - hh) + bbBodyH / 2;  // world-y center of frame

            const bbBody  = this.physics.add.staticImage(cx, bbWorldY, "__DEFAULT");
            bbBody.setVisible(false);
            const bbSBody = bbBody.body as Phaser.Physics.Arcade.StaticBody;
            bbSBody.position.x = cx       - bbBodyW / 2;
            bbSBody.position.y = bbWorldY - bbBodyH / 2;
            bbSBody.width      = bbBodyW;   bbSBody.height     = bbBodyH;
            bbSBody.halfWidth  = bbBodyW / 2; bbSBody.halfHeight = bbBodyH / 2;
            bbSBody.updateCenter();
            bbBody.setData("gfx",         container);
            bbBody.setData("signOverlay", null);
            bbBody.setData("sw", s.w); bbBody.setData("sh", s.h);

            // Pole body — narrow column below the frame
            let poleBody: Phaser.Physics.Arcade.Image | null = null;
            if (poleH > 1) {
              const poleBodyW   = Math.max(poleW + 6, 14);   // slightly wider than drawn
              const poleWorldY  = (cy - hh) + bbBodyH + poleH / 2;
              poleBody = this.physics.add.staticImage(cx, poleWorldY, "__DEFAULT");
              poleBody.setVisible(false);
              const pSBody = poleBody.body as Phaser.Physics.Arcade.StaticBody;
              pSBody.position.x = cx        - poleBodyW / 2;
              pSBody.position.y = poleWorldY - poleH / 2;
              pSBody.width      = poleBodyW;   pSBody.height     = poleH;
              pSBody.halfWidth  = poleBodyW / 2; pSBody.halfHeight = poleH / 2;
              pSBody.updateCenter();
              poleBody.setData("gfx",         container);
              poleBody.setData("signOverlay", null);
              poleBody.setData("sw", s.w); poleBody.setData("sh", s.h);
              // Cross-link so hitting either body destroys both
              bbBody.setData("partner",   poleBody);
              poleBody.setData("partner", bbBody);
              this.structures.add(poleBody);
            }

            this.structures.add(bbBody);
          });
        }

        destroyObstacle(body: Phaser.Physics.Arcade.Image) {
          if (!body.active) return;
          body.setActive(false);
          (body.body as Phaser.Physics.Arcade.StaticBody).enable = false;

          // Disable linked partner body (billboard frame ↔ pole)
          const partner = body.getData("partner") as Phaser.Physics.Arcade.Image | null;
          if (partner && partner.active) {
            partner.setActive(false);
            (partner.body as Phaser.Physics.Arcade.StaticBody).enable = false;
          }

          // gfx is a Graphics object with x/y at structure center
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gfx         = body.getData("gfx") as any;
          const signOverlay = body.getData("signOverlay") as Phaser.GameObjects.Image | null;
          const sw          = body.getData("sw")  as number;
          const sh          = body.getData("sh")  as number;

          // White flash overlay (world-space top-left of structure)
          const flash = this.add.graphics();
          flash.fillStyle(0xffffff, 0.8);
          flash.fillRect(gfx.x - sw / 2, gfx.y - sh / 2, sw, sh);
          this.time.delayedCall(60, () => flash.destroy());

          // Collect all visuals to animate together
          const flyTargets = [gfx, signOverlay].filter(Boolean);

          // Shake then fly up & fade
          this.tweens.add({
            targets: gfx,
            x: { value: gfx.x + Phaser.Math.Between(-6, 6) },
            duration: 40, yoyo: true, repeat: 3,
            onComplete: () => {
              const targetY = gfx.y - sh * 0.8;
              const rot     = Phaser.Math.Between(-45, 45);
              this.tweens.add({
                targets: flyTargets,
                y: targetY,
                angle: rot,
                alpha: 0,
                duration: 400,
                ease: "Power2",
                onComplete: () => {
                  gfx.destroy();
                  if (signOverlay) signOverlay.destroy();
                },
              });
            },
          });

          // Scatter fragments
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
            // Outer soft glow
            const outerHalo = this.add.graphics();
            outerHalo.fillStyle(0xf1c40f, 0.07);
            outerHalo.fillCircle(w.x, w.y, 32);
            // Inner halo (pulsed)
            const innerHalo = this.add.graphics();
            innerHalo.fillStyle(0xf1c40f, 0.22);
            innerHalo.fillCircle(w.x, w.y, 20);
            this.tweens.add({ targets: innerHalo, alpha: 0.05, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

            const img = this.physics.add.staticImage(w.x, w.y, "wheel");
            (img.body as Phaser.Physics.Arcade.StaticBody).setSize(72, 72, true);
            this.wheels.add(img);
            this.tweens.add({ targets: img, angle: 360, duration: 2000, repeat: -1 });
            // Bob up/down — move halos in sync with wheel
            this.tweens.add({
              targets: [img, innerHalo, outerHalo],
              y: "-=6",
              duration: 1000,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
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
          const bw = 120, bh = 38, bx = width - 16 - (bw / 2), by = 70;
          this.createTextButton("Persistent retry button", "↩  Retry  [R]", bx, by, bw, bh, 11, () => { this.registry.set("totalWheels", this.totalWheels); this.scene.restart(); });

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
          this.physics.add.collider(this.car, this.structures, this.onHitStructure,
            // processCallback fires BEFORE Phaser zeroes the velocity on separation —
            // snapshot it here so onHitStructure can read the true pre-impact speed.
            (_car) => {
              const b = (this.car.body as Phaser.Physics.Arcade.Body);
              this.preHitVelocity = { x: b.velocity.x, y: b.velocity.y };
              return true;
            }, this);
          this.physics.add.overlap(this.car,  this.wheels,     this.onCollectWheel,  undefined, this);
        }

        onLand() {
          if (this.landed) return;

          const carBody = this.car.body as Phaser.Physics.Arcade.Body;

          const getOverlap = () => {
            const cd        = this.carDef;
            const lz        = this.levelDef.landZone;
            const overlapThreshold = lz.overlap ?? 0.65;
            const carLeftX  = this.car.x - (cd.frameW / 2 - cd.bodyOffX) * cd.scale;
            const carRightX = this.car.x + (cd.bodyOffX + cd.bodyW - cd.frameW / 2) * cd.scale;
            const carBodyW  = carRightX - carLeftX;
            const overlapL  = Math.max(carLeftX, lz.x);
            const overlapR  = Math.min(carRightX, lz.x + lz.w);
            const overlap   = Math.max(0, overlapR - overlapL);
            return overlap / carBodyW >= overlapThreshold;
          }

          // ── Nose-dive slam: high downward velocity on ground contact ──
          if (carBody.velocity.y > 150 && !this.slamTriggered) {
            this.slamTriggered = true;
            this.wasDestroyed  = true;
            this.landed = true;
            carBody.setAllowGravity(false);
            carBody.velocity.x *= 0.25;
            carBody.velocity.y  = 0;

            const flash = this.add.graphics();
            flash.fillStyle(0xffffff, 0.75);
            flash.fillRect(this.car.x - 48, this.scale.height - 30, 96, 12);
            this.time.delayedCall(70, () => flash.destroy());

            this.car.play(`${this.carDef.id}_destroyed`);

            const cd    = this.carDef;
            const bB    = (cd.bodyOffY + cd.bodyH - cd.frameH) * cd.scale;
            const restY = this.scale.height - 20 - bB;
            this.tweens.add({
              targets: this.car,
              angle: 0,
              y: restY,
              duration: 380,
              ease: "Back.easeOut",
              onComplete: () => {
                this.car.y = restY;
                this.time.delayedCall(250, () => {
                  this.showResult(getOverlap());
                });
              },
            });
            return;
          }

          // ── Normal landing: scrub velocity, drag to a stop, then check zone ──
          this.landed = true;
          carBody.setVelocityY(0);
          carBody.setVelocityX(carBody.velocity.x * 0.8);
          carBody.setDragX(280);
          this.car.play(`${this.carDef.id}_brake`);
          this.car.setAngle(0);

          this.time.delayedCall(450, () => {
            this.showResult(getOverlap());
          });
        }

        onHitStructure(_car: unknown, structure: unknown) {
          const s       = structure as Phaser.Physics.Arcade.Image;
          const carBody = this.car.body as Phaser.Physics.Arcade.Body;

          // Use the pre-collision snapshot — by the time this callback fires,
          // Phaser's arcade physics has already zeroed velocity.x (the axis
          // perpendicular to the static body surface), so carBody.velocity is
          // useless for determining impact speed or restoring momentum.
          const pvx   = this.preHitVelocity.x;
          const pvy   = this.preHitVelocity.y;
          const speed = Math.sqrt(pvx * pvx + pvy * pvy);

          // ── Velocity-dependent breakthrough ────────────────────────────────
          // LOW speed  (<180):  car bounces off — billboard survives
          // MED speed (180-400): punches through with heavy speed loss + shake
          // HIGH speed (>400):  clean smash-through, minor speed loss
          // ──────────────────────────────────────────────────────────────────

          if (speed < 180 && !this.wasDestroyed) {
            // Too slow — bounce off, billboard stays intact
            this.sound.play("sfx_crash", { volume: 0.8 });
            this.cameras.main.shake(200, 0.018);

            // Disable the obstacle's physics body so the collider stops firing,
            // but leave the graphics visible (billboard survives visually)
            const sBody = s.body as Phaser.Physics.Arcade.StaticBody;
            sBody.enable = false;
            const partner = s.getData("partner") as Phaser.Physics.Arcade.Image | null;
            if (partner) {
              (partner.body as Phaser.Physics.Arcade.StaticBody).enable = false;
            }

            // Bounce the car back using pre-collision velocity (x is already 0 otherwise)
            carBody.setVelocity(pvx * -0.35, pvy * 0.25);
            carBody.setAngularVelocity(0);

            // Crash sequence
            this.wasDestroyed = true;
            this.car.play(`${this.carDef.id}_destroyed`);
            this.car.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              if (!this.landed) {
                this.landed = true;
                this.time.delayedCall(300, () => this.showResult(false));
              }
            });
            return;
          }

          // Medium or high speed — car breaks through
          this.destroyObstacle(s);

          if (speed < 400) {
            // Medium impact: heavy speed penalty + camera shake
            this.sound.play("sfx_crash", { volume: 0.75 });
            this.cameras.main.shake(120, 0.010);
            carBody.setVelocity(pvx * 0.55, pvy * 0.55);
          } else if (speed < 800) {
            // High speed: clean smash-through, minor penalty
            this.sound.play("sfx_crash", { volume: 0.6 });
            this.cameras.main.shake(60, 0.006);
            carBody.setVelocity(pvx * 0.70, pvy * 0.70);
          } else {
            // Huge speed: clean smash-through
            this.sound.play("sfx_crash", { volume: 0.4 });
            this.cameras.main.shake(60, 0.006);
            carBody.setVelocity(pvx * 0.88, pvy * 0.88);
          }

          // Play damage anim briefly on the car, then return to ride
          if (!this.wasDestroyed) {
            this.car.play(`${this.carDef.id}_damage`);
            this.time.delayedCall(400, () => {
              if (!this.wasDestroyed && !this.landed)
                this.car.play(`${this.carDef.id}_ride`);
            });
          }

          // If the restored speed is still very low, treat it as a crash
          const restoredSpeed = speed * (speed < 400 ? 0.45 : 0.88);
          if (restoredSpeed < 15 && !this.wasDestroyed) {
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
          this.sound.play("sfx_collect", { volume: 0.7 });
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

        createTextButton(id: string,text: string, x: number, y: number, w: number, h: number, z: number, cb?: () => void, fontSize = "13px", color: string = "#00ffcc", bold = false, strokeStyles: Partial<{ stroke: string; strokeThickness: number }> = {}) {
          const txt = this.add.text(x, y, text, {
            fontSize, fontFamily: "Arial", fontStyle: bold ? "bold" : "normal",
            color, ...strokeStyles,
          }).setInteractive().setOrigin(0.5).setDepth(z);
          if (cb) {
            const hit = this.add.rectangle(x - 2, y - 2, w + 4, h + 4, 0xffffff, 0)
              .setInteractive({ cursor: "pointer" }).setDepth(z + 1);
            hit.on("pointerover", () => txt.setAlpha(0.7));
            hit.on("pointerout", () => txt.setAlpha(1));
            hit.on("pointerdown", () => { this.sound.play("sfx_select", { volume: 0.6 }); cb(); });
            this.addCursorZone(id, new Phaser.Geom.Rectangle(x-2, y-2, w+4, h+4), "pointer");
          }
        }

        showResult(inZone: boolean) {
          this.sound.play(inZone ? "sfx_success" : "sfx_fail", { volume: 0.75 });
          // Report score to the leaderboard SDK
          const onRunEnd = this.registry.get('onRunEnd') as ((w: number, l: number) => void) | undefined;
          onRunEnd?.(this.totalWheels + this.wheelsThisRun, this.levelIdx + 1);
          const { width, height } = this.scale;
          const cx = width / 2, cy = height / 2;

          // Dark overlay
          const overlay = this.add.graphics().setDepth(30);
          overlay.fillStyle(0x000000, 0.72);
          overlay.fillRect(0, 0, width, height);

          // Monitor/3.png (312×255) as panel frame, scaled to 400×280
          this.add.image(cx, cy, "gui_mon3")
            .setDisplaySize(400, 280).setOrigin(0.5, 0.5).setDepth(31);

          // Badge – moved down into centre of monitor
          const badgeKey = inZone ? "gui_granted" : "gui_denied";
          const badgeY = cy - 45;
          this.add.image(cx, badgeY, badgeKey)
            .setScale(1.8).setOrigin(0.5, 0.5).setDepth(32);

          // Golden wheels – under the badge with a bit of breathing room
          const wheelsY = badgeY + 66;
          this.add.text(cx, wheelsY, `Golden wheels: ${this.wheelsThisRun}/${this.totalWheels}`, {
            fontSize: "15px", fontFamily: "Arial", color: "#f1c40f",
          }).setOrigin(0.5).setDepth(32);

          // ── Shared helper: start-over action ──────────────────────────────
          const doStartOver = () => {
            this.registry.set("currentLevel", 0);
            this.registry.set("totalWheels",  0);
            this.registry.set("keepProgress", false);
            this.scene.start("CarSelect");
          };

          // Below the monitor frame (bottom edge ≈ cy + 140)
          const nextLevel    = this.levelIdx < LEVELS.length - 1;
          const belowMonitor = cy + 155;
          const startOverY   = belowMonitor + 36;   // second row for Start Over

          if (inZone && nextLevel) {
            // ── SUCCESS with more levels ──────────────────────────────────────
            // Row 1: Next Level  |  Retry
            this.createTextButton("res-next", "Next Level →", cx - 90, belowMonitor, 90, 28, 33, () => {
              this.registry.set("currentLevel", this.levelIdx + 1);
              this.registry.set("totalWheels", this.totalWheels + this.wheelsThisRun);
              this.scene.restart();
            }, "13px", "#6366F1", true);

            this.createTextButton("res-retry-s", "↩ Retry", cx + 90, belowMonitor, 90, 28, 33, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.scene.restart();
            }, "13px", "#00ffcc", true);

            // Row 2: Start Over (smaller, dimmer — always available)
            this.createTextButton("res-startover-s", "↺ Start Over", cx, startOverY, 110, 22, 33,
              doStartOver, "11px", "#94a3b8", true);

          } else if (inZone) {
            // ── SUCCESS — final level (all done!) ────────────────────────────
            this.createTextButton("res-again", "↩ Play Again", cx - 90, belowMonitor, 100, 28, 33, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.scene.restart();
            }, "13px", "#00ffcc", true);

            this.createTextButton("res-startover-f", "↺ Start Over", cx + 90, belowMonitor, 100, 28, 33,
              doStartOver, "13px", "#94a3b8", true);

          } else {
            // ── FAIL ─────────────────────────────────────────────────────────
            // Row 1: Retry  |  Switch Car (keeps progress)
            this.createTextButton("res-retry-f", "↩ Retry", cx - 90, belowMonitor, 90, 28, 33, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.scene.restart();
            }, "13px", "#00ffcc", true);

            this.createTextButton("res-switchcar", "Switch Car", cx + 90, belowMonitor, 90, 28, 33, () => {
              this.registry.set("totalWheels", this.totalWheels);
              this.registry.set("keepProgress", true);
              this.scene.start("CarSelect");
            }, "13px", "#00ffcc", true);

            // Row 2: Start Over
            this.createTextButton("res-startover-fail", "↺ Start Over", cx, startOverY, 110, 22, 33,
              doStartOver, "11px", "#94a3b8", true);
          }
        }

        // Adds a native mousemove listener on the canvas for flicker-free pointer cursor.
        // Phaser resets canvas.style.cursor every frame; this runs outside Phaser's loop.
        initCursorZone() {
          const canvas = this.game.canvas;
          const handler = (e: MouseEvent) => {
            const rect  = canvas.getBoundingClientRect();
            const scaleX = this.scale.width  / rect.width;
            const scaleY = this.scale.height / rect.height;
            const gx = (e.clientX - rect.left) * scaleX;
            const gy = (e.clientY - rect.top)  * scaleY;
            const over = [...this.cursorZones.values()].find(z => {
              const x = z.hit.x;
              const y = z.hit.y;
              const w = z.hit.width;
              const h = z.hit.height;

              return gx >= x - w / 2 && gx <= x + w / 2 &&
              gy >= y - h / 2 && gy <= y + h / 2;
            });

            if (over) {
              this.input.setDefaultCursor(over.cursor);
            } else {
              this.input.setDefaultCursor("default");
            }
          };
          canvas.addEventListener("mousemove", handler);
          // Clean up when scene shuts down (restart or scene change)
          this.events.once("shutdown", () => {
            canvas.removeEventListener("mousemove", handler);
            canvas.style.cursor = "default";
          });
        }
        addCursorZone(id: string, hit: Phaser.Geom.Rectangle, cursor: string) {
          this.cursorZones.set(id, { hit, cursor });
          // Clean up when scene shuts down (restart or scene change)
          this.events.once("shutdown", () => {
            this.cursorZones.delete(id);
          });
        }

        makeButton(x: number, y: number, label: string, _color: number, cb: () => void) {
          const bw = 180, bh = 38;
          const btnImg = this.add.image(x, y, "gui_buttons2")
            .setDisplaySize(bw, bh).setOrigin(0.5, 0.5).setDepth(32);
          this.add.text(x, y, label, {
            fontSize: "11px", fontFamily: "Arial Black, Arial", color: "#00ffcc",
            stroke: "#000", strokeThickness: 2,
          }).setOrigin(0.5).setDepth(33);
          const hit = this.add.rectangle(x, y, bw, bh, 0xffffff, 0)
            .setInteractive().setDepth(34);
          hit.on("pointerover", () => btnImg.setTint(0x88ffee));
          hit.on("pointerout",  () => btnImg.clearTint());
          hit.on("pointerdown", () => { this.sound.play("sfx_select", { volume: 0.6 }); cb(); });
          this.addCursorZone(label, new Phaser.Geom.Rectangle(x, y, bw, bh), "pointer");
        }

        update(_time: number, delta: number) {
          if (this.launched) {
            const cd       = this.carDef;

            // Live landing-zone coverage indicator
            {
              const lz     = this.levelDef.landZone;
              const height = this.scale.height;
              const lzTop  = height - GROUND_H - LANDING_ZONE_H;

              if (this.car.y >= lzTop) {
                const carLeftX  = this.car.x - (cd.frameW / 2 - cd.bodyOffX) * cd.scale;
                const carRightX = this.car.x + (cd.bodyOffX + cd.bodyW - cd.frameW / 2) * cd.scale;
                const carBodyW  = carRightX - carLeftX;
                const overlapL  = Math.max(carLeftX, lz.x);
                const overlapR  = Math.min(carRightX, lz.x + lz.w);
                const ratio     = Math.max(0, overlapR - overlapL) / carBodyW;
                const wantGold  = ratio >= (lz.overlap ?? 0.65);
                const isGold    = (this.lzGfx.getData("gold") as boolean) ?? false;

                if (wantGold !== isGold) {
                  this.lzGfx.setData("gold", wantGold);
                  this.drawLandZone(wantGold ? 0xffd700 : this.lzBaseColor);
                }
              }
            }


            if (!this.landed) {
              const body = this.car.body as Phaser.Physics.Arcade.Body;

              // Rotate car to match velocity direction only while not destroyed
              if (!this.wasDestroyed) {
                const angle = Math.atan2(body.velocity.y, body.velocity.x) * (180 / Math.PI);
                this.car.setAngle(angle);
              }

              const stop = () => {
                this.landed = true;
                this.time.delayedCall(250, () => this.showResult(false));
              }

              // Fell back into launch half — only trigger if the car has reversed
              // direction (actually traveling back left) AND enough time has passed
              // for a genuine arc to have completed
              if (this.landTimer > 2000 &&
                  body.velocity.x < 0 &&
                  this.car.x < this.scale.width  / 2 &&
                  this.car.y > this.scale.height / 2) stop();

              // Safety net: car fell off the bottom without hitting the ground collider
              if (this.car.y > this.scale.height + 60) stop();

              // Hard out-of-bounds fallback (right edge)
              if (this.car.x > this.scale.width + 100 && !this.landed) stop();

              // Dynamic floor — keep every corner of the car body above height-20
              // at any rotation angle.
              // The car uses origin (0.5, 1.0) so car.y == the BOTTOM of the sprite.
              // We rotate the four body-rectangle corners around that origin point and
              // find the one that dips lowest.
              
              const s   = cd.scale;
              // Body corner positions relative to the sprite's bottom-center origin
              const bL = (cd.bodyOffX               - cd.frameW / 2) * s;  // left x
              const bR = (cd.bodyOffX + cd.bodyW    - cd.frameW / 2) * s;  // right x
              const bT = (cd.bodyOffY               - cd.frameH    ) * s;  // top y (negative = above)
              const bB = (cd.bodyOffY + cd.bodyH    - cd.frameH    ) * s;  // bottom y (≈ 0)

              const θ    = Phaser.Math.DegToRad(this.car.angle);
              const sinθ = Math.sin(θ);
              const cosθ = Math.cos(θ);

              // Rotated y of each corner (positive = below the origin/bottom point)
              const maxExtentDown = Math.max(
                bL * sinθ + bT * cosθ,
                bR * sinθ + bT * cosθ,
                bL * sinθ + bB * cosθ,
                bR * sinθ + bB * cosθ,
              );

              // car.y must not exceed this so no corner goes below height-20
              const effectiveFloorY = this.scale.height - 20 - maxExtentDown;

              if (this.car.y > effectiveFloorY) {
                this.car.y = effectiveFloorY;

                if (!this.groundHitPlayed) {
                  this.groundHitPlayed = true;
                  this.sound.play("sfx_crash", { volume: 0.5 });
                }

                if (body.velocity.y > 150 && !this.wasDestroyed && !this.slamTriggered) {
                  // Nose-dive slam: kill physics then flop flat via tween
                  this.slamTriggered = true;
                  this.wasDestroyed  = true;
                  body.setAllowGravity(false);   // stop gravity fighting the tween
                  body.velocity.x *= 0.25;
                  body.velocity.y  = 0;

                  // Impact flash near the ground line
                  const flash = this.add.graphics();
                  flash.fillStyle(0xffffff, 0.75);
                  flash.fillRect(this.car.x - 48, this.scale.height - 30, 96, 12);
                  this.time.delayedCall(70, () => flash.destroy());

                  this.car.play(`${this.carDef.id}_destroyed`);

                  // When flat (θ=0) bB≈0 so maxExtentDown≈0 → car.y should equal height-20
                  const restY = this.scale.height - 20 - bB;
                  this.tweens.add({
                    targets: this.car,
                    angle: 0,
                    y: restY,
                    duration: 380,
                    ease: "Back.easeOut",
                    onComplete: () => {
                      this.car.y = restY;   // snap to exact rest position
                      this.time.delayedCall(450, () => this.onLand());
                    },
                  });
                } else {
                  body.velocity.y = 0;
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
        audio: { disableWebAudio: false },
        scene: [MusicScene, CarSelectScene, GameScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;
      // Pass the score callback into Phaser via the registry after boot
      game.events.once('ready', () => {
        game.registry.set('onRunEnd', (wheels: number, level: number) => {
          onRunEndRef.current(wheels, level);
        });
      });
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
