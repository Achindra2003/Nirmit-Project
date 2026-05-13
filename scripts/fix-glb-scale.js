import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { getBounds, center } from '@gltf-transform/functions';

const frontendModelsDir = path.join(process.cwd(), 'frontend', 'public', 'models');
const catalogPath = path.join(process.cwd(), 'backend', 'data', 'catalog.json');

async function main() {
    const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const catalogMap = new Map();
    for (const item of catalogData) {
        if (!catalogMap.has(item.asset_url)) {
            catalogMap.set(item.asset_url, item.dimensions);
        }
    }

    const io = new NodeIO();
    
    const files = fs.readdirSync(frontendModelsDir).filter(f => f.endsWith('.glb'));
    for (const file of files) {
        if (!catalogMap.has(file)) {
            console.log(`Skipping ${file}: not found in catalog.`);
            continue;
        }

        const dims = catalogMap.get(file);
        const declaredW = dims.width_mm / 1000;
        const declaredH = dims.height_mm / 1000;
        const declaredD = dims.depth_mm / 1000;

        const filePath = path.join(frontendModelsDir, file);
        const doc = await io.read(filePath);
        const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];

        const { min, max } = getBounds(scene);
        const actualW = max[0] - min[0];
        const actualH = max[1] - min[1];
        const actualD = max[2] - min[2];

        // Avoid division by zero
        if (actualW <= 0 || actualH <= 0 || actualD <= 0) {
            console.warn(`Warning: ${file} has a zero dimension bounding box. Skipping.`);
            continue;
        }

        const scaleX = declaredW / actualW;
        const scaleY = declaredH / actualH;
        const scaleZ = declaredD / actualD;

        const scales = [scaleX, scaleY, scaleZ];
        const minScale = Math.min(...scales);
        const maxScale = Math.max(...scales);

        if (maxScale / minScale > 1.2) {
            console.warn(`Warning: ${file} scale factors differ by >20% (X:${scaleX.toFixed(3)}, Y:${scaleY.toFixed(3)}, Z:${scaleZ.toFixed(3)}). Skipping.`);
            continue;
        }

        const avgScale = (scaleX + scaleY + scaleZ) / 3;

        // Apply scale. Instead of recursively scaling nodes, we can scale the root nodes of the scene
        for (const node of scene.listChildren()) {
            const currentScale = node.getScale();
            node.setScale([
                currentScale[0] * avgScale,
                currentScale[1] * avgScale,
                currentScale[2] * avgScale
            ]);
        }

        // Translate the model so its base sits at Y=0
        await doc.transform(center({ pivot: 'below' }));

        await io.write(filePath, doc);
        console.log(`Successfully processed ${file}. Applied uniform scale: ${avgScale.toFixed(3)}`);
    }
}

main().catch(console.error);
