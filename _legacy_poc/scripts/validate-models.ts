/**
 * Build-time validation script: checks that all catalog model paths
 * resolve to actual files in public/models/.
 *
 * Usage: npx tsx scripts/validate-models.ts
 *
 * This script is excluded from the main tsconfig build (it's in scripts/).
 * Run it directly with tsx which handles Node.js types natively.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

// ── Resolve paths relative to the project root ──
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODELS_DIR = path.join(PROJECT_ROOT, 'public', 'models');

// ── Collect all actual model files ──
const actualFiles = new Set(
  fs.readdirSync(MODELS_DIR).filter((f: string) => f.endsWith('.glb')),
);

console.log(`\n📦 Found ${actualFiles.size} GLB models in public/models/\n`);

// ── Inline the model mapping data to avoid TS import issues ──
// This mirrors nirmit/src/catalog/modelMapping.ts
const HERO_MODEL_COVERAGE = [
  { heroId: 'cat_0001', heroLabel: 'L-Shaped Sofa', verifiedModelPath: '/models/loungeSofaCorner.glb', sourceAsset: 'loungeSofaCorner.glb', verified: true },
  { heroId: 'cat_0002', heroLabel: '3-Seater Sofa', verifiedModelPath: '/models/loungeSofaLong.glb', sourceAsset: 'loungeSofaLong.glb', verified: true },
  { heroId: 'cat_0003', heroLabel: '2-Seater Sofa', verifiedModelPath: '/models/loungeSofa.glb', sourceAsset: 'loungeSofa.glb', verified: true },
  { heroId: 'cat_0004', heroLabel: 'Single Sofa', verifiedModelPath: '/models/loungeChair.glb', sourceAsset: 'loungeChair.glb', verified: true },
  { heroId: 'cat_0005', heroLabel: 'Diwan', verifiedModelPath: '/models/benchCushion.glb', sourceAsset: 'benchCushion.glb', verified: true },
  { heroId: 'cat_0006', heroLabel: 'Pouffe', verifiedModelPath: '/models/stoolBarSquare.glb', sourceAsset: 'stoolBarSquare.glb', verified: true },
  { heroId: 'cat_0007', heroLabel: 'King Bed', verifiedModelPath: '/models/bedDouble.glb', sourceAsset: 'bedDouble.glb', verified: true },
  { heroId: 'cat_0008', heroLabel: 'Queen Bed', verifiedModelPath: '/models/bedDouble.glb', sourceAsset: 'bedDouble.glb', verified: true },
  { heroId: 'cat_0009', heroLabel: 'Single Bed', verifiedModelPath: '/models/bedSingle.glb', sourceAsset: 'bedSingle.glb', verified: true },
  { heroId: 'cat_0010', heroLabel: 'Bunk Bed', verifiedModelPath: '/models/bedBunk.glb', sourceAsset: 'bedBunk.glb', verified: true },
  { heroId: 'cat_0011', heroLabel: 'Side Table', verifiedModelPath: '/models/sideTable.glb', sourceAsset: 'sideTable.glb', verified: true },
  { heroId: 'cat_0012', heroLabel: '6-Seater Dining Table', verifiedModelPath: '/models/tableCross.glb', sourceAsset: 'tableCross.glb', verified: true },
  { heroId: 'cat_0013', heroLabel: '4-Seater Dining Table', verifiedModelPath: '/models/table.glb', sourceAsset: 'table.glb', verified: true },
  { heroId: 'cat_0014', heroLabel: 'Dining Chair', verifiedModelPath: '/models/chair.glb', sourceAsset: 'chair.glb', verified: true },
  { heroId: 'cat_0015', heroLabel: 'Coffee Table', verifiedModelPath: '/models/tableCoffee.glb', sourceAsset: 'tableCoffee.glb', verified: true },
  { heroId: 'cat_0016', heroLabel: '3-Door Wardrobe', verifiedModelPath: '/models/WARD-2DHCR-2CR.glb', sourceAsset: 'WARD-2DHCR-2CR.glb', verified: true },
  { heroId: 'cat_0017', heroLabel: '2-Door Wardrobe', verifiedModelPath: '/models/WARD-2DS-2CR.glb', sourceAsset: 'WARD-2DS-2CR.glb', verified: true },
  { heroId: 'cat_0018', heroLabel: 'Open Bookshelf', verifiedModelPath: '/models/bookcaseOpen.glb', sourceAsset: 'bookcaseOpen.glb', verified: true },
  { heroId: 'cat_0019', heroLabel: 'TV Unit', verifiedModelPath: '/models/cabinetTelevision.glb', sourceAsset: 'cabinetTelevision.glb', verified: true },
  { heroId: 'cat_0020', heroLabel: 'Shoe Rack', verifiedModelPath: '/models/SimpleCabinet.glb', sourceAsset: 'SimpleCabinet.glb', verified: true },
  { heroId: 'cat_0021', heroLabel: 'Storage Ottoman', verifiedModelPath: '/models/loungeSofaOttoman.glb', sourceAsset: 'loungeSofaOttoman.glb', verified: true },
  { heroId: 'cat_0022', heroLabel: 'Chest of Drawers', verifiedModelPath: '/models/sideTableDrawers.glb', sourceAsset: 'sideTableDrawers.glb', verified: true },
  { heroId: 'cat_0023', heroLabel: 'Study Desk', verifiedModelPath: '/models/desk.glb', sourceAsset: 'desk.glb', verified: true },
  { heroId: 'cat_0024', heroLabel: 'Office Chair', verifiedModelPath: '/models/chairDesk.glb', sourceAsset: 'chairDesk.glb', verified: true },
  { heroId: 'cat_0025', heroLabel: 'Bookshelf with Cabinet', verifiedModelPath: '/models/bookcaseClosedDoors.glb', sourceAsset: 'bookcaseClosedDoors.glb', verified: true },
  { heroId: 'cat_0026', heroLabel: 'Wall-Mounted Pooja Unit', verifiedModelPath: '/models/bookcaseOpenLow.glb', sourceAsset: 'bookcaseOpenLow.glb', verified: true },
  { heroId: 'cat_0027', heroLabel: 'Floor Pooja Mandir', verifiedModelPath: '/models/bookcaseClosed.glb', sourceAsset: 'bookcaseClosed.glb', verified: true },
  { heroId: 'cat_0028', heroLabel: 'Pooja Chowki', verifiedModelPath: '/models/tableCoffeeSquare.glb', sourceAsset: 'tableCoffeeSquare.glb', verified: true },
  { heroId: 'cat_0029', heroLabel: 'Straight Kitchen Counter', verifiedModelPath: '/models/kitchenCabinet.glb', sourceAsset: 'kitchenCabinet.glb', verified: true },
  { heroId: 'cat_0030', heroLabel: 'L-Shaped Kitchen Counter', verifiedModelPath: '/models/kitchenCabinetCornerInner.glb', sourceAsset: 'kitchenCabinetCornerInner.glb', verified: true },
  { heroId: 'cat_0031', heroLabel: 'Overhead Cabinet', verifiedModelPath: '/models/kitchenCabinetUpper.glb', sourceAsset: 'kitchenCabinetUpper.glb', verified: true },
  { heroId: 'cat_0032', heroLabel: 'Kitchen Sink Unit', verifiedModelPath: '/models/kitchenSink.glb', sourceAsset: 'kitchenSink.glb', verified: true },
  { heroId: 'cat_0033', heroLabel: 'Chimney Unit', verifiedModelPath: '/models/hoodModern.glb', sourceAsset: 'hoodModern.glb', verified: true },
  { heroId: 'cat_0034', heroLabel: 'Kitchen Trolley', verifiedModelPath: '/models/kitchenBar.glb', sourceAsset: 'kitchenBar.glb', verified: true },
  { heroId: 'cat_0035', heroLabel: 'Ceiling Fan', verifiedModelPath: '/models/lampSquareCeiling.glb', sourceAsset: 'lampSquareCeiling.glb', verified: true },
  { heroId: 'cat_0036', heroLabel: 'Wall Mirror', verifiedModelPath: '/models/bathroomMirror.glb', sourceAsset: 'bathroomMirror.glb', verified: true },
  { heroId: 'cat_0037', heroLabel: 'Curtain Rod', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0038', heroLabel: 'Window AC Unit', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0039', heroLabel: 'Geyser', verifiedModelPath: '', sourceAsset: '', verified: false },
  { heroId: 'cat_0040', heroLabel: 'Wall Clock', verifiedModelPath: '', sourceAsset: '', verified: false },
];

let missingCount = 0;
let unverifiedCount = 0;

for (const entry of HERO_MODEL_COVERAGE) {
  const modelPath = entry.verifiedModelPath;
  const filename = modelPath ? modelPath.replace('/models/', '') : '';
  const exists = filename ? actualFiles.has(filename) : false;

  if (!entry.verified) {
    unverifiedCount++;
  }

  if (entry.verified && !exists) {
    console.error(`  ❌ ${entry.heroId} (${entry.heroLabel}): "${modelPath}" — FILE NOT FOUND`);
    missingCount++;
  }
}

// ── Summary ──
console.log('\n─── Validation Results ───\n');

for (const entry of HERO_MODEL_COVERAGE) {
  const modelPath = entry.verifiedModelPath;
  const filename = modelPath ? modelPath.replace('/models/', '') : '';
  const exists = filename ? actualFiles.has(filename) : false;

  if (!entry.verified) {
    console.log(`  ⚠️  ${entry.heroId} (${entry.heroLabel}): [FALLBACK-ONLY] No verified 3D model`);
  } else if (exists) {
    console.log(`  ✅ ${entry.heroId} (${entry.heroLabel}): ${modelPath}`);
  } else {
    console.log(`  ❌ ${entry.heroId} (${entry.heroLabel}): ${modelPath} — MISSING`);
  }
}

console.log(`\n─── Summary ───`);
console.log(`  Total heroes: ${HERO_MODEL_COVERAGE.length}`);
console.log(`  Verified with models: ${HERO_MODEL_COVERAGE.filter((r) => r.verified && actualFiles.has(r.verifiedModelPath.replace('/models/', ''))).length}`);
console.log(`  Verified but missing: ${missingCount}`);
console.log(`  Unverified (fallback-only): ${unverifiedCount}`);

if (missingCount > 0) {
  console.error(`\n❌ VALIDATION FAILED: ${missingCount} model file(s) missing!`);
  process.exit(1);
} else {
  console.log('\n✅ All verified model paths resolve to actual files.\n');
  process.exit(0);
}
