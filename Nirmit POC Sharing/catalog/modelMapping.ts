export interface HeroModelCoverageEntry {
  heroId: string;
  heroLabel: string;
  furnitureType: string;
  approximateSize: string;
  verifiedModelPath: string;
  sourceAsset: string;
  verified: boolean;
}

export const HERO_MODEL_COVERAGE: HeroModelCoverageEntry[] = [
  { heroId: 'cat_0001', heroLabel: 'L-Shaped Sofa', furnitureType: 'seating', approximateSize: '2.1m x 1.6m x 0.85m', verifiedModelPath: '/models/sofa_l_shape.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/loungeSofaCorner.glb', verified: true },
  { heroId: 'cat_0002', heroLabel: '3-Seater Sofa', furnitureType: 'seating', approximateSize: '1.8m x 0.8m x 0.85m', verifiedModelPath: '/models/sofa_3seater.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/loungeSofaLong.glb', verified: true },
  { heroId: 'cat_0003', heroLabel: '2-Seater Sofa', furnitureType: 'seating', approximateSize: '1.4m x 0.8m x 0.85m', verifiedModelPath: '/models/sofa_2seater.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/loungeSofa.glb', verified: true },
  { heroId: 'cat_0004', heroLabel: 'Single Sofa', furnitureType: 'seating', approximateSize: '0.8m x 0.8m x 0.85m', verifiedModelPath: '/models/sofa_single.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/loungeChair.glb', verified: true },
  { heroId: 'cat_0005', heroLabel: 'Diwan', furnitureType: 'seating', approximateSize: '1.8m x 0.75m x 0.4m', verifiedModelPath: '/models/diwan.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/benchCushion.glb', verified: true },
  { heroId: 'cat_0006', heroLabel: 'Pouffe', furnitureType: 'seating', approximateSize: '0.4m x 0.4m x 0.4m', verifiedModelPath: '/models/pouffe.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/stoolBarSquare.glb', verified: true },
  { heroId: 'cat_0007', heroLabel: 'King Bed', furnitureType: 'sleeping', approximateSize: '2.0m x 2.4m x 1.1m', verifiedModelPath: '/models/bed_king.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bedDouble.glb', verified: true },
  { heroId: 'cat_0008', heroLabel: 'Queen Bed', furnitureType: 'sleeping', approximateSize: '2.0m x 2.1m x 1.1m', verifiedModelPath: '/models/bed_queen.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bedDouble.glb', verified: true },
  { heroId: 'cat_0009', heroLabel: 'Single Bed', furnitureType: 'sleeping', approximateSize: '1.0m x 2.0m x 0.9m', verifiedModelPath: '/models/bed_single.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bedSingle.glb', verified: true },
  { heroId: 'cat_0010', heroLabel: 'Bunk Bed', furnitureType: 'sleeping', approximateSize: '1.0m x 2.0m x 1.7m', verifiedModelPath: '/models/bed_bunk.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bedBunk.glb', verified: true },
  { heroId: 'cat_0011', heroLabel: 'Side Table', furnitureType: 'sleeping', approximateSize: '0.45m x 0.4m x 0.5m', verifiedModelPath: '/models/side_table.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/sideTable.glb', verified: true },
  { heroId: 'cat_0012', heroLabel: '6-Seater Dining Table', furnitureType: 'dining', approximateSize: '1.8m x 0.9m x 0.75m', verifiedModelPath: '/models/dining_6.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/tableCross.glb', verified: true },
  { heroId: 'cat_0013', heroLabel: '4-Seater Dining Table', furnitureType: 'dining', approximateSize: '1.2m x 0.9m x 0.75m', verifiedModelPath: '/models/dining_4.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/table.glb', verified: true },
  { heroId: 'cat_0014', heroLabel: 'Dining Chair', furnitureType: 'dining', approximateSize: '0.45m x 0.45m x 0.9m', verifiedModelPath: '/models/dining_chair.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/chair.glb', verified: true },
  { heroId: 'cat_0015', heroLabel: 'Coffee Table', furnitureType: 'dining', approximateSize: '0.9m x 0.6m x 0.4m', verifiedModelPath: '/models/coffee_table.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/tableCoffee.glb', verified: true },
  { heroId: 'cat_0016', heroLabel: '3-Door Wardrobe', furnitureType: 'storage', approximateSize: '1.8m x 0.6m x 2.1m', verifiedModelPath: '/models/wardrobe_3d.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/WARD-2DHCR-2CR.glb', verified: true },
  { heroId: 'cat_0017', heroLabel: '2-Door Wardrobe', furnitureType: 'storage', approximateSize: '1.2m x 0.6m x 2.1m', verifiedModelPath: '/models/wardrobe_2d.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/WARD-2DS-2CR.glb', verified: true },
  { heroId: 'cat_0018', heroLabel: 'Open Bookshelf', furnitureType: 'storage', approximateSize: '0.9m x 0.3m x 1.8m', verifiedModelPath: '/models/bookshelf.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bookcaseOpen.glb', verified: true },
  { heroId: 'cat_0019', heroLabel: 'TV Unit', furnitureType: 'storage', approximateSize: '1.5m x 0.4m x 0.5m', verifiedModelPath: '/models/tv_unit.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/cabinetTelevision.glb', verified: true },
  { heroId: 'cat_0020', heroLabel: 'Shoe Rack', furnitureType: 'storage', approximateSize: '1.0m x 0.35m x 1.2m', verifiedModelPath: '/models/shoe_rack.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/SimpleCabinet.glb', verified: true },
  { heroId: 'cat_0021', heroLabel: 'Storage Ottoman', furnitureType: 'storage', approximateSize: '0.9m x 0.4m x 0.45m', verifiedModelPath: '/models/ottoman.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/loungeSofaOttoman.glb', verified: true },
  { heroId: 'cat_0022', heroLabel: 'Chest of Drawers', furnitureType: 'storage', approximateSize: '0.8m x 0.45m x 1.1m', verifiedModelPath: '/models/chest_drawers.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/sideTableDrawers.glb', verified: true },
  { heroId: 'cat_0023', heroLabel: 'Study Desk', furnitureType: 'work', approximateSize: '1.0m x 0.5m x 0.75m', verifiedModelPath: '/models/desk.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/desk.glb', verified: true },
  { heroId: 'cat_0024', heroLabel: 'Office Chair', furnitureType: 'work', approximateSize: '0.5m x 0.5m x 1.0m', verifiedModelPath: '/models/office_chair.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/chairDesk.glb', verified: true },
  { heroId: 'cat_0025', heroLabel: 'Bookshelf with Cabinet', furnitureType: 'work', approximateSize: '0.8m x 0.35m x 1.8m', verifiedModelPath: '/models/bookshelf_cabinet.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bookcaseClosedDoors.glb', verified: true },
  { heroId: 'cat_0026', heroLabel: 'Wall-Mounted Pooja Unit', furnitureType: 'pooja', approximateSize: '0.6m x 0.3m x 0.5m', verifiedModelPath: '/models/pooja_wall.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bookcaseOpenLow.glb', verified: true },
  { heroId: 'cat_0027', heroLabel: 'Floor Pooja Mandir', furnitureType: 'pooja', approximateSize: '0.9m x 0.5m x 1.0m', verifiedModelPath: '/models/pooja_floor.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bookcaseClosed.glb', verified: true },
  { heroId: 'cat_0028', heroLabel: 'Pooja Chowki', furnitureType: 'pooja', approximateSize: '0.45m x 0.35m x 0.15m', verifiedModelPath: '/models/pooja_chowki.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/tableCoffeeSquare.glb', verified: true },
  { heroId: 'cat_0029', heroLabel: 'Straight Kitchen Counter', furnitureType: 'kitchen', approximateSize: '0.9m x 0.6m x 0.85m', verifiedModelPath: '/models/counter_straight.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/kitchenCabinet.glb', verified: true },
  { heroId: 'cat_0030', heroLabel: 'L-Shaped Kitchen Counter', furnitureType: 'kitchen', approximateSize: '1.8m x 1.5m x 0.85m', verifiedModelPath: '/models/counter_l.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/kitchenCabinetCornerInner.glb', verified: true },
  { heroId: 'cat_0031', heroLabel: 'Overhead Cabinet', furnitureType: 'kitchen', approximateSize: '0.9m x 0.35m x 0.7m', verifiedModelPath: '/models/overhead_cabinet.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/kitchenCabinetUpper.glb', verified: true },
  { heroId: 'cat_0032', heroLabel: 'Kitchen Sink Unit', furnitureType: 'kitchen', approximateSize: '1.0m x 0.6m x 0.85m', verifiedModelPath: '/models/sink.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/kitchenSink.glb', verified: true },
  { heroId: 'cat_0033', heroLabel: 'Chimney Unit', furnitureType: 'kitchen', approximateSize: '0.9m x 0.6m x 0.15m', verifiedModelPath: '/models/chimney.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/hoodModern.glb', verified: true },
  { heroId: 'cat_0034', heroLabel: 'Kitchen Trolley', furnitureType: 'kitchen', approximateSize: '0.9m x 0.5m x 0.85m', verifiedModelPath: '/models/trolley.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/kitchenBar.glb', verified: true },
  { heroId: 'cat_0035', heroLabel: 'Ceiling Fan', furnitureType: 'fixtures', approximateSize: '1.2m x 1.2m x 0.3m', verifiedModelPath: '/models/fan.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/lampSquareCeiling.glb', verified: true },
  { heroId: 'cat_0036', heroLabel: 'Wall Mirror', furnitureType: 'fixtures', approximateSize: '0.6m x 0.03m x 0.9m', verifiedModelPath: '/models/mirror.glb', sourceAsset: '../threejs-3d-room-designer/Blueprint3D-assets/models/glb/special/bathroomMirror.glb', verified: true },
  { heroId: 'cat_0037', heroLabel: 'Curtain Rod', furnitureType: 'fixtures', approximateSize: '1.5m x 0.05m x 0.05m', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0038', heroLabel: 'Window AC Unit', furnitureType: 'fixtures', approximateSize: '0.6m x 0.25m x 0.4m', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0039', heroLabel: 'Geyser', furnitureType: 'fixtures', approximateSize: '0.35m x 0.35m x 0.6m', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0040', heroLabel: 'Wall Clock', furnitureType: 'fixtures', approximateSize: '0.3m x 0.05m x 0.3m', verifiedModelPath: '', sourceAsset: '', verified: false },
];

export const heroModelMapping: Record<string, string> = HERO_MODEL_COVERAGE.reduce<Record<string, string>>(
  (acc, entry) => {
    acc[entry.heroId] = entry.verifiedModelPath;
    return acc;
  },
  {},
);

export function getHeroModelPath(heroId: string): string {
  return heroModelMapping[heroId] ?? '';
}
