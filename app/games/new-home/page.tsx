"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface AssetDef {
  id: string;
  label: string;
  category: string;
  path: string;
  scale: number; // default display scale in world
}

interface PlacedItem {
  uid: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
}

interface SaveData {
  outdoor: PlacedItem[];
  indoor: PlacedItem[];
}

interface Pending {
  assetId: string;
  sx: number; // canvas-relative X
  sy: number; // canvas-relative Y
}

// ─── ASSET CATALOG ───────────────────────────────────────────────────────────
const NH = "/new_home";
const CATALOG: AssetDef[] = [
  // ── Trees
  { id: "tree_1",            label: "Oak Tree",         category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Tree1.png`,            scale: 1   },
  { id: "tree_2",            label: "Oak Tree 2",        category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Tree2.png`,            scale: 1   },
  { id: "tree_3",            label: "Oak Tree 3",        category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Tree3.png`,            scale: 1   },
  { id: "autumn_tree_1",     label: "Autumn Tree",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Autumn_tree1.png`,     scale: 1   },
  { id: "autumn_tree_2",     label: "Autumn Tree 2",     category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Autumn_tree2.png`,     scale: 1   },
  { id: "autumn_tree_3",     label: "Autumn Tree 3",     category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Autumn_tree3.png`,     scale: 1   },
  { id: "palm_1",            label: "Palm Tree",         category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Palm_tree1_1.png`,     scale: 1   },
  { id: "palm_2",            label: "Palm Tree 2",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Palm_tree2_1.png`,     scale: 1   },
  { id: "christmas_tree_1",  label: "Christmas Tree",    category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Christmas_tree1.png`,  scale: 1   },
  { id: "christmas_tree_2",  label: "Christmas Tree 2",  category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Christmas_tree2.png`,  scale: 1   },
  { id: "flower_tree_1",     label: "Flower Tree",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Flower_tree1.png`,     scale: 1   },
  { id: "flower_tree_2",     label: "Flower Tree 2",     category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Flower_tree2.png`,     scale: 1   },
  { id: "fruit_tree_1",      label: "Fruit Tree",        category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Fruit_tree1.png`,      scale: 1   },
  { id: "fruit_tree_2",      label: "Fruit Tree 2",      category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Fruit_tree2.png`,      scale: 1   },
  { id: "moss_tree_1",       label: "Moss Tree",         category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Moss_tree1.png`,       scale: 1   },
  { id: "moss_tree_2",       label: "Moss Tree 2",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Moss_tree2.png`,       scale: 1   },
  { id: "snow_tree_1",       label: "Snow Tree",         category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Snow_tree1.png`,       scale: 1   },
  { id: "snow_xmas_1",       label: "Snow Xmas Tree",    category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Snow_christmass_tree1.png`, scale: 1 },
  { id: "burned_tree_1",     label: "Burned Tree",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Burned_tree1.png`,     scale: 1   },
  { id: "burned_tree_2",     label: "Burned Tree 2",     category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Burned_tree2.png`,     scale: 1   },
  { id: "broken_tree_1",     label: "Broken Tree",       category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Broken_tree1.png`,     scale: 1   },
  { id: "broken_tree_2",     label: "Broken Tree 2",     category: "Trees",  path: `${NH}/trees/Assets_separately/Trees/Broken_tree2.png`,     scale: 1   },

  // ── Bushes
  { id: "bush_blue_1",    label: "Blue Flower Bush",    category: "Bushes", path: `${NH}/bushes/Assets/Bush_blue_flowers1.png`,    scale: 1 },
  { id: "bush_blue_2",    label: "Blue Flower Bush 2",  category: "Bushes", path: `${NH}/bushes/Assets/Bush_blue_flowers2.png`,    scale: 1 },
  { id: "bush_orange_1",  label: "Orange Flower Bush",  category: "Bushes", path: `${NH}/bushes/Assets/Bush_orange_flowers1.png`,  scale: 1 },
  { id: "bush_orange_2",  label: "Orange Flower Bush 2",category: "Bushes", path: `${NH}/bushes/Assets/Bush_orange_flowers2.png`,  scale: 1 },
  { id: "bush_pink_1",    label: "Pink Flower Bush",    category: "Bushes", path: `${NH}/bushes/Assets/Bush_pink_flowers1.png`,    scale: 1 },
  { id: "bush_red_1",     label: "Red Flower Bush",     category: "Bushes", path: `${NH}/bushes/Assets/Bush_red_flowers1.png`,     scale: 1 },
  { id: "bush_simple_1",  label: "Simple Bush",         category: "Bushes", path: `${NH}/bushes/Assets/Bush_simple1_1.png`,        scale: 1 },
  { id: "bush_simple_2",  label: "Simple Bush 2",       category: "Bushes", path: `${NH}/bushes/Assets/Bush_simple2_1.png`,        scale: 1 },
  { id: "cactus_1",       label: "Cactus",              category: "Bushes", path: `${NH}/bushes/Assets/Cactus1_1.png`,             scale: 1 },
  { id: "cactus_2",       label: "Tall Cactus",         category: "Bushes", path: `${NH}/bushes/Assets/Cactus2_1.png`,             scale: 1 },
  { id: "fern_1",         label: "Fern",                category: "Bushes", path: `${NH}/bushes/Assets/Fern1_1.png`,               scale: 1 },
  { id: "fern_2",         label: "Fern 2",              category: "Bushes", path: `${NH}/bushes/Assets/Fern2_1.png`,               scale: 1 },
  { id: "autumn_bush_1",  label: "Autumn Bush",         category: "Bushes", path: `${NH}/bushes/Assets/Autumn_bush1.png`,          scale: 1 },
  { id: "autumn_bush_2",  label: "Autumn Bush 2",       category: "Bushes", path: `${NH}/bushes/Assets/Autumn_bush2.png`,          scale: 1 },
  { id: "snow_bush_1",    label: "Snow Bush",           category: "Bushes", path: `${NH}/bushes/Assets/Snow_bush1.png`,            scale: 1 },
  { id: "broken_bush_1",  label: "Broken Bush",         category: "Bushes", path: `${NH}/bushes/Assets/Broken_tree1.png`,          scale: 1 },

  // ── Rocks
  { id: "rock_1", label: "Rock 1", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock1_1.png`, scale: 1 },
  { id: "rock_2", label: "Rock 2", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock2_1.png`, scale: 1 },
  { id: "rock_3", label: "Rock 3", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock3_1.png`, scale: 1 },
  { id: "rock_4", label: "Rock 4", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock4_1.png`, scale: 1 },
  { id: "rock_5", label: "Rock 5", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock5_1.png`, scale: 1 },
  { id: "rock_6", label: "Rock 6", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock6_1.png`, scale: 1 },
  { id: "rock_7", label: "Rock 7", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock7_1.png`, scale: 1 },
  { id: "rock_8", label: "Rock 8", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock8_1.png`, scale: 1 },
  { id: "rock_1b", label: "Rock Alt 1", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock1_2.png`, scale: 1 },
  { id: "rock_2b", label: "Rock Alt 2", category: "Rocks", path: `${NH}/rocks/Objects_separately/Rock2_2.png`, scale: 1 },

  // ── Indoor / Plants (small scale — suited for inside)
  { id: "plant_blue",   label: "Blue Plant",    category: "Indoor", path: `${NH}/bushes/Assets/Bush_blue_flowers1.png`,   scale: 0.55 },
  { id: "plant_orange", label: "Orange Plant",  category: "Indoor", path: `${NH}/bushes/Assets/Bush_orange_flowers1.png`, scale: 0.55 },
  { id: "plant_pink",   label: "Pink Plant",    category: "Indoor", path: `${NH}/bushes/Assets/Bush_pink_flowers1.png`,   scale: 0.55 },
  { id: "plant_red",    label: "Red Plant",     category: "Indoor", path: `${NH}/bushes/Assets/Bush_red_flowers1.png`,    scale: 0.55 },
  { id: "plant_fern",   label: "Indoor Fern",   category: "Indoor", path: `${NH}/bushes/Assets/Fern1_1.png`,              scale: 0.55 },
  { id: "plant_cactus", label: "Desk Cactus",   category: "Indoor", path: `${NH}/bushes/Assets/Cactus1_1.png`,            scale: 0.45 },
  { id: "plant_simple", label: "Green Plant",   category: "Indoor", path: `${NH}/bushes/Assets/Bush_simple1_1.png`,       scale: 0.55 },
  { id: "decor_rock_s", label: "Stone",         category: "Indoor", path: `${NH}/rocks/Objects_separately/Rock3_1.png`,   scale: 0.45 },
  { id: "decor_rock_m", label: "Pebble",        category: "Indoor", path: `${NH}/rocks/Objects_separately/Rock5_1.png`,   scale: 0.4  },
];

