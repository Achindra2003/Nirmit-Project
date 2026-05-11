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
      <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
      <Vignette eskil={false} offset={0.18} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
