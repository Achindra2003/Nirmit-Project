import { create } from 'zustand';

export type RoomType = 'bedroom' | 'living-room' | 'dining-room' | 'study' | 'kitchen';
export type RoomShape = 'rectangle' | 'l-shape';
export type PlannerViewMode = '2D' | '3D';
export type FlooringFinish = 'vitrified-tiles' | 'wood-laminate' | 'marble';

export interface RoomConfig {
  type: RoomType;
  width: number;
  length: number;
  shape: RoomShape;
}

export interface MaterialConfig {
  wallColor: string;
  flooring: FlooringFinish;
  woodFinish: string;
}

export interface DoorWindowItem {
  id: string;
  type: 'door' | 'window';
  wallIndex: number;
  position: number;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height: number;
  rotation: number;
  color: string;
  modelPath?: string;
  price: number;
  brand: string;
}

export type ItemDraft = Omit<Item, 'id'>;

interface RoomRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface AdvisoryState {
  spatial: string[];
  vastu: string[];
}

interface StoreState {
  items: Item[];
  activeItemId: string | null;
  room: RoomConfig;
  materials: MaterialConfig;
  viewMode: PlannerViewMode;
  advisories: AdvisoryState;
  doorWindows: DoorWindowItem[];
  addItem: (item: ItemDraft) => void;
  replaceItems: (items: Item[]) => void;
  clearItems: () => void;
  updateItemPos: (id: string, x: number, y: number) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;
  rotateItem: (id: string, delta?: number) => void;
  setActiveItem: (id: string | null) => void;
  setRoomConfig: (patch: Partial<RoomConfig>) => void;
  setMaterialConfig: (patch: Partial<MaterialConfig>) => void;
  setViewMode: (mode: PlannerViewMode) => void;
  setDoorWindows: (items: DoorWindowItem[]) => void;
  checkCollision: (id: string, newX: number, newY: number) => boolean;
  recomputeAdvisories: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRotation(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getFootprint(width: number, length: number, rotation: number) {
  const quarterTurns = Math.round(normalizeRotation(rotation) / 90) % 2;
  if (quarterTurns === 0) {
    return { width, length };
  }
  return { width: length, length: width };
}

function getRect(width: number, length: number, x: number, y: number, rotation = 0): RoomRect {
  const footprint = getFootprint(width, length, rotation);
  return {
    left: x - footprint.width / 2,
    right: x + footprint.width / 2,
    top: y - footprint.length / 2,
    bottom: y + footprint.length / 2
  };
}

function rectsOverlap(a: RoomRect, b: RoomRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isInsideRoom(next: RoomRect, room: RoomConfig) {
  if (next.left < 0 || next.right > room.width || next.top < 0 || next.bottom > room.length) {
    return false;
  }

  if (room.shape === 'l-shape') {
    const notch: RoomRect = {
      left: room.width * 0.62,
      right: room.width,
      top: 0,
      bottom: room.length * 0.38
    };
    if (rectsOverlap(next, notch)) {
      return false;
    }
  }

  return true;
}

function hasCollision(items: Item[], moving: ItemDraft, x: number, y: number, room: RoomConfig, ignoreId?: string) {
  const next = getRect(moving.width, moving.length, x, y, moving.rotation);

  if (!isInsideRoom(next, room)) {
    return true;
  }

  for (const item of items) {
    if (item.id === ignoreId) continue;
    const existing = getRect(item.width, item.length, item.x, item.y, item.rotation);
    if (rectsOverlap(next, existing)) {
      return true;
    }
  }

  return false;
}

function findFirstFit(itemData: ItemDraft, items: Item[], room: RoomConfig) {
  const candidates: Array<{ x: number; y: number }> = [
    { x: clamp(itemData.x, 1, room.width - 1), y: clamp(itemData.y, 1, room.length - 1) },
    { x: room.width / 2, y: room.length / 2 }
  ];

  for (let y = 0.8; y <= room.length - 0.8; y += 0.45) {
    for (let x = 0.8; x <= room.width - 0.8; x += 0.45) {
      candidates.push({ x, y });
    }
  }

  return candidates.find((point) => !hasCollision(items, itemData, point.x, point.y, room));
}

function computeAdvisories(items: Item[], room: RoomConfig): AdvisoryState {
  const spatial: string[] = [];
  const vastu: string[] = [];

  const doorZone: RoomRect = {
    left: room.width / 2 - 0.6,
    right: room.width / 2 + 0.6,
    top: room.length - 0.95,
    bottom: room.length
  };

  const entryBlocked = items.some((item) => rectsOverlap(getRect(item.width, item.length, item.x, item.y, item.rotation), doorZone));
  if (entryBlocked) {
    spatial.push('Entry path is blocked near the primary door zone. Keep 900mm clear.');
  }

  const tightWallItems = items.filter((item) => {
    const rect = getRect(item.width, item.length, item.x, item.y, item.rotation);
    const nearestWallGap = Math.min(rect.left, room.width - rect.right, rect.top, room.length - rect.bottom);
    return nearestWallGap < 0.28;
  });
  if (tightWallItems.length > 0) {
    spatial.push('Some furniture is hugging walls too tightly. Keep at least 300mm movement clearance.');
  }

  const centerX = room.width / 2;
  const centerY = room.length / 2;
  const centerRadius = Math.min(room.width, room.length) * 0.12;
  const centerLoaded = items.some((item) => {
    const dx = item.x - centerX;
    const dy = item.y - centerY;
    return Math.hypot(dx, dy) < centerRadius;
  });
  if (centerLoaded) {
    vastu.push('Brahmasthan check: keep the center zone visually and physically lighter.');
  }

  const bed = items.find((item) => item.code.includes('bed'));
  if (bed) {
    if (bed.y < room.length * 0.28) {
      vastu.push('Bed sits toward north. Vastu usually prefers south or west placement.');
    }
    const headDirection = normalizeRotation(bed.rotation);
    if (headDirection === 90 || headDirection === 270) {
      vastu.push('Bed orientation check: try rotating so the headboard aligns south or west.');
    }
  }

  const desk = items.find((item) => item.code.includes('desk'));
  if (desk && desk.x > room.width * 0.72) {
    vastu.push('Desk is deep on the west edge. Shift toward north/east for better daytime light.');
  }

  if (items.length > 0 && spatial.length === 0) {
    spatial.push('Spatial checks clear: circulation and furniture spacing look healthy.');
  }

  return { spatial, vastu };
}

function withAdvisories(state: StoreState, nextItems: Item[], nextRoom?: RoomConfig): Pick<StoreState, 'items' | 'advisories'> {
  const room = nextRoom ?? state.room;
  return {
    items: nextItems,
    advisories: computeAdvisories(nextItems, room)
  };
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  activeItemId: null,
  room: {
    type: 'living-room',
    width: 12,
    length: 14,
    shape: 'rectangle'
  },
  materials: {
    wallColor: '#EAE2D6',
    flooring: 'vitrified-tiles',
    woodFinish: 'Teak Grain'
  },
  viewMode: '2D',
  advisories: {
    spatial: [],
    vastu: []
  },
  doorWindows: [],

  addItem: (itemData) =>
    set((state) => {
      const preferred = findFirstFit(itemData, state.items, state.room) ?? {
        x: itemData.x,
        y: itemData.y
      };

      const createdItem: Item = {
        ...itemData,
        x: preferred.x,
        y: preferred.y,
        rotation: normalizeRotation(itemData.rotation),
        id: Math.random().toString(36).substring(2, 10)
      };

      const nextItems = [...state.items, createdItem];
      const nextState = withAdvisories(state, nextItems);

      return {
        ...nextState,
        activeItemId: createdItem.id
      };
    }),

  replaceItems: (items) =>
    set((state) => {
      const normalized = items.map((item) => ({
        ...item,
        rotation: normalizeRotation(item.rotation)
      }));
      const nextState = withAdvisories(state, normalized);
      return {
        ...nextState,
        activeItemId: normalized[0]?.id ?? null
      };
    }),

  clearItems: () =>
    set((state) => ({
      ...withAdvisories(state, []),
      activeItemId: null
    })),

  updateItemPos: (id, x, y) =>
    set((state) => {
      const nextItems = state.items.map((item) => (item.id === id ? { ...item, x, y } : item));
      return withAdvisories(state, nextItems);
    }),

  updateItem: (id, patch) =>
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const rotation = patch.rotation === undefined ? item.rotation : normalizeRotation(patch.rotation);
        return { ...item, ...patch, rotation };
      });
      return withAdvisories(state, nextItems);
    }),

  removeItem: (id) =>
    set((state) => {
      const nextItems = state.items.filter((item) => item.id !== id);
      const nextState = withAdvisories(state, nextItems);
      return {
        ...nextState,
        activeItemId: state.activeItemId === id ? null : state.activeItemId
      };
    }),

  rotateItem: (id, delta = 90) =>
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return {
          ...item,
          rotation: normalizeRotation(item.rotation + delta)
        };
      });
      return withAdvisories(state, nextItems);
    }),

  setActiveItem: (id) => set({ activeItemId: id }),

  setRoomConfig: (patch) =>
    set((state) => {
      const nextRoom: RoomConfig = {
        ...state.room,
        ...patch,
        width: clamp(patch.width ?? state.room.width, 6, 20),
        length: clamp(patch.length ?? state.room.length, 6, 20)
      };

      const constrainedItems = state.items.map((item) => {
        const rect = getRect(item.width, item.length, item.x, item.y, item.rotation);
        const halfWidth = (rect.right - rect.left) / 2;
        const halfLength = (rect.bottom - rect.top) / 2;

        return {
          ...item,
          x: clamp(item.x, halfWidth, nextRoom.width - halfWidth),
          y: clamp(item.y, halfLength, nextRoom.length - halfLength)
        };
      });

      return {
        room: nextRoom,
        ...withAdvisories(state, constrainedItems, nextRoom)
      };
    }),

  setMaterialConfig: (patch) =>
    set((state) => ({
      materials: {
        ...state.materials,
        ...patch
      }
    })),

  setViewMode: (mode) => set({ viewMode: mode }),

  setDoorWindows: (doorWindows) => set({ doorWindows }),

  checkCollision: (id, newX, newY) => {
    const { items, room } = get();
    const movingItem = items.find((item) => item.id === id);
    if (!movingItem) {
      return false;
    }
    return hasCollision(items, movingItem, newX, newY, room, id);
  },

  recomputeAdvisories: () =>
    set((state) => ({
      advisories: computeAdvisories(state.items, state.room)
    }))
}));