import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [,, input, output, factor] = process.argv;
const scale = parseFloat(factor);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const arr = pos.getArray();
    for (let i = 0; i < arr.length; i++) arr[i] *= scale;
    pos.setArray(arr);
  }
}
await io.write(output, doc);
console.log(`Scaled ${input} by ${scale} -> ${output}`);