const CATALOG_MAP = Object.fromEntries(CATALOG.map(a => [a.id, a]));
const CATEGORIES = ["All", ...Array.from(new Set(CATALOG.map(a => a.category)))];
const SAVE_KEY = "newHomeLayout_v1";

// ─── SAVE / LOAD ─────────────────────────────────────────────────────────────
function loadLayout(): SaveData {
  if (typeof window === "undefined") return { outdoor: [], indoor: [] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch { /* ignore */ }
  return { outdoor: [], indoor: [] };
}
function saveLayout(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}
function clearLayout() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

let uidCounter = 0;
function nextUid() { return `item_${++uidCounter}_${Date.now()}`; }

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function NewHomePage() {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const gameRef       = useRef<unknown>(null);
  const pendingRef    = useRef<Pending[]>([]);

  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [scene,    setScene]    = useState<"outdoor" | "indoor">("outdoor");
  const [saveMsg,  setSaveMsg]  = useState("");

  const filtered = CATALOG.filter(a => {
    const q = search.toLowerCase();
    return (
      (a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)) &&
      (category === "All" || a.category === category)
    );
  });

  // ─── save handler (called from React UI — reads Phaser scene data) ─────────
  const handleSave = () => {
    const g = gameRef.current as { scene?: { getScene: (k: string) => unknown } } | null;
    if (!g?.scene) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outdoorScene = g.scene.getScene("Outdoor") as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indoorScene  = g.scene.getScene("Indoor")  as any;

    const outdoor: PlacedItem[] = outdoorScene?.collectItems?.() ?? [];
    const indoor:  PlacedItem[] = indoorScene?.collectItems?.()  ?? [];
    saveLayout({ outdoor, indoor });
    setSaveMsg("✓ Saved!");
    setTimeout(() => setSaveMsg(""), 2200);
  };

  const handleClear = () => {
    if (!confirm("Clear all placed items?")) return;
    clearLayout();
    window.location.reload();
  };

  // ─── drag from sidebar → canvas ───────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData("assetId", assetId);
    e.dataTransfer.effectAllowed = "copy";
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData("assetId");
    if (!assetId) return;
    const rect = canvasWrapRef.current!.getBoundingClientRect();
    pendingRef.current.push({ assetId, sx: e.clientX - rect.left, sy: e.clientY - rect.top });
  };

  // ─── Phaser ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    import("phaser").then(Phaser => {
      if (destroyed || !canvasWrapRef.current) return;

      const CW = Math.max(640, window.innerWidth - 284);
      const CH = window.innerHeight;

      // ── world / house constants ────────────────────────────────────────────
      const WORLD_W = 2400, WORLD_H = 1800;
      const HX = WORLD_W / 2, HY = WORLD_H / 2;   // house composite anchor
      // house_composite.png: 160×168px at 1× → scaled 3× = 480×504px
      // Door centre in composite: pixel (104, 120) → scaled (312, 360) from top-left
      const HOUSE_SCALE = 3;
      const HOUSE_LEFT = HX - 240;   // composite origin X in world
      const HOUSE_TOP  = HY - 350;   // composite origin Y in world
      const DOOR_X = HOUSE_LEFT + 104 * HOUSE_SCALE;   // = HX + 72
      const DOOR_Y = HOUSE_TOP  + 120 * HOUSE_SCALE;   // = HY + 10

      // ── character spritesheet layout ──────────────────────────────────────
      // Idle  768×256 → 64×64 frames → 12 cols × 4 rows (row=direction)
      // Walk  384×256 → 64×64 frames →  6 cols × 4 rows
      // Row order (top→bottom): 0=down, 1=left, 2=right, 3=up
      const FRAME_W = 64, FRAME_H = 64;
      const IDLE_COLS = 12, WALK_COLS = 6;

      function makeAnims(anims: Phaser.Animations.AnimationManager) {
        const dirs = ["down", "left", "right", "up"] as const;
        dirs.forEach((dir, row) => {
          const idleStart = row * IDLE_COLS;
          if (!anims.exists(`idle_${dir}`))
            anims.create({ key: `idle_${dir}`, frames: anims.generateFrameNumbers("char_idle", { start: idleStart, end: idleStart + IDLE_COLS - 1 }), frameRate: 5, repeat: -1 });
          const walkStart = row * WALK_COLS;
          if (!anims.exists(`walk_${dir}`))
            anims.create({ key: `walk_${dir}`, frames: anims.generateFrameNumbers("char_walk", { start: walkStart, end: walkStart + WALK_COLS - 1 }), frameRate: 8, repeat: -1 });
        });
      }

      // ── helpers shared between scenes ─────────────────────────────────────
      function buildControls(scene: Phaser.Scene) {
        const kb = scene.input.keyboard!;
        return {
          W:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          A:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          S:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          D:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          UP:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
          DOWN:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
          LEFT:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
          RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
          ENTER: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
        };
      }

      function movePlayer(
        player: Phaser.GameObjects.Sprite,
        keys: ReturnType<typeof buildControls>,
        speed: number,
        dt: number,
        dir: { val: string },
        minX: number, maxX: number, minY: number, maxY: number,
      ) {
        let vx = 0, vy = 0;
        if (keys.A.isDown || keys.LEFT.isDown)  { vx = -speed; dir.val = "left"; }
        else if (keys.D.isDown || keys.RIGHT.isDown) { vx = speed; dir.val = "right"; }
        if (keys.W.isDown || keys.UP.isDown)    { vy = -speed; dir.val = "up"; }
        else if (keys.S.isDown || keys.DOWN.isDown) { vy = speed; dir.val = "down"; }

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        const moving = vx !== 0 || vy !== 0;

        player.x = Phaser.Math.Clamp(player.x + vx * dt, minX, maxX);
        player.y = Phaser.Math.Clamp(player.y + vy * dt, minY, maxY);

        const animKey = moving ? `walk_${dir.val}` : `idle_${dir.val}`;
        if (player.anims.currentAnim?.key !== animKey) player.play(animKey, true);
      }

      function makePlacedGroup(scene: Phaser.Scene) {
        const group = scene.add.group();

        // Right-click anywhere → delete item under cursor
        scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
          if (!ptr.rightButtonDown()) return;
          for (const child of group.getChildren()) {
            const img = child as Phaser.GameObjects.Image;
            const hw = img.displayWidth / 2, hh = img.displayHeight / 2;
            const wx = ptr.worldX ?? ptr.x;
            const wy = ptr.worldY ?? ptr.y;
            if (Math.abs(img.x - wx) < hw && Math.abs(img.y - wy) < hh) {
              img.destroy();
              return;
            }
          }
        });

        return group;
      }

      function placeInGroup(
        scene: Phaser.Scene,
        group: Phaser.GameObjects.Group,
        assetId: string,
        x: number, y: number,
        scale: number,
      ) {
        const asset = CATALOG_MAP[assetId];
        if (!asset) return;

        const doPlace = () => {
          const img = scene.add.image(x, y, assetId).setScale(scale).setDepth(4);
          img.setData("assetId", assetId);
          img.setData("scale", scale);

          // Click to drag-reposition
          img.setInteractive({ cursor: "move" });
          scene.input.setDraggable(img);
          group.add(img);
        };

        if (!scene.textures.exists(assetId)) {
          scene.load.image(assetId, asset.path);
          scene.load.once("complete", doPlace);
          scene.load.start();
        } else {
          doPlace();
        }
      }

      function collectGroup(group: Phaser.GameObjects.Group, prefix: string): PlacedItem[] {
        return group.getChildren().map((obj, i) => {
          const img = obj as Phaser.GameObjects.Image;
          return {
            uid:     `${prefix}_${i}`,
            assetId: img.getData("assetId") as string,
            x: img.x, y: img.y,
            scale: img.scaleX,
          };
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  OUTDOOR SCENE
      // ═══════════════════════════════════════════════════════════════════════
      class OutdoorScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Sprite;
        private keys!: ReturnType<typeof buildControls>;
        private dir = { val: "down" };
        private placedGroup!: Phaser.GameObjects.Group;
        private hint!: Phaser.GameObjects.Text;

        constructor() { super("Outdoor"); }

        preload() {
          this.load.spritesheet("char_idle", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Idle_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
          this.load.spritesheet("char_walk", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Walk_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
          this.load.image("grass_tile", `${NH}/grass_tile.png`);
          this.load.image("house_composite", `${NH}/house_composite.png`);
          CATALOG.forEach(a => {
            if (!this.textures.exists(a.id)) this.load.image(a.id, a.path);
          });
        }

        create() {
          setScene("outdoor");

          // ── Grass background ──────────────────────────────────────────────
          this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "grass_tile").setOrigin(0, 0).setDepth(0);

          // ── Paths (decorative) ────────────────────────────────────────────
          const gfx = this.add.graphics().setDepth(1);
          gfx.fillStyle(0xc8a96e, 0.7);
          // Path from south edge up to door
          gfx.fillRect(DOOR_X - 24, DOOR_Y, 48, WORLD_H - DOOR_Y);

          // ── House (pixel-art composite from TMX tiles) ─────────────────────
          this.add.image(HOUSE_LEFT, HOUSE_TOP, "house_composite")
            .setOrigin(0, 0)
            .setScale(HOUSE_SCALE)
            .setDepth(2);

          // ── Placed items layer ────────────────────────────────────────────
          this.placedGroup = makePlacedGroup(this);
          this.input.on("drag", (_ptr: unknown, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
            obj.x = dx; obj.y = dy;
          });

          // Restore saved outdoor items
          const save = loadLayout();
          save.outdoor.forEach(item => {
            placeInGroup(this, this.placedGroup, item.assetId, item.x, item.y, item.scale);
          });

          // ── Character ─────────────────────────────────────────────────────
          this.player = this.add.sprite(DOOR_X, DOOR_Y + 90, "char_idle");
          this.player.setDepth(5).setScale(1.2);

          // ── Animations ────────────────────────────────────────────────────
          makeAnims(this.anims);
          this.player.play("idle_down");

          // ── Camera ───────────────────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

          // ── Controls ─────────────────────────────────────────────────────
          this.keys = buildControls(this);
          this.input.mouse?.disableContextMenu();

          // ── Register IndoorScene WITHOUT starting it ──────────────────────
          if (!this.scene.get("Indoor")) {
            this.scene.add("Indoor", IndoorScene, false);
          }

          // ── Door hint ────────────────────────────────────────────────────
          this.hint = this.add.text(DOOR_X, DOOR_Y + 18, "▼ ENTER", {
            fontSize: "11px", fontFamily: "Arial", color: "#fffbe6",
            backgroundColor: "#00000066", padding: { x: 5, y: 2 },
          }).setOrigin(0.5).setDepth(6);
        }

        // ── public API for React save handler ──────────────────────────────
        collectItems(): PlacedItem[] { return collectGroup(this.placedGroup, "out"); }

        update(_: number, delta: number) {
          const dt = delta / 1000;

          // Handle pending drops from sidebar
          while (pendingRef.current.length) {
            const p = pendingRef.current.shift()!;
            const cam = this.cameras.main;
            const wx = cam.worldView.x + p.sx / cam.zoom;
            const wy = cam.worldView.y + p.sy / cam.zoom;
            const asset = CATALOG_MAP[p.assetId];
            if (asset) placeInGroup(this, this.placedGroup, p.assetId, wx, wy, asset.scale);
          }

          // Move character
          movePlayer(this.player, this.keys, 200, dt, this.dir, 10, WORLD_W - 10, 10, WORLD_H - 10);

          // Keep placed items depth-sorted by Y
          this.placedGroup.getChildren().forEach(c => {
            (c as Phaser.GameObjects.Image).setDepth(3 + (c as Phaser.GameObjects.Image).y / 10000);
          });
          this.player.setDepth(3 + this.player.y / 10000 + 0.5);

          // Near-door hint and transition
          const dx = Math.abs(this.player.x - DOOR_X);
          const dy = Math.abs(this.player.y - DOOR_Y);
          const near = dx < 48 && dy < 48;
          this.hint.setVisible(near || dy < 120);

          if (near && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
            this.scene.switch("Indoor");
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  INDOOR SCENE
      // ═══════════════════════════════════════════════════════════════════════
      class IndoorScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Sprite;
        private keys!: ReturnType<typeof buildControls>;
        private dir = { val: "up" };
        private placedGroup!: Phaser.GameObjects.Group;

        constructor() { super("Indoor"); }

        preload() {
          ["char_idle", "char_walk"].forEach(k => {
            if (!this.textures.exists(k)) {
              const file = k === "char_idle" ? "Unarmed_Idle_without_shadow.png" : "Unarmed_Walk_without_shadow.png";
              this.load.spritesheet(k, `${NH}/character/PNG/Unarmed/Without_shadow/${file}`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
            }
          });
          if (!this.textures.exists("interior_floor"))
            this.load.image("interior_floor", `${NH}/interior_floor.png`);
          CATALOG.filter(a => a.category === "Indoor").forEach(a => {
            if (!this.textures.exists(a.id)) this.load.image(a.id, a.path);
          });
        }

        create() {
          setScene("indoor");
          const W = CW, H = CH;

          // ── Interior (pixel-art composite from TMX tiles) ─────────────────
          // interior_floor.png is 416×352px — scale to fill canvas height
          const iScale = Math.min(W / 416, H / 352);
          const iW = Math.round(416 * iScale), iH = Math.round(352 * iScale);
          // Dark background behind interior
          this.add.rectangle(W / 2, H / 2, W, H, 0x1a1208).setDepth(0);
          this.add.image(W / 2, H / 2, "interior_floor")
            .setDisplaySize(iW, iH)
            .setDepth(1);

          // ── Door hint (bottom centre) ─────────────────────────────────────
          this.add.text(W / 2, H - 90, "▼ ENTER to go outside", {
            fontSize: "11px", fontFamily: "Arial", color: "#fffbe6",
            backgroundColor: "#00000066", padding: { x: 5, y: 2 },
          }).setOrigin(0.5).setDepth(10);

          // ── Placed items layer ────────────────────────────────────────────
          this.placedGroup = makePlacedGroup(this);
          this.input.on("drag", (_ptr: unknown, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
            obj.x = dx; obj.y = dy;
          });

          // Restore saved indoor items
          const save = loadLayout();
          save.indoor.forEach(item => {
            placeInGroup(this, this.placedGroup, item.assetId, item.x, item.y, item.scale);
          });

          // ── Character ─────────────────────────────────────────────────────
          const iScaleInner = Math.min(W / 416, H / 352);
          const iHInner = Math.round(352 * iScaleInner);
          const wallH = Math.round(iHInner * 0.25); // approx top wall height
          this.player = this.add.sprite(W / 2, H / 2 - iHInner / 2 + wallH + 60, "char_idle");
          this.player.setDepth(5).setScale(1.2);

          makeAnims(this.anims);
          this.player.play("idle_down");

          // ── Controls ─────────────────────────────────────────────────────
          this.keys = buildControls(this);
          this.input.mouse?.disableContextMenu();
        }

        collectItems(): PlacedItem[] { return collectGroup(this.placedGroup, "in"); }

        update(_: number, delta: number) {
          const dt = delta / 1000;
          const W = CW, H = CH;

          // Handle pending drops from sidebar (indoor = screen coords = world coords)
          while (pendingRef.current.length) {
            const p = pendingRef.current.shift()!;
            const asset = CATALOG_MAP[p.assetId];
            if (asset) placeInGroup(this, this.placedGroup, p.assetId, p.sx, p.sy, asset.scale);
          }

          const iScaleMove = Math.min(W / 416, H / 352);
          const iWMove = Math.round(416 * iScaleMove), iHMove = Math.round(352 * iScaleMove);
          const left   = (W - iWMove) / 2 + 16;
          const right  = (W + iWMove) / 2 - 16;
          const top    = (H - iHMove) / 2 + Math.round(iHMove * 0.25); // below wall
          const bottom = (H + iHMove) / 2 - 16;
          movePlayer(this.player, this.keys, 180, dt, this.dir, left, right, top, bottom);

          // Depth-sort placed items
          this.placedGroup.getChildren().forEach(c => {
            (c as Phaser.GameObjects.Image).setDepth(3 + (c as Phaser.GameObjects.Image).y / 10000);
          });
          this.player.setDepth(3 + this.player.y / 10000 + 0.5);

          // Exit door — interior door is at bottom centre of the composite
          const iScaleExit = Math.min(W / 416, H / 352);
          const iHExit = Math.round(352 * iScaleExit);
          const doorBottomY = (H + iHExit) / 2 - 10;
          const nearDoor = Math.abs(this.player.x - W / 2) < 40 && this.player.y > doorBottomY - 60;
          if (nearDoor && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
            this.scene.switch("Outdoor");
          }
        }
      }

      // ── Phaser game config ─────────────────────────────────────────────────
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: CW,
        height: CH,
        parent: canvasWrapRef.current!,
        backgroundColor: "#3a7d3a",
        scene: [OutdoorScene],   // IndoorScene is added lazily in OutdoorScene.create()
        scale: { mode: Phaser.Scale.NONE },
      };

      const game = new Phaser.Game(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gameRef as any).current = game;
    });

    return () => {
      destroyed = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gameRef as any).current?.destroy(true);
    };
  }, []);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
      {/* ══ Asset Sidebar ══════════════════════════════════════════════════ */}
      <div style={{ width: 284, display: "flex", flexDirection: "column", background: "#1e293b", borderRight: "2px solid #334155", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #334155" }}>
          <Link href="/" style={{ color: "#64748b", fontSize: 11, textDecoration: "none" }}>← Games</Link>
          <h2 style={{ margin: "4px 0 10px", color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>🏡 New Home</h2>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 7,
              border: "1px solid #475569", background: "#0f172a",
              color: "#f1f5f9", fontSize: 13, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 10px", borderBottom: "1px solid #334155" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "3px 9px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: category === cat ? "#3b82f6" : "#334155",
                color:      category === cat ? "#fff"    : "#94a3b8",
                transition: "background 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {filtered.map(asset => (
              <div
                key={asset.id}
                draggable
                onDragStart={e => onDragStart(e, asset.id)}
                title={`Drag to place: ${asset.label}`}
                style={{
                  background: "#0f172a", border: "1px solid #334155", borderRadius: 8,
                  padding: "6px 6px 4px", cursor: "grab", textAlign: "center",
                  userSelect: "none", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
              >
                <img
                  src={asset.path} alt={asset.label}
                  draggable={false}
                  style={{ width: "100%", maxHeight: 56, objectFit: "contain", imageRendering: "pixelated" }}
                />
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3, lineHeight: 1.3, wordBreak: "break-word" }}>
                  {asset.label}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "span 2", color: "#64748b", fontSize: 12, textAlign: "center", padding: "24px 8px" }}>
                No items match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Controls & save footer */}
        <div style={{ padding: 12, borderTop: "1px solid #334155" }}>
          {/* Status badge */}
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: scene === "outdoor" ? "#16a34a" : "#7c3aed", color: "#fff",
            }}>
              {scene === "outdoor" ? "🏡 Outdoor" : "🛋️ Indoor"}
            </span>
            <span style={{ color: "#64748b", fontSize: 10 }}>WASD to move</span>
          </div>

          <div style={{ color: "#64748b", fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
            Drag items from panel → game world to place
            <br />Right-click a placed item to remove it
            <br />Press <kbd style={{ background: "#334155", color: "#e2e8f0", padding: "0 4px", borderRadius: 3 }}>ENTER</kbd> near the door to {scene === "outdoor" ? "enter home" : "go outside"}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                background: saveMsg ? "#22c55e" : "#3b82f6", color: "#fff",
                transition: "background 0.2s",
              }}
            >
              {saveMsg || "💾 Save Layout"}
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: "9px 10px", borderRadius: 7, border: "1px solid #ef4444", cursor: "pointer",
                fontSize: 12, background: "transparent", color: "#ef4444",
              }}
              title="Clear all placed items"
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      {/* ══ Game Canvas ════════════════════════════════════════════════════ */}
      <div
        ref={canvasWrapRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    </div>
  );
}
