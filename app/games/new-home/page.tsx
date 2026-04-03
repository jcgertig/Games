"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface AssetDef {
  id: string;
  label: string;
  category: string;
  path: string;
  scale?: number;
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
  sx: number;
  sy: number;
}

const NH = "/new_home";

// ─── ASSET CATALOG ───────────────────────────────────────────────────────────
const CATALOG: AssetDef[] = [
  // ── Trees (pre-cut PNGs) ──────────────────────────────────────────────────
  { id:"tree_1",           label:"Oak Tree",       category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Tree1.png`,           scale:1 },
  { id:"tree_2",           label:"Oak Tree 2",     category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Tree2.png`,           scale:1 },
  { id:"tree_3",           label:"Oak Tree 3",     category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Tree3.png`,           scale:1 },
  { id:"autumn_tree_1",    label:"Autumn Tree",    category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Autumn_tree1.png`,    scale:1 },
  { id:"autumn_tree_2",    label:"Autumn Tree 2",  category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Autumn_tree2.png`,    scale:1 },
  { id:"palm_1",           label:"Palm Tree",      category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Palm_tree1_1.png`,    scale:1 },
  { id:"palm_2",           label:"Palm Tree 2",    category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Palm_tree2_1.png`,    scale:1 },
  { id:"christmas_tree_1", label:"Christmas Tree", category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Christmas_tree1.png`, scale:1 },
  { id:"flower_tree_1",    label:"Flower Tree",    category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Flower_tree1.png`,    scale:1 },
  { id:"fruit_tree_1",     label:"Fruit Tree",     category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Fruit_tree1.png`,     scale:1 },
  { id:"moss_tree_1",      label:"Moss Tree",      category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Moss_tree1.png`,      scale:1 },
  { id:"snow_tree_1",      label:"Snow Tree",      category:"Trees",  path:`${NH}/trees/Assets_separately/Trees/Snow_tree1.png`,      scale:1 },

  // ── Bushes (pre-cut PNGs) ─────────────────────────────────────────────────
  { id:"bush_blue_1",   label:"Blue Flower Bush",   category:"Bushes", path:`${NH}/bushes/Assets/Bush_blue_flowers1.png`,   scale:1 },
  { id:"bush_orange_1", label:"Orange Flower Bush", category:"Bushes", path:`${NH}/bushes/Assets/Bush_orange_flowers1.png`, scale:1 },
  { id:"bush_pink_1",   label:"Pink Flower Bush",   category:"Bushes", path:`${NH}/bushes/Assets/Bush_pink_flowers1.png`,   scale:1 },
  { id:"bush_red_1",    label:"Red Flower Bush",    category:"Bushes", path:`${NH}/bushes/Assets/Bush_red_flowers1.png`,    scale:1 },
  { id:"bush_simple_1", label:"Simple Bush",        category:"Bushes", path:`${NH}/bushes/Assets/Bush_simple1_1.png`,       scale:1 },
  { id:"bush_simple_2", label:"Simple Bush 2",      category:"Bushes", path:`${NH}/bushes/Assets/Bush_simple2_1.png`,       scale:1 },
  { id:"cactus_1",      label:"Cactus",             category:"Bushes", path:`${NH}/bushes/Assets/Cactus1_1.png`,            scale:1 },
  { id:"fern_1",        label:"Fern",               category:"Bushes", path:`${NH}/bushes/Assets/Fern1_1.png`,              scale:1 },

  // ── Rocks (pre-cut PNGs) ──────────────────────────────────────────────────
  { id:"rock_1", label:"Rock 1", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock1_1.png`, scale:1 },
  { id:"rock_2", label:"Rock 2", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock2_1.png`, scale:1 },
  { id:"rock_3", label:"Rock 3", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock3_1.png`, scale:1 },
  { id:"rock_4", label:"Rock 4", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock4_1.png`, scale:1 },
  { id:"rock_5", label:"Rock 5", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock5_1.png`, scale:1 },
  { id:"rock_6", label:"Rock 6", category:"Rocks", path:`${NH}/rocks/Objects_separately/Rock6_1.png`, scale:1 },

  // ── Plants ───────────────────────────────────────────────────────────────
  { id:"plant_apple_tree_growth_1", label:"Apple Tree Growth 1", category:"Plants", path:`${NH}/farm/plants/apple_tree_growth_1.png`, scale:1 },
  { id:"plant_apple_tree_growth_2", label:"Apple Tree Growth 2", category:"Plants", path:`${NH}/farm/plants/apple_tree_growth_2.png`, scale:1 },
  { id:"plant_apple_tree_growth_3", label:"Apple Tree Growth 3", category:"Plants", path:`${NH}/farm/plants/apple_tree_growth_3.png`, scale:1 },
  { id:"plant_apple_tree_growth_4", label:"Apple Tree Growth 4", category:"Plants", path:`${NH}/farm/plants/apple_tree_growth_4.png`, scale:1 },
  { id:"plant_apple_tree_growth_5", label:"Apple Tree Growth 5", category:"Plants", path:`${NH}/farm/plants/apple_tree_growth_5.png`, scale:1 },
  { id:"plant_banana_tree_growth_1", label:"Banana Tree Growth 1", category:"Plants", path:`${NH}/farm/plants/banana_tree_growth_1.png`, scale:1 },
  { id:"plant_banana_tree_growth_2", label:"Banana Tree Growth 2", category:"Plants", path:`${NH}/farm/plants/banana_tree_growth_2.png`, scale:1 },
  { id:"plant_banana_tree_growth_3", label:"Banana Tree Growth 3", category:"Plants", path:`${NH}/farm/plants/banana_tree_growth_3.png`, scale:1 },
  { id:"plant_banana_tree_growth_4", label:"Banana Tree Growth 4", category:"Plants", path:`${NH}/farm/plants/banana_tree_growth_4.png`, scale:1 },
  { id:"plant_banana_tree_growth_5", label:"Banana Tree Growth 5", category:"Plants", path:`${NH}/farm/plants/banana_tree_growth_5.png`, scale:1 },
  { id:"plant_blue_berry_plant_growth_1", label:"Blue Berry Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/blue_berry_plant_growth_1.png`, scale:1 },
  { id:"plant_blue_berry_plant_growth_2", label:"Blue Berry Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/blue_berry_plant_growth_2.png`, scale:1 },
  { id:"plant_blue_berry_plant_growth_3", label:"Blue Berry Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/blue_berry_plant_growth_3.png`, scale:1 },
  { id:"plant_blue_berry_plant_harvested", label:"Blue Berry Plant Harvested", category:"Plants", path:`${NH}/farm/plants/blue_berry_plant_harvested.png`, scale:1 },
  { id:"plant_cauliflower_plant_growth_1", label:"Cauliflower Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/cauliflower_plant_growth_1.png`, scale:1 },
  { id:"plant_cauliflower_plant_growth_2", label:"Cauliflower Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/cauliflower_plant_growth_2.png`, scale:1 },
  { id:"plant_cauliflower_plant_growth_3", label:"Cauliflower Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/cauliflower_plant_growth_3.png`, scale:1 },
  { id:"plant_cauliflower_plant_harvested", label:"Cauliflower Plant Harvested", category:"Plants", path:`${NH}/farm/plants/cauliflower_plant_harvested.png`, scale:1 },
  { id:"plant_green_pepper_plant_growth_1", label:"Green Pepper Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/green_pepper_plant_growth_1.png`, scale:1 },
  { id:"plant_green_pepper_plant_growth_2", label:"Green Pepper Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/green_pepper_plant_growth_2.png`, scale:1 },
  { id:"plant_green_pepper_plant_growth_3", label:"Green Pepper Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/green_pepper_plant_growth_3.png`, scale:1 },
  { id:"plant_green_pepper_plant_harvested", label:"Green Pepper Plant Harvested", category:"Plants", path:`${NH}/farm/plants/green_pepper_plant_harvested.png`, scale:1 },
  { id:"plant_lemon_tree_growth_1", label:"Lemon Tree Growth 1", category:"Plants", path:`${NH}/farm/plants/lemon_tree_growth_1.png`, scale:1 },
  { id:"plant_lemon_tree_growth_2", label:"Lemon Tree Growth 2", category:"Plants", path:`${NH}/farm/plants/lemon_tree_growth_2.png`, scale:1 },
  { id:"plant_lemon_tree_growth_3", label:"Lemon Tree Growth 3", category:"Plants", path:`${NH}/farm/plants/lemon_tree_growth_3.png`, scale:1 },
  { id:"plant_lemon_tree_growth_4", label:"Lemon Tree Growth 4", category:"Plants", path:`${NH}/farm/plants/lemon_tree_growth_4.png`, scale:1 },
  { id:"plant_lemon_tree_growth_5", label:"Lemon Tree Growth 5", category:"Plants", path:`${NH}/farm/plants/lemon_tree_growth_5.png`, scale:1 },
  { id:"plant_pepper_plant_growth_1", label:"Pepper Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/pepper_plant_growth_1.png`, scale:1 },
  { id:"plant_pepper_plant_growth_2", label:"Pepper Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/pepper_plant_growth_2.png`, scale:1 },
  { id:"plant_pepper_plant_growth_3", label:"Pepper Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/pepper_plant_growth_3.png`, scale:1 },
  { id:"plant_pepper_plant_harvested", label:"Pepper Plant Harvested", category:"Plants", path:`${NH}/farm/plants/pepper_plant_harvested.png`, scale:1 },
  { id:"plant_pickle_plant_growth_1", label:"Pickle Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/pickle_plant_growth_1.png`, scale:1 },
  { id:"plant_pickle_plant_growth_2", label:"Pickle Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/pickle_plant_growth_2.png`, scale:1 },
  { id:"plant_pickle_plant_growth_3", label:"Pickle Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/pickle_plant_growth_3.png`, scale:1 },
  { id:"plant_pickle_plant_harvested", label:"Pickle Plant Harvested", category:"Plants", path:`${NH}/farm/plants/pickle_plant_harvested.png`, scale:1 },
  { id:"plant_plum_tree_growth_1", label:"Plum Tree Growth 1", category:"Plants", path:`${NH}/farm/plants/plum_tree_growth_1.png`, scale:1 },
  { id:"plant_plum_tree_growth_2", label:"Plum Tree Growth 2", category:"Plants", path:`${NH}/farm/plants/plum_tree_growth_2.png`, scale:1 },
  { id:"plant_plum_tree_growth_3", label:"Plum Tree Growth 3", category:"Plants", path:`${NH}/farm/plants/plum_tree_growth_3.png`, scale:1 },
  { id:"plant_plum_tree_growth_4", label:"Plum Tree Growth 4", category:"Plants", path:`${NH}/farm/plants/plum_tree_growth_4.png`, scale:1 },
  { id:"plant_plum_tree_growth_5", label:"Plum Tree Growth 5", category:"Plants", path:`${NH}/farm/plants/plum_tree_growth_5.png`, scale:1 },
  { id:"plant_brocolli_plant_growth_1", label:"Broccoli Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/brocolli_plant_growth_1.png`, scale:1 },
  { id:"plant_brocolli_plant_growth_2", label:"Broccoli Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/brocolli_plant_growth_2.png`, scale:1 },
  { id:"plant_brocolli_plant_growth_3", label:"Broccoli Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/brocolli_plant_growth_3.png`, scale:1 },
  { id:"plant_brocolli_plant_harvested", label:"Broccoli Plant Harvested", category:"Plants", path:`${NH}/farm/plants/brocolli_plant_harvested.png`, scale:1 },
  { id:"plant_brown_mushroom_plant_growth_1", label:"Brown Mushroom Growth 1", category:"Plants", path:`${NH}/farm/plants/brown_mushroom_plant_growth_1.png`, scale:1 },
  { id:"plant_brown_mushroom_plant_growth_2", label:"Brown Mushroom Growth 2", category:"Plants", path:`${NH}/farm/plants/brown_mushroom_plant_growth_2.png`, scale:1 },
  { id:"plant_brown_mushroom_plant_growth_3", label:"Brown Mushroom Growth 3", category:"Plants", path:`${NH}/farm/plants/brown_mushroom_plant_growth_3.png`, scale:1 },
  { id:"plant_brown_mushroom_plant_harvested", label:"Brown Mushroom Harvested", category:"Plants", path:`${NH}/farm/plants/brown_mushroom_plant_harvested.png`, scale:1 },
  { id:"plant_carrot_plant_growth_1", label:"Carrot Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/carrot_plant_growth_1.png`, scale:1 },
  { id:"plant_carrot_plant_growth_2", label:"Carrot Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/carrot_plant_growth_2.png`, scale:1 },
  { id:"plant_carrot_plant_growth_3", label:"Carrot Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/carrot_plant_growth_3.png`, scale:1 },
  { id:"plant_carrot_plant_harvested", label:"Carrot Plant Harvested", category:"Plants", path:`${NH}/farm/plants/carrot_plant_harvested.png`, scale:1 },
  { id:"plant_coconut_tree_growth_1", label:"Coconut Tree Growth 1", category:"Plants", path:`${NH}/farm/plants/coconut_tree_growth_1.png`, scale:1 },
  { id:"plant_coconut_tree_growth_2", label:"Coconut Tree Growth 2", category:"Plants", path:`${NH}/farm/plants/coconut_tree_growth_2.png`, scale:1 },
  { id:"plant_coconut_tree_growth_3", label:"Coconut Tree Growth 3", category:"Plants", path:`${NH}/farm/plants/coconut_tree_growth_3.png`, scale:1 },
  { id:"plant_coconut_tree_growth_4", label:"Coconut Tree Growth 4", category:"Plants", path:`${NH}/farm/plants/coconut_tree_growth_4.png`, scale:1 },
  { id:"plant_coconut_tree_growth_5", label:"Coconut Tree Growth 5", category:"Plants", path:`${NH}/farm/plants/coconut_tree_growth_5.png`, scale:1 },
  { id:"plant_mushroom_plant_growth_1", label:"Mushroom Plant Growth 1", category:"Plants", path:`${NH}/farm/plants/mushroom_plant_growth_1.png`, scale:1 },
  { id:"plant_mushroom_plant_growth_2", label:"Mushroom Plant Growth 2", category:"Plants", path:`${NH}/farm/plants/mushroom_plant_growth_2.png`, scale:1 },
  { id:"plant_mushroom_plant_growth_3", label:"Mushroom Plant Growth 3", category:"Plants", path:`${NH}/farm/plants/mushroom_plant_growth_3.png`, scale:1 },
  { id:"plant_mushroom_plant_harvested", label:"Mushroom Plant Harvested", category:"Plants", path:`${NH}/farm/plants/mushroom_plant_harvested.png`, scale:1 },

];

const CATALOG_MAP = Object.fromEntries(CATALOG.map(a => [a.id, a]));
const CATEGORIES = ["All", ...Array.from(new Set(CATALOG.map(a => a.category)))];
const SAVE_KEY = "newHomeLayout_v3";

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
void nextUid;

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

  const onDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData("assetId", assetId);
    e.dataTransfer.effectAllowed = "copy";
  };
  const onDragOver  = (e: React.DragEvent) => e.preventDefault();
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

      // ── World & tilemap constants ──────────────────────────────────────────
      const WORLD_W = 4800, WORLD_H = 3600;   // bigger build area
      const MAP_SCALE = 3;     // tilemap rendered at 3× (16px tile → 48px)
      const TILE = 16;
      const TS = TILE * MAP_SCALE;  // 48px per scaled tile

      // Centre the house by positioning tile(0,0) so the door lands at world centre.
      // Door centre in tile coords: (-3.5, 1.5)
      // MAP_X + DOOR_TILE_CX * TS = HX  →  MAP_X = HX - DOOR_TILE_CX * TS
      const DOOR_TILE_CX = -3.5, DOOR_TILE_CY = 1.5;
      const HX = WORLD_W / 2, HY = WORLD_H / 2;  // 2400, 1800
      const MAP_X = Math.round(HX - DOOR_TILE_CX * TS);  // 2400 + 168 = 2568
      const MAP_Y = Math.round(HY - DOOR_TILE_CY * TS);  // 1800 − 72  = 1728

      const DOOR_X = MAP_X + DOOR_TILE_CX * TS;  // ≈ 2400
      const DOOR_Y = MAP_Y + DOOR_TILE_CY * TS;  // ≈ 1800

      // House wall bounds (tiles x=-10..-1, y=-2..2)
      const WALL_LEFT   = MAP_X + (-10) * TS;
      const WALL_RIGHT  = MAP_X + (0)   * TS;
      const WALL_TOP    = MAP_Y + (-2)  * TS;
      const WALL_BOTTOM = MAP_Y + (3)   * TS;

      const HOUSE_WALL_DEPTH = 3 + WALL_BOTTOM / 10000;
      const HOUSE_ROOF_DEPTH = 200;

      // ── Character spritesheet ─────────────────────────────────────────────
      const FRAME_W = 64, FRAME_H = 64;
      const IDLE_COLS = 12, WALK_COLS = 6;

      function makeAnims(anims: Phaser.Animations.AnimationManager) {
        const dirs = ["down", "left", "right", "up"] as const;
        dirs.forEach((dir, row) => {
          const is = row * IDLE_COLS, ws = row * WALK_COLS;
          if (!anims.exists(`idle_${dir}`))
            anims.create({ key: `idle_${dir}`, frames: anims.generateFrameNumbers("char_idle", { start: is, end: is + IDLE_COLS - 1 }), frameRate: 5, repeat: -1 });
          if (!anims.exists(`walk_${dir}`))
            anims.create({ key: `walk_${dir}`, frames: anims.generateFrameNumbers("char_walk", { start: ws, end: ws + WALK_COLS - 1 }), frameRate: 8, repeat: -1 });
        });
      }

      function buildControls(scene: Phaser.Scene) {
        const kb = scene.input.keyboard!;
        return {
          W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
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
        speed: number, dt: number,
        dir: { val: string },
        minX: number, maxX: number, minY: number, maxY: number,
      ) {
        let vx = 0, vy = 0;
        if (keys.A.isDown || keys.LEFT.isDown)       { vx = -speed; dir.val = "left"; }
        else if (keys.D.isDown || keys.RIGHT.isDown) { vx =  speed; dir.val = "right"; }
        if (keys.W.isDown || keys.UP.isDown)         { vy = -speed; dir.val = "up"; }
        else if (keys.S.isDown || keys.DOWN.isDown)  { vy =  speed; dir.val = "down"; }
        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        const moving = vx !== 0 || vy !== 0;
        player.x = Phaser.Math.Clamp(player.x + vx * dt, minX, maxX);
        player.y = Phaser.Math.Clamp(player.y + vy * dt, minY, maxY);
        const animKey = moving ? `walk_${dir.val}` : `idle_${dir.val}`;
        if (player.anims.currentAnim?.key !== animKey) player.play(animKey, true);
      }

      function makePlacedGroup(scene: Phaser.Scene) {
        const group = scene.add.group();
        scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
          if (!ptr.rightButtonDown()) return;
          for (const child of group.getChildren()) {
            const img = child as Phaser.GameObjects.Image;
            const hw = img.displayWidth / 2, hh = img.displayHeight / 2;
            const wx = ptr.worldX ?? ptr.x, wy = ptr.worldY ?? ptr.y;
            if (Math.abs(img.x - wx) < hw && Math.abs(img.y - wy) < hh) {
              img.destroy(); return;
            }
          }
        });
        return group;
      }

      // Place a catalog item in a group.
      function placeInGroup(
        scene: Phaser.Scene,
        group: Phaser.GameObjects.Group,
        assetId: string, x: number, y: number, savedScale?: number,
      ) {
        const asset = CATALOG_MAP[assetId];
        if (!asset?.path) return;
        const scale = savedScale ?? (asset.scale ?? 1);
        const doPlace = () => {
          const img = scene.add.image(x, y, assetId).setScale(scale).setDepth(4);
          img.setData("assetId", assetId);
          img.setData("scale", scale);
          img.setInteractive({ cursor: "move" });
          scene.input.setDraggable(img);
          group.add(img);
        };
        if (!scene.textures.exists(assetId)) {
          scene.load.image(assetId, asset.path);
          scene.load.once("complete", doPlace);
          scene.load.start();
        } else { doPlace(); }
      }

      function collectGroup(group: Phaser.GameObjects.Group, prefix: string): PlacedItem[] {
        return group.getChildren().map((obj, i) => {
          const img = obj as Phaser.GameObjects.Image;
          return { uid: `${prefix}_${i}`, assetId: img.getData("assetId") as string, x: img.x, y: img.y, scale: img.scaleX };
        });
      }

      // Create a tilemap layer with scale, position, and depth.
      function addLayer(
        map: Phaser.Tilemaps.Tilemap,
        nameOrIndex: string | number,
        tilesets: (Phaser.Tilemaps.Tileset | null)[],
        x: number, y: number, scale: number, depth: number,
      ) {
        const validTs = tilesets.filter(Boolean) as Phaser.Tilemaps.Tileset[];
        const layer = map.createLayer(nameOrIndex as string, validTs, x, y);
        if (layer) { layer.setScale(scale).setDepth(depth); }
        return layer;
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  OUTDOOR SCENE
      //  – Renders ONLY the house (layers 14–17).
      //  – Grass tileSprite fills the entire world as background.
      //  – Exterior catalog items are available to place anywhere in the world.
      // ═══════════════════════════════════════════════════════════════════════
      class OutdoorScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Sprite;
        private keys!: ReturnType<typeof buildControls>;
        private dir = { val: "down" };
        private placedGroup!: Phaser.GameObjects.Group;
        private hint!: Phaser.GameObjects.Text;

        constructor() { super("Outdoor"); }

        preload() {
          // Character sprites
          this.load.spritesheet("char_idle", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Idle_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
          this.load.spritesheet("char_walk", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Walk_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });

          // Grass background tile
          this.load.image("grass_tile", `${NH}/grass_tile.png`);

          // Exterior tilemap JSON — only the house layers will be rendered
          this.load.tilemapTiledJSON("exterior_map", `${NH}/home/Exterior.json`);
          // Tilesets actually used by house layers (14-17): house_details, Smoke_animation, Doors_windows_animation
          this.load.image("ts_house",      `${NH}/home/house_details.png`);
          this.load.image("ts_smoke_tile", `${NH}/home/Smoke_animation.png`);
          this.load.image("ts_doors",      `${NH}/home/Doors_windows_animation.png`);

          // Pre-load PNG-based catalog items
          CATALOG.filter(a => a.path && a.category !== "Furniture").forEach(a => {
            if (!this.textures.exists(a.id)) this.load.image(a.id, a.path!);
          });
        }

        create() {
          setScene("outdoor");

          // ── Grass background (fills entire world) ────────────────────────
          this.add.tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, "grass_tile").setDepth(0);

          // ── Build tilemap — house layers only ─────────────────────────────
          const map = this.make.tilemap({ key: "exterior_map" });

          // The house layers reference house_details, Smoke_animation, Doors_windows_animation.
          // We also add ground tilesets as null-safe (not loaded, but needed for non-house layers
          // to avoid Phaser warnings when we DON'T create those layers).
          const ts_hd = map.addTilesetImage("house_details",          "ts_house");
          const ts_sm = map.addTilesetImage("Smoke_animation",        "ts_smoke_tile");
          const ts_dw = map.addTilesetImage("Doors_windows_animation","ts_doors");
          const houseTs = [ts_hd, ts_sm, ts_dw];

          const L = (n: string | number, d: number) =>
            addLayer(map, n, houseTs, MAP_X, MAP_Y, MAP_SCALE, d);

          // Only render house layers; skip all ground/grass/object/fence layers
          L(14, HOUSE_WALL_DEPTH);          // House_wall
          L(15, HOUSE_WALL_DEPTH + 0.05);   // windows1
          L(16, HOUSE_WALL_DEPTH + 0.10);   // windows2
          L(17, HOUSE_ROOF_DEPTH);           // House_roof

          // ── Placed-items layer ────────────────────────────────────────────
          this.placedGroup = makePlacedGroup(this);
          this.input.on("drag", (_: unknown, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
            obj.x = dx; obj.y = dy;
          });

          // Restore saved outdoor items
          const save = loadLayout();
          save.outdoor.forEach(item => {
            placeInGroup(this, this.placedGroup, item.assetId, item.x, item.y, item.scale);
          });

          // ── Player character ──────────────────────────────────────────────
          this.player = this.add.sprite(DOOR_X, DOOR_Y + 90, "char_idle");
          this.player.setDepth(5).setScale(1.2);
          makeAnims(this.anims);
          this.player.play("idle_down");

          // ── Camera ────────────────────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

          // ── Controls ─────────────────────────────────────────────────────
          this.keys = buildControls(this);
          this.input.mouse?.disableContextMenu();

          // ── Lazy-register IndoorScene ─────────────────────────────────────
          if (!this.scene.get("Indoor")) {
            this.scene.add("Indoor", IndoorScene, false);
          }

          // ── Door hint ─────────────────────────────────────────────────────
          this.hint = this.add.text(DOOR_X, DOOR_Y - 30, "▼ ENTER", {
            fontSize: "11px", fontFamily: "Arial", color: "#fffbe6",
            backgroundColor: "#00000066", padding: { x: 5, y: 2 },
          }).setOrigin(0.5).setDepth(HOUSE_ROOF_DEPTH + 1);
        }

        collectItems(): PlacedItem[] { return collectGroup(this.placedGroup, "out"); }

        update(_: number, delta: number) {
          const dt = delta / 1000;

          // Consume sidebar drops
          while (pendingRef.current.length) {
            const p = pendingRef.current.shift()!;
            const cam = this.cameras.main;
            const wx = cam.worldView.x + p.sx / cam.zoom;
            const wy = cam.worldView.y + p.sy / cam.zoom;
            const asset = CATALOG_MAP[p.assetId];
            if (asset) placeInGroup(this, this.placedGroup, p.assetId, wx, wy);
          }

          const prevX = this.player.x, prevY = this.player.y;
          movePlayer(this.player, this.keys, 200, dt, this.dir, 10, WORLD_W - 10, 10, WORLD_H - 10);

          // House wall collision (player can only pass through door opening)
          const pFeetY = this.player.y + 20;
          const inWallX = this.player.x > WALL_LEFT  && this.player.x < WALL_RIGHT;
          const inWallY = pFeetY > WALL_TOP && pFeetY < WALL_BOTTOM;
          const atDoor  = Math.abs(this.player.x - DOOR_X) < 36;
          if (inWallX && inWallY && !atDoor) {
            this.player.x = prevX; this.player.y = prevY;
          }

          // Placed entity collision
          for (const child of this.placedGroup.getChildren()) {
            const obj = child as Phaser.GameObjects.Image;
            const hw = obj.displayWidth  * 0.15;
            const hh = obj.displayHeight * 0.10;
            const baseY = obj.y + obj.displayHeight * 0.40;
            if (Math.abs(this.player.x - obj.x) < hw && Math.abs(pFeetY - baseY) < hh) {
              this.player.x = prevX; this.player.y = prevY; break;
            }
          }

          // Y-depth sort
          this.placedGroup.getChildren().forEach(c => {
            const img = c as Phaser.GameObjects.Image;
            img.setDepth(3 + (img.y + img.displayHeight * 0.40) / 10000);
          });
          this.player.setDepth(3 + pFeetY / 10000 + 0.0001);

          // Door transition
          const nearDoor = Math.abs(this.player.x - DOOR_X) < 50 && Math.abs(this.player.y - DOOR_Y) < 80;
          this.hint.setVisible(nearDoor);
          if (nearDoor && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
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
        private walkLeft   = 0;
        private walkRight  = CW;
        private walkTop    = 0;
        private walkBottom = CH;

        constructor() { super("Indoor"); }

        preload() {
          if (!this.textures.exists("char_idle"))
            this.load.spritesheet("char_idle", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Idle_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });
          if (!this.textures.exists("char_walk"))
            this.load.spritesheet("char_walk", `${NH}/character/PNG/Unarmed/Without_shadow/Unarmed_Walk_without_shadow.png`, { frameWidth: FRAME_W, frameHeight: FRAME_H });

          if (!this.cache.tilemap.has("interior_map"))
            this.load.tilemapTiledJSON("interior_map", `${NH}/home/Interior.json`);
          if (!this.textures.exists("ts_int_walls"))
            this.load.image("ts_int_walls",  `${NH}/home/walls_floor.png`);
          if (!this.textures.exists("ts_int_items"))
            this.load.image("ts_int_items",  `${NH}/home/Interior.png`);
          if (!this.textures.exists("ts_int_doors"))
            this.load.image("ts_int_doors",  `${NH}/home/Doors_windows_animation.png`);

          CATALOG.filter(a => a.path).forEach(a => {
            if (!this.textures.exists(a.id)) this.load.image(a.id, a.path!);
          });
        }

        create() {
          setScene("indoor");

          // ── Interior tilemap ──────────────────────────────────────────────
          const CORE_TILES  = 32;
          const INT_SCALE   = Math.min(CW / (CORE_TILES * TILE), CH / (CORE_TILES * TILE));
          const INT_TILE    = TILE * INT_SCALE;
          const INT_MAP_X   = CW / 2;
          const INT_MAP_Y   = CH / 2;

          this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x1a1208).setDepth(0);

          const map = this.make.tilemap({ key: "interior_map" });
          const ts_w = map.addTilesetImage("walls_floor",             "ts_int_walls");
          const ts_i = map.addTilesetImage("Interior",                "ts_int_items");
          const ts_d = map.addTilesetImage("Doors_windows_animation", "ts_int_doors");
          const allTs = [ts_w, ts_i, ts_d];

          const LI = (n: string | number, d: number) =>
            addLayer(map, n, allTs, INT_MAP_X, INT_MAP_Y, INT_SCALE, d);

          LI(0, 1.0);  // Floor
          LI(1, 1.1);  // Tile Layer 6
          LI(2, 1.2);  // Boxes
          LI(3, 5.0);  // Walls
          LI(4, 5.1);  // Windows
          LI(5, 2.0);  // Objects1
          LI(6, 2.1);  // Objects2

          // ── Walkable bounds ────────────────────────────────────────────────
          const WALK_HALF = 10;
          this.walkLeft   = INT_MAP_X + (-WALK_HALF) * INT_TILE;
          this.walkRight  = INT_MAP_X + ( WALK_HALF) * INT_TILE;
          this.walkTop    = INT_MAP_Y + (-WALK_HALF) * INT_TILE + INT_TILE * 2;
          this.walkBottom = INT_MAP_Y + ( WALK_HALF) * INT_TILE - INT_TILE;

          this.add.text(CW / 2, CH - 24, "▼ ENTER near door to go outside", {
            fontSize: "11px", fontFamily: "Arial", color: "#fffbe6",
            backgroundColor: "#00000066", padding: { x: 5, y: 2 },
          }).setOrigin(0.5).setDepth(10);

          // ── Placed-items layer ─────────────────────────────────────────────
          this.placedGroup = makePlacedGroup(this);
          this.input.on("drag", (_: unknown, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
            obj.x = dx; obj.y = dy;
          });

          const save = loadLayout();
          save.indoor.forEach(item => {
            placeInGroup(this, this.placedGroup, item.assetId, item.x, item.y, item.scale);
          });

          // ── Player character ──────────────────────────────────────────────
          this.player = this.add.sprite(CW / 2, this.walkBottom - 40, "char_idle");
          this.player.setDepth(3).setScale(1.2);
          makeAnims(this.anims);
          this.player.play("idle_up");

          this.keys = buildControls(this);
          this.input.mouse?.disableContextMenu();
        }

        collectItems(): PlacedItem[] { return collectGroup(this.placedGroup, "in"); }

        update(_: number, delta: number) {
          const dt = delta / 1000;

          while (pendingRef.current.length) {
            const p = pendingRef.current.shift()!;
            placeInGroup(this, this.placedGroup, p.assetId, p.sx, p.sy);
          }

          movePlayer(
            this.player, this.keys, 180, dt, this.dir,
            this.walkLeft, this.walkRight, this.walkTop, this.walkBottom,
          );

          const pFeetY = this.player.y + 20;
          this.placedGroup.getChildren().forEach(c => {
            const img = c as Phaser.GameObjects.Image;
            img.setDepth(2 + img.y / 10000);
          });
          this.player.setDepth(2 + pFeetY / 10000 + 0.0001);

          const nearBottomDoor =
            Math.abs(this.player.x - CW / 2) < 50 &&
            this.player.y > this.walkBottom - 30;
          if (nearBottomDoor && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
            this.scene.switch("Outdoor");
          }
        }
      }

      // ── Game config ────────────────────────────────────────────────────────
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: CW, height: CH,
        parent: canvasWrapRef.current!,
        backgroundColor: "#3a7d3a",
        scene: [OutdoorScene],
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
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ width: 284, display: "flex", flexDirection: "column", background: "#1e293b", borderRight: "2px solid #334155", flexShrink: 0 }}>

        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #334155" }}>
          <Link href="/" style={{ color: "#64748b", fontSize: 11, textDecoration: "none" }}>← Games</Link>
          <h2 style={{ margin: "4px 0 10px", color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>🏡 New Home</h2>
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #475569", background: "#0f172a", color: "#f1f5f9", fontSize: 13, boxSizing: "border-box", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 10px", borderBottom: "1px solid #334155" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: "3px 9px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: category === cat ? "#3b82f6" : "#334155",
              color:      category === cat ? "#fff"    : "#94a3b8",
            }}>{cat}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {filtered.map(asset => (
              <div key={asset.id} draggable onDragStart={e => onDragStart(e, asset.id)}
                title={`Drag to place: ${asset.label}`}
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "6px 6px 4px", cursor: "grab", textAlign: "center", userSelect: "none" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
              >
                <img src={asset.path} alt={asset.label} draggable={false}
                  style={{ width: "100%", maxHeight: 52, objectFit: "contain", imageRendering: "pixelated" }} />
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

        <div style={{ padding: 12, borderTop: "1px solid #334155" }}>
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: scene === "outdoor" ? "#16a34a" : "#7c3aed", color: "#fff" }}>
              {scene === "outdoor" ? "🏡 Outdoor" : "🛋️ Indoor"}
            </span>
            <span style={{ color: "#64748b", fontSize: 10 }}>WASD to move</span>
          </div>
          <div style={{ color: "#64748b", fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
            Drag items from panel → game world to place<br />
            Right-click a placed item to remove it<br />
            Press <kbd style={{ background: "#334155", color: "#e2e8f0", padding: "0 4px", borderRadius: 3 }}>ENTER</kbd> near door to {scene === "outdoor" ? "enter home" : "go outside"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSave} style={{
              flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: saveMsg ? "#22c55e" : "#3b82f6", color: "#fff",
            }}>{saveMsg || "💾 Save Layout"}</button>
            <button onClick={handleClear} style={{
              padding: "9px 10px", borderRadius: 7, border: "1px solid #ef4444", cursor: "pointer", fontSize: 12, background: "transparent", color: "#ef4444",
            }} title="Clear all placed items">🗑</button>
          </div>
        </div>
      </div>

      {/* ── Game Canvas ──────────────────────────────────────────────────── */}
      <div ref={canvasWrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onDragOver={onDragOver} onDrop={onDrop} />
    </div>
  );
}
