import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, type Item, type RoomConfig, type MaterialConfig } from '../useStore';

describe('useStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useStore.setState({
      items: [],
      room: { type: 'living-room', width: 12, length: 14, shape: 'rectangle' },
      materials: { wallColor: '#EAE2D6', flooring: 'vitrified-tiles', woodFinish: 'Teak Grain' },
      activeItemId: null,
      doorWindows: [],
      advisories: { spatial: [], vastu: [] },
    });
  });

  describe('Room Configuration', () => {
    it('has default room config', () => {
      const room = useStore.getState().room;
      expect(room.type).toBe('living-room');
      expect(room.width).toBe(12);
      expect(room.length).toBe(14);
      expect(room.shape).toBe('rectangle');
    });

    it('setRoomConfig updates room', () => {
      const newRoom: RoomConfig = {
        type: 'bedroom',
        width: 15,
        length: 18,
        shape: 'rectangle',
      };
      useStore.getState().setRoomConfig(newRoom);
      const room = useStore.getState().room;
      expect(room.type).toBe('bedroom');
      expect(room.width).toBe(15);
      expect(room.length).toBe(18);
    });
  });

  describe('Material Configuration', () => {
    it('has default material config', () => {
      const materials = useStore.getState().materials;
      expect(materials.wallColor).toBe('#EAE2D6');
      expect(materials.flooring).toBe('vitrified-tiles');
      expect(materials.woodFinish).toBe('Teak Grain');
    });

    it('setMaterialConfig updates materials', () => {
      const newMaterials: MaterialConfig = {
        wallColor: '#FFFFFF',
        flooring: 'marble',
        woodFinish: 'Walnut',
      };
      useStore.getState().setMaterialConfig(newMaterials);
      const materials = useStore.getState().materials;
      expect(materials.wallColor).toBe('#FFFFFF');
      expect(materials.flooring).toBe('marble');
      expect(materials.woodFinish).toBe('Walnut');
    });
  });

  describe('Item CRUD', () => {
    const sampleItem: Item = {
      id: 'item-1',
      code: 'sofa-3s',
      name: '3-Seater Sofa',
      x: 2,
      y: 3,
      width: 1.8,
      length: 0.8,
      height: 0.85,
      rotation: 0,
      color: '#8B7355',
      modelPath: '/models/loungeSofaLong.glb',
      price: 22000,
      brand: 'Godrej Interio',
    };

    it('addItem adds an item to the store', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('3-Seater Sofa');
    });

    it('removeItem removes an item by ID', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      const id = items[0].id;
      useStore.getState().removeItem(id);
      expect(useStore.getState().items.length).toBe(0);
    });

    it('removeItem does nothing for non-existent ID', () => {
      useStore.getState().addItem(sampleItem);
      useStore.getState().removeItem('non-existent');
      const items = useStore.getState().items;
      expect(items.length).toBe(1);
    });

    it('updateItemPos updates item position', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      const id = items[0].id;
      useStore.getState().updateItemPos(id, 5, 7);
      const updated = useStore.getState().items;
      expect(updated[0].x).toBe(5);
      expect(updated[0].y).toBe(7);
    });

    it('updateItemPos does nothing for non-existent ID', () => {
      useStore.getState().addItem(sampleItem);
      useStore.getState().updateItemPos('non-existent', 5, 7);
      const items = useStore.getState().items;
      expect(items[0].x).toBe(2); // unchanged
    });

    it('replaceItems replaces all items', () => {
      useStore.getState().addItem(sampleItem);
      const newItems: Item[] = [
        { ...sampleItem, id: 'item-2', name: 'King Bed' },
        { ...sampleItem, id: 'item-3', name: 'Wardrobe' },
      ];
      useStore.getState().replaceItems(newItems);
      const items = useStore.getState().items;
      expect(items.length).toBe(2);
      expect(items[0].name).toBe('King Bed');
      expect(items[1].name).toBe('Wardrobe');
    });

    it('setActiveItem sets active item ID', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      const id = items[0].id;
      useStore.getState().setActiveItem(id);
      expect(useStore.getState().activeItemId).toBe(id);
    });

    it('setActiveItem clears with null', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      const id = items[0].id;
      useStore.getState().setActiveItem(id);
      useStore.getState().setActiveItem(null);
      expect(useStore.getState().activeItemId).toBeNull();
    });

    it('clearItems removes all items', () => {
      useStore.getState().addItem(sampleItem);
      useStore.getState().clearItems();
      expect(useStore.getState().items.length).toBe(0);
    });

    it('rotateItem rotates an item by 90 degrees', () => {
      useStore.getState().addItem(sampleItem);
      const items = useStore.getState().items;
      const id = items[0].id;
      useStore.getState().rotateItem(id, 90);
      const updated = useStore.getState().items;
      expect(updated[0].rotation).toBe(90);
    });
  });

  describe('Collision Detection', () => {
    it('checkCollision detects overlapping items', () => {
      // Add two items at different positions first
      useStore.getState().addItem({
        code: 'sofa-3s',
        name: 'Sofa',
        x: 3,
        y: 3,
        width: 2,
        length: 1,
        height: 0.85,
        rotation: 0,
        color: '#8B7355',
        price: 22000,
        brand: 'Test',
      });
      useStore.getState().addItem({
        code: 'sofa-3s',
        name: 'Sofa 2',
        x: 8,
        y: 8,
        width: 2,
        length: 1,
        height: 0.85,
        rotation: 0,
        color: '#8B7355',
        price: 22000,
        brand: 'Test',
      });
      const items = useStore.getState().items;
      const item1 = items[0];
      const item2 = items[1];

      // Move item2 to overlap item1 using updateItemPos
      useStore.getState().updateItemPos(item2.id, item1.x, item1.y);

      // Now check collision at the overlapping position
      const hasCollision = useStore.getState().checkCollision(item2.id, item1.x, item1.y);
      expect(hasCollision).toBe(true);
    });

    it('checkCollision returns false for non-overlapping items', () => {
      const item1: Item = {
        id: 'item-1',
        code: 'sofa-3s',
        name: 'Sofa',
        x: 1,
        y: 1,
        width: 1,
        length: 1,
        height: 0.85,
        rotation: 0,
        color: '#8B7355',
        price: 22000,
        brand: 'Test',
      };
      const item2: Item = {
        ...item1,
        id: 'item-2',
        x: 5, // far away
        y: 5,
      };
      useStore.getState().addItem(item1);
      useStore.getState().addItem(item2);

      const hasCollision = useStore.getState().checkCollision('item-2', 5, 5);
      expect(hasCollision).toBe(false);
    });

    it('checkCollision returns false for non-existent item', () => {
      const hasCollision = useStore.getState().checkCollision('non-existent', 0, 0);
      expect(hasCollision).toBe(false);
    });
  });

  describe('Door/Window Management', () => {
    it('setDoorWindows sets doors and windows', () => {
      useStore.getState().setDoorWindows([
        { id: 'dw-1', type: 'door', wallIndex: 0, position: 0.5 },
        { id: 'dw-2', type: 'window', wallIndex: 1, position: 0.3 },
      ]);
      const dw = useStore.getState().doorWindows;
      expect(dw.length).toBe(2);
      expect(dw[0].type).toBe('door');
      expect(dw[1].type).toBe('window');
    });

    it('setDoorWindows clears with empty array', () => {
      useStore.getState().setDoorWindows([
        { id: 'dw-1', type: 'door', wallIndex: 0, position: 0.5 },
      ]);
      useStore.getState().setDoorWindows([]);
      expect(useStore.getState().doorWindows.length).toBe(0);
    });
  });

  describe('View Mode', () => {
    it('defaults to 2D view mode', () => {
      expect(useStore.getState().viewMode).toBe('2D');
    });

    it('setViewMode switches to 3D', () => {
      useStore.getState().setViewMode('3D');
      expect(useStore.getState().viewMode).toBe('3D');
    });
  });

  describe('Advisories', () => {
    it('has default empty advisories', () => {
      const advisories = useStore.getState().advisories;
      expect(advisories.spatial).toEqual([]);
      expect(advisories.vastu).toEqual([]);
    });

    it('recomputeAdvisories runs without error', () => {
      expect(() => useStore.getState().recomputeAdvisories()).not.toThrow();
    });
  });
});
