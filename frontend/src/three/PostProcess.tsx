/**
 * Post-processing — ACES tone mapping, subtle bloom, vignetting.
 * Tuned to be warm, not "bloomy". Bloom threshold high so only highlight
 * sources (window light, diya flame, brass) bloom.
 */
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

export function PostProcess() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom intensity={0.28} luminanceThreshold={0.88} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.32} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
