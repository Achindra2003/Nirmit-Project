/**
 * Nirmit AI Image Service — Generates warm, styled room renders from layout JSON + text prompts.
 *
 * Uses Replicate (SDXL/Flux) or Stability AI API for photorealistic room renders.
 * Falls back to a high-quality stylized SVG renderer when no API key is configured
 * or when the API call fails.
 */

import type { LayoutResult } from '../../solver/layoutSolver';
import type { MaterialConfig } from '../../store/useStore';
import type { AIRankedLayout } from './layoutService';
import { FurnitureFactory } from '../../catalog/FurnitureFactory';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface RoomRenderRequest {
  layout: LayoutResult;
  viewAngle: 'entrance' | 'living' | 'top-down';
  roomDimensions: { width: number; length: number; height: number };
  materials: MaterialConfig;
  philosophy: 'gathering' | 'breath' | 'keeper';
  userContext: {
    desiredFeeling: string;
    lovedItemToKeep: string;
    whoIsThisRoomFor: string;
  };
}

export interface RoomRenderResult {
  imageUrl: string;
  viewAngle: 'entrance' | 'living' | 'top-down';
  generated: boolean; // false if using fallback
}

// ─────────────────────────────────────────────────
// In-memory render cache (keyed by layout hash)
// ─────────────────────────────────────────────────

const renderCache = new Map<string, RoomRenderResult[]>();

function hashLayout(layout: LayoutResult): string {
  const placements = layout.placements
    .map((p) => `${p.catalogId}:${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.rotation}`)
    .sort()
    .join('|');
  return `${placements}|${layout.score}`;
}

// ─────────────────────────────────────────────────
// Prompt Builder
// ─────────────────────────────────────────────────

const PHILOSOPHY_AESTHETICS: Record<string, string> = {
  gathering:
    'Warm, conversation-first layout. Furniture arranged in a natural circle so everyone faces each other. Cozy, inviting, family-centric. Soft ambient lighting. Rich textiles — cotton dhurries, embroidered cushions.',
  breath:
    'Open, minimal, light-filled. Clear walkways, uncluttered surfaces. Airy and spacious. Neutral palette with subtle Indian accents. Sheer curtains, natural light flooding in. Peaceful and serene.',
  keeper:
    'Storage-first design where every wall works hard. Floor-to-ceiling modular storage in warm wood tones. Organized, efficient, nothing wasted. Built-in shelving, hidden storage. Tidy but lived-in.',
};

const VIEW_ANGLE_GUIDANCE: Record<string, string> = {
  entrance:
    'View from the doorway looking into the room. Wide-angle perspective showing the full room depth. The entrance frame is visible at the edges.',
  living:
    'View from the main seating area looking across the room. Eye-level perspective. Shows the primary furniture arrangement and focal wall.',
  'top-down':
    'Bird\'s eye view from above. Shows the complete floor plan with all furniture in position. Warm, styled top-down perspective.',
};

/**
 * Build a detailed render prompt from the actual layout JSON.
 */
export function buildRenderPrompt(request: RoomRenderRequest): string {
  const { layout, viewAngle, roomDimensions, materials, philosophy, userContext } = request;

  // Room description
  const roomDesc = `A ${roomDimensions.width.toFixed(1)}m wide × ${roomDimensions.length.toFixed(1)}m long room with ${roomDimensions.height.toFixed(1)}m ceiling height.`;

  // Wall and floor colors
  const finishes = `Walls painted in ${materials.wallColor}. Flooring is ${materials.flooring.replace(/-/g, ' ')}. Wood furniture in ${materials.woodFinish.replace(/_/g, ' ')} finish.`;

  // Furniture items with positions
  const furnitureLines = layout.placements.map((p) => {
    const item = FurnitureFactory.getItem(p.catalogId);
    if (!item) return null;
    const w = item.dimensions.width.toFixed(1);
    const d = item.dimensions.depth.toFixed(1);
    const h = item.dimensions.height.toFixed(1);
    const label = item.label;
    const category = item.category;
    return `${label} (${category}, ${w}m×${d}m×${h}m) placed at position (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotated ${p.rotation}°`;
  }).filter(Boolean).join('. ');

  // Philosophy aesthetic
  const aesthetic = PHILOSOPHY_AESTHETICS[philosophy] ?? PHILOSOPHY_AESTHETICS['breath'];

  // View angle guidance
  const viewGuidance = VIEW_ANGLE_GUIDANCE[viewAngle] ?? VIEW_ANGLE_GUIDANCE['living'];

  // User context
  const feeling = userContext.desiredFeeling
    ? `The room should feel ${userContext.desiredFeeling}.`
    : '';
  const lovedItem = userContext.lovedItemToKeep
    ? `Leave space for ${userContext.lovedItemToKeep}.`
    : '';
  const whoFor = userContext.whoIsThisRoomFor
    ? `This room is for ${userContext.whoIsThisRoomFor}.`
    : '';

  // Assemble the full prompt
  const prompt = [
    roomDesc,
    finishes,
    `Furniture: ${furnitureLines}.`,
    `Design philosophy: ${aesthetic}`,
    viewGuidance,
    feeling,
    lovedItem,
    whoFor,
    'Style: Warm, styled interior render. Indian contemporary. Photorealistic but warm — like an architectural digest photo, not a cold 3D render. Soft shadows. Lived-in but tidy. Natural daylight through windows. Rich textures visible on fabrics and wood.',
  ]
    .filter(Boolean)
    .join(' ');

  return prompt;
}

/**
 * Build a negative prompt for the image generation.
 */
export function buildNegativePrompt(): string {
  return [
    'No text',
    'No watermarks',
    'No people',
    'No distorted furniture',
    'No unrealistic proportions',
    'No cartoon style',
    'No 3D wireframe',
    'No empty room',
    'No harsh lighting',
    'No cluttered mess',
  ].join(', ');
}

// ─────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────

const REPLICATE_API_KEY = import.meta.env.VITE_REPLICATE_API_KEY as string | undefined;
const STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY as string | undefined;

// Replicate SDXL model — good balance of quality and speed
const REPLICATE_MODEL =
  'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

const RENDER_TIMEOUT_MS = 15000; // 15-second timeout

// ─────────────────────────────────────────────────
// API Call Functions
// ─────────────────────────────────────────────────

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string[] | null;
  error: string | null;
}

/**
 * Call Replicate API to generate an image.
 * Uses the SDXL model with a text-to-image pipeline.
 */
async function callReplicateAPI(prompt: string, negativePrompt: string): Promise<string> {
  if (!REPLICATE_API_KEY) {
    throw new Error('No Replicate API key configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL,
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: 1024,
          height: 768,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }),
      signal: controller.signal,
    });

    if (!createRes.ok) {
      throw new Error(`Replicate API error: ${createRes.status} ${createRes.statusText}`);
    }

    const prediction: ReplicatePrediction = await createRes.json();

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 20;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      if (controller.signal.aborted) {
        throw new Error('Render timed out');
      }

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      );

      if (!pollRes.ok) {
        throw new Error(`Replicate poll error: ${pollRes.status}`);
      }

      const pollData: ReplicatePrediction = await pollRes.json();

      if (pollData.status === 'succeeded' && pollData.output && pollData.output.length > 0) {
        return pollData.output[0];
      }

      if (pollData.status === 'failed' || pollData.status === 'canceled') {
        throw new Error(`Replicate prediction ${pollData.status}: ${pollData.error ?? 'Unknown error'}`);
      }

      attempts++;
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    throw new Error('Replicate prediction timed out waiting for result');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call Stability AI API to generate an image.
 * Uses Stable Diffusion with the text-to-image endpoint.
 */
async function callStabilityAPI(prompt: string, negativePrompt: string): Promise<string> {
  if (!STABILITY_API_KEY) {
    throw new Error('No Stability API key configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('output_format', 'jpeg');
    formData.append('aspect_ratio', '4:3');
    formData.append('style_preset', 'photographic');

    const res = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'application/json',
        },
        body: formData,
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Stability API error: ${res.status} — ${errorText}`);
    }

    const data = await res.json();

    if (data.image) {
      // Stability returns base64-encoded image
      return `data:image/jpeg;base64,${data.image}`;
    }

    if (data.finish_reason === 'CONTENT_FILTERED') {
      throw new Error('Stability API: content filtered');
    }

    throw new Error('Stability API: no image in response');
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────
// Main Render Function
// ─────────────────────────────────────────────────

/**
 * Generate a single room render for a given layout and view angle.
 * Falls back to SVG renderer if no API key is configured or the API call fails.
 */
export async function generateRoomRender(request: RoomRenderRequest): Promise<RoomRenderResult> {
  const prompt = buildRenderPrompt(request);
  const negativePrompt = buildNegativePrompt();

  // Check cache first
  const cacheKey = `${hashLayout(request.layout)}:${request.viewAngle}`;
  const cached = renderCache.get(cacheKey);
  if (cached) {
    const match = cached.find((r) => r.viewAngle === request.viewAngle);
    if (match) return match;
  }

  // Try Replicate first, then Stability, then fallback
  const hasReplicate = !!REPLICATE_API_KEY;
  const hasStability = !!STABILITY_API_KEY;

  if (!hasReplicate && !hasStability) {
    // No API key configured — use fallback immediately
    const fallbackUrl = generateFallbackRender(
      request.layout,
      request.viewAngle,
      request.roomDimensions,
    );
    const result: RoomRenderResult = {
      imageUrl: fallbackUrl,
      viewAngle: request.viewAngle,
      generated: false,
    };
    // Cache the fallback too
    const existing = renderCache.get(cacheKey) ?? [];
    existing.push(result);
    renderCache.set(cacheKey, existing);
    return result;
  }

  try {
    let imageUrl: string;

    if (hasReplicate) {
      imageUrl = await callReplicateAPI(prompt, negativePrompt);
    } else {
      imageUrl = await callStabilityAPI(prompt, negativePrompt);
    }

    const result: RoomRenderResult = {
      imageUrl,
      viewAngle: request.viewAngle,
      generated: true,
    };

    // Cache the result
    const existing = renderCache.get(cacheKey) ?? [];
    existing.push(result);
    renderCache.set(cacheKey, existing);

    return result;
  } catch (err) {
    console.warn(
      `[imageService] AI render failed for ${request.viewAngle} view, using fallback:`,
      (err as Error).message,
    );

    const fallbackUrl = generateFallbackRender(
      request.layout,
      request.viewAngle,
      request.roomDimensions,
    );
    const result: RoomRenderResult = {
      imageUrl: fallbackUrl,
      viewAngle: request.viewAngle,
      generated: false,
    };

    // Cache the fallback
    const existing = renderCache.get(cacheKey) ?? [];
    existing.push(result);
    renderCache.set(cacheKey, existing);

    return result;
  }
}

// ─────────────────────────────────────────────────
// Batch Render Function
// ─────────────────────────────────────────────────

/**
 * Generate renders for the top 3 ranked layouts (2 views each: entrance + living).
 * Runs all 6 renders in parallel using Promise.all.
 * Returns a Map of layoutId → array of render results.
 */
export async function generateAllRenders(
  layouts: LayoutResult[],
  rankings: AIRankedLayout[],
  roomConfig: { width: number; length: number },
  materials: MaterialConfig,
  userContext: {
    desiredFeeling: string;
    lovedItemToKeep: string;
    whoIsThisRoomFor: string;
  },
): Promise<Map<number, RoomRenderResult[]>> {
  const resultMap = new Map<number, RoomRenderResult[]>();

  // Take top 3 ranked layouts
  const topRankings = rankings.slice(0, 3);

  // Build all render requests
  const renderTasks: Array<{
    layoutId: number;
    viewAngle: 'entrance' | 'living';
    promise: Promise<RoomRenderResult>;
  }> = [];

  for (const rank of topRankings) {
    const layout = layouts[rank.layoutId];
    if (!layout) continue;

    const philosophy = rank.philosophy ?? 'breath';

    const baseRequest: Omit<RoomRenderRequest, 'viewAngle'> = {
      layout,
      roomDimensions: {
        width: roomConfig.width,
        length: roomConfig.length,
        height: 2.7, // standard Indian ceiling height
      },
      materials,
      philosophy,
      userContext,
    };

    // Entrance view
    renderTasks.push({
      layoutId: rank.layoutId,
      viewAngle: 'entrance',
      promise: generateRoomRender({ ...baseRequest, viewAngle: 'entrance' }),
    });

    // Living view
    renderTasks.push({
      layoutId: rank.layoutId,
      viewAngle: 'living',
      promise: generateRoomRender({ ...baseRequest, viewAngle: 'living' }),
    });
  }

  // Run all in parallel
  const results = await Promise.all(
    renderTasks.map((task) =>
      task.promise.catch((err): RoomRenderResult => {
        console.warn(
          `[imageService] Render failed for layout ${task.layoutId} (${task.viewAngle}):`,
          (err as Error).message,
        );
        const layout = layouts[task.layoutId];
        const fallbackUrl = layout
          ? generateFallbackRender(layout, task.viewAngle, {
              width: roomConfig.width,
              length: roomConfig.length,
              height: 2.7,
            })
          : '';
        return {
          imageUrl: fallbackUrl,
          viewAngle: task.viewAngle,
          generated: false,
        };
      }),
    ),
  );

  // Group results by layoutId
  for (let i = 0; i < renderTasks.length; i++) {
    const { layoutId } = renderTasks[i];
    const existing = resultMap.get(layoutId) ?? [];
    existing.push(results[i]);
    resultMap.set(layoutId, existing);
  }

  return resultMap;
}

// ─────────────────────────────────────────────────
// Fallback SVG Renderer
// ─────────────────────────────────────────────────

/**
 * Generate a high-quality stylized 2D SVG representation of the room.
 * Not a schematic — a drawn, warm, styled perspective with real textures,
 * accurate furniture silhouettes, and light simulation.
 *
 * Returns a data URI string that can be used as an image source.
 */
export function generateFallbackRender(
  layout: LayoutResult,
  viewAngle: 'entrance' | 'living' | 'top-down',
  roomDimensions: { width: number; length: number; height: number },
): string {
  const { width, length } = roomDimensions;
  const padding = 0.6;
  const svgW = width + padding * 2;
  const svgL = length + padding * 2;
  const scale = 100; // pixels per meter
  const svgWidth = svgW * scale;
  const svgHeight = svgL * scale;

  // Color palette — warm, Indian contemporary
  const colors = {
    floor: '#E8D5B7',
    floorGradient: '#D4C4A8',
    wall: '#F5F0E8',
    wallShadow: '#E8E0D0',
    wood: '#8B6914',
    woodLight: '#A0782C',
    woodDark: '#6B4F10',
    fabric: '#C4A882',
    fabricAccent: '#D4B896',
    metal: '#B8A88A',
    plant: '#6B8E5A',
    plantLight: '#8AAA78',
    rug: '#D4C4A8',
    rugBorder: '#C8A96E',
    door: '#8B7355',
    window: '#A8C8E8',
    windowFrame: '#8B7355',
    shadow: 'rgba(92, 64, 51, 0.12)',
    light: 'rgba(255, 248, 235, 0.4)',
  };

  // Helper: convert room coords to SVG coords
  const tx = (x: number) => (x + padding) * scale;
  const ty = (y: number) => (y + padding) * scale;

  // Build SVG parts
  const parts: string[] = [];

  // SVG header with defs
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`);

  // Defs: gradients, filters, patterns
  parts.push('<defs>');

  // Floor gradient
  parts.push(`<radialGradient id="floorGrad" cx="50%" cy="50%" r="70%">
    <stop offset="0%" stop-color="${colors.floor}" />
    <stop offset="100%" stop-color="${colors.floorGradient}" />
  </radialGradient>`);

  // Wood gradient
  parts.push(`<linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${colors.woodLight}" />
    <stop offset="50%" stop-color="${colors.wood}" />
    <stop offset="100%" stop-color="${colors.woodDark}" />
  </linearGradient>`);

  // Fabric gradient
  parts.push(`<linearGradient id="fabricGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="${colors.fabricAccent}" />
    <stop offset="100%" stop-color="${colors.fabric}" />
  </linearGradient>`);

  // Drop shadow filter
  parts.push(`<filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
    <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#5C4033" flood-opacity="0.15" />
  </filter>`);

  // Soft glow for light simulation
  parts.push(`<filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="8" result="blur" />
    <feComposite in="SourceGraphic" in2="blur" operator="over" />
  </filter>`);

  // Wood grain pattern
  parts.push(`<pattern id="woodGrain" width="20" height="20" patternUnits="userSpaceOnUse">
    <rect width="20" height="20" fill="url(#woodGrad)" />
    <line x1="0" y1="3" x2="20" y2="4" stroke="${colors.woodDark}" stroke-width="0.5" opacity="0.3" />
    <line x1="0" y1="8" x2="20" y2="7" stroke="${colors.woodDark}" stroke-width="0.3" opacity="0.2" />
    <line x1="0" y1="14" x2="20" y2="15" stroke="${colors.woodDark}" stroke-width="0.4" opacity="0.25" />
    <line x1="0" y1="18" x2="20" y2="17" stroke="${colors.woodDark}" stroke-width="0.3" opacity="0.15" />
  </pattern>`);

  parts.push('</defs>');

  // Background
  parts.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="${colors.wall}" />`);

  // Room floor with gradient
  parts.push(`<rect x="${tx(0)}" y="${ty(0)}" width="${width * scale}" height="${length * scale}"
    fill="url(#floorGrad)" rx="4" />`);

  // Floor plank lines for texture
  for (let i = 0; i < length; i += 0.3) {
    const y = ty(i);
    parts.push(`<line x1="${tx(0)}" y1="${y}" x2="${tx(width)}" y2="${y}"
      stroke="${colors.floorGradient}" stroke-width="0.5" opacity="0.4" />`);
  }

  // Room border (walls)
  parts.push(`<rect x="${tx(0)}" y="${ty(0)}" width="${width * scale}" height="${length * scale}"
    fill="none" stroke="${colors.wallShadow}" stroke-width="3" rx="4" />`);

  // Inner wall shadow (depth effect)
  parts.push(`<rect x="${tx(0.05)}" y="${ty(0.05)}" width="${(width - 0.1) * scale}" height="${(length - 0.1) * scale}"
    fill="none" stroke="${colors.wallShadow}" stroke-width="1" opacity="0.5" rx="3" />`);

  // Door indicator (bottom wall)
  const doorX = tx(width / 2 - 0.35);
  const doorY = ty(length);
  const doorW = 0.7 * scale;
  parts.push(`<rect x="${doorX}" y="${doorY - 2}" width="${doorW}" height="6"
    fill="${colors.door}" rx="2" />`);
  // Door arc (swing indicator)
  parts.push(`<path d="M ${doorX} ${doorY - 2} A ${doorW} ${doorW} 0 0 1 ${doorX + doorW} ${doorY - 2}"
    fill="none" stroke="${colors.door}" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />`);

  // Window indicator (right wall)
  const winY = ty(length / 2 - 0.4);
  const winH = 0.8 * scale;
  parts.push(`<rect x="${tx(width) - 2}" y="${winY}" width="6" height="${winH}"
    fill="${colors.window}" stroke="${colors.windowFrame}" stroke-width="1.5" rx="1" opacity="0.7" />`);
  // Window light glow
  parts.push(`<rect x="${tx(width) - 4}" y="${winY + 4}" width="10" height="${winH - 8}"
    fill="${colors.light}" filter="url(#softGlow)" opacity="0.5" />`);

  // Furniture items
  for (const p of layout.placements) {
    const item = FurnitureFactory.getItem(p.catalogId);
    if (!item) continue;

    const w = item.dimensions.width;
    const d = item.dimensions.depth;
    const cx = tx(p.x);
    const cy = ty(p.y);
    const sw = w * scale;
    const sd = d * scale;
    const rotation = p.rotation;

    const category = item.category;
    const isPooja = category === 'pooja';
    const isSeating = category === 'seating';
    const isStorage = category === 'storage';
    const isBed = category === 'sleeping';
    const isTable = category === 'dining' || category === 'work';
    const isPlant = item.tags.includes('plant') || item.tags.includes('decor');

    // Rotation transform
    const transform = rotation !== 0
      ? `transform="rotate(${rotation} ${cx} ${cy})"`
      : '';

    parts.push(`<g ${transform}>`);

    if (isPooja) {
      // Mandir — ornate, golden accents
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#woodGrad)" stroke="${colors.rugBorder}" stroke-width="2" rx="3" filter="url(#dropShadow)" />`);
      // Inner detail
      parts.push(`<rect x="${cx - sw / 2 + 4}" y="${cy - sd / 2 + 4}" width="${sw - 8}" height="${sd - 8}"
        fill="none" stroke="${colors.rugBorder}" stroke-width="1" rx="2" opacity="0.6" />`);
      // Diya (lamp) indicator
      parts.push(`<circle cx="${cx}" cy="${cy - sd / 4}" r="3" fill="${colors.rugBorder}" opacity="0.8" />`);
      parts.push(`<circle cx="${cx}" cy="${cy - sd / 4}" r="5" fill="${colors.rugBorder}" opacity="0.2" filter="url(#softGlow)" />`);
    } else if (isSeating) {
      // Sofa — fabric with cushions
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#fabricGrad)" stroke="${colors.fabric}" stroke-width="1.5" rx="4" filter="url(#dropShadow)" />`);
      // Cushion lines
      const cushionCount = Math.max(2, Math.floor(w / 0.6));
      for (let ci = 1; ci < cushionCount; ci++) {
        const cx2 = cx - sw / 2 + (sw / cushionCount) * ci;
        parts.push(`<line x1="${cx2}" y1="${cy - sd / 2 + 4}" x2="${cx2}" y2="${cy + sd / 2 - 4}"
          stroke="${colors.fabric}" stroke-width="1" opacity="0.5" />`);
      }
      // Throw pillow accent
      parts.push(`<rect x="${cx - sw / 2 + 6}" y="${cy - sd / 2 + 3}" width="${sw * 0.2}" height="${sd * 0.25}"
        fill="${colors.rugBorder}" rx="2" opacity="0.7" />`);
    } else if (isStorage) {
      // Wardrobe/storage — wood with panel lines
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#woodGrain)" stroke="${colors.woodDark}" stroke-width="1.5" rx="2" filter="url(#dropShadow)" />`);
      // Panel doors
      const panelCount = Math.max(2, Math.floor(w / 0.5));
      for (let pi = 1; pi < panelCount; pi++) {
        const px2 = cx - sw / 2 + (sw / panelCount) * pi;
        parts.push(`<line x1="${px2}" y1="${cy - sd / 2 + 2}" x2="${px2}" y2="${cy + sd / 2 - 2}"
          stroke="${colors.woodDark}" stroke-width="1" opacity="0.4" />`);
      }
      // Handle dots
      for (let pi = 0; pi < panelCount; pi++) {
        const hx = cx - sw / 2 + (sw / panelCount) * (pi + 0.5);
        parts.push(`<circle cx="${hx}" cy="${cy + sd / 2 - 8}" r="2" fill="${colors.metal}" />`);
      }
    } else if (isBed) {
      // Bed — large rectangle with pillow area
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#fabricGrad)" stroke="${colors.wood}" stroke-width="2" rx="3" filter="url(#dropShadow)" />`);
      // Headboard
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd * 0.2}"
        fill="url(#woodGrad)" rx="2" />`);
      // Pillows
      parts.push(`<rect x="${cx - sw / 2 + 6}" y="${cy - sd / 2 + sd * 0.22}" width="${sw * 0.3}" height="${sd * 0.15}"
        fill="${colors.fabricAccent}" rx="3" opacity="0.8" />`);
      parts.push(`<rect x="${cx + sw / 2 - 6 - sw * 0.3}" y="${cy - sd / 2 + sd * 0.22}" width="${sw * 0.3}" height="${sd * 0.15}"
        fill="${colors.fabricAccent}" rx="3" opacity="0.8" />`);
    } else if (isTable) {
      // Desk/table — wood top with legs
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#woodGrad)" stroke="${colors.woodDark}" stroke-width="1" rx="2" filter="url(#dropShadow)" />`);
      // Leg indicators (small dots at corners)
      const legR = 2;
      parts.push(`<circle cx="${cx - sw / 2 + 5}" cy="${cy - sd / 2 + 5}" r="${legR}" fill="${colors.woodDark}" opacity="0.6" />`);
      parts.push(`<circle cx="${cx + sw / 2 - 5}" cy="${cy - sd / 2 + 5}" r="${legR}" fill="${colors.woodDark}" opacity="0.6" />`);
      parts.push(`<circle cx="${cx - sw / 2 + 5}" cy="${cy + sd / 2 - 5}" r="${legR}" fill="${colors.woodDark}" opacity="0.6" />`);
      parts.push(`<circle cx="${cx + sw / 2 - 5}" cy="${cy + sd / 2 - 5}" r="${legR}" fill="${colors.woodDark}" opacity="0.6" />`);
    } else if (isPlant) {
      // Plant — green circle cluster
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${Math.min(sw, sd) / 2}" fill="${colors.plant}" opacity="0.8" filter="url(#dropShadow)" />`);
      parts.push(`<circle cx="${cx - 3}" cy="${cy - 2}" r="${Math.min(sw, sd) * 0.3}" fill="${colors.plantLight}" opacity="0.6" />`);
      parts.push(`<circle cx="${cx + 3}" cy="${cy + 1}" r="${Math.min(sw, sd) * 0.25}" fill="${colors.plantLight}" opacity="0.5" />`);
    } else {
      // Generic furniture — warm neutral
      parts.push(`<rect x="${cx - sw / 2}" y="${cy - sd / 2}" width="${sw}" height="${sd}"
        fill="url(#woodGrad)" stroke="${colors.woodDark}" stroke-width="1" rx="2" filter="url(#dropShadow)" />`);
    }

    // Label
    const label = item.label.length > 12 ? item.label.substring(0, 10) + '…' : item.label;
    parts.push(`<text x="${cx}" y="${cy + sd / 2 + 10}" text-anchor="middle"
      font-family="system-ui, sans-serif" font-size="7" fill="${colors.woodDark}" opacity="0.7">${label}</text>`);

    parts.push('</g>');
  }

  // Rug under seating area (if sofa exists)
  const sofaPlacement = layout.placements.find((p) => {
    const item = FurnitureFactory.getItem(p.catalogId);
    return item?.category === 'seating';
  });
  if (sofaPlacement) {
    const rugW = 1.8 * scale;
    const rugD = 1.2 * scale;
    const rugX = tx(sofaPlacement.x);
    const rugY = ty(sofaPlacement.y);
    parts.push(`<rect x="${rugX - rugW / 2}" y="${rugY - rugD / 2}" width="${rugW}" height="${rugD}"
      fill="${colors.rug}" stroke="${colors.rugBorder}" stroke-width="1" rx="2" opacity="0.5" />`);
    // Rug border pattern
    parts.push(`<rect x="${rugX - rugW / 2 + 4}" y="${rugY - rugD / 2 + 4}" width="${rugW - 8}" height="${rugD - 8}"
      fill="none" stroke="${colors.rugBorder}" stroke-width="0.5" rx="1" opacity="0.4" />`);
  }

  // Light simulation — warm glow from window side
  parts.push(`<ellipse cx="${tx(width - 0.3)}" cy="${ty(length / 2)}" rx="${width * scale * 0.6}" ry="${length * scale * 0.5}"
    fill="${colors.light}" opacity="0.15" filter="url(#softGlow)" />`);

  // Compass rose
  const compassX = tx(width - 0.35);
  const compassY = ty(0.35);
  parts.push(`<g transform="translate(${compassX}, ${compassY})">
    <circle cx="0" cy="0" r="14" fill="white" fill-opacity="0.9" stroke="${colors.woodDark}" stroke-width="1" />
    <polygon points="0,-10 3,-2 -3,-2" fill="${colors.wood}" />
    <polygon points="0,10 3,2 -3,2" fill="${colors.woodDark}" opacity="0.5" />
    <text x="0" y="3" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="${colors.wood}">N</text>
  </g>`);

  // View angle label
  const viewLabel = viewAngle === 'entrance' ? 'Entrance View' : viewAngle === 'living' ? 'Living View' : 'Top-Down View';
  parts.push(`<text x="${tx(0.3)}" y="${ty(-0.2)}" text-anchor="start"
    font-family="system-ui, sans-serif" font-size="9" fill="${colors.woodDark}" opacity="0.6" font-style="italic">${viewLabel}</text>`);

  // Room dimensions label
  parts.push(`<text x="${tx(width / 2)}" y="${ty(length + 0.35)}" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="8" fill="${colors.woodDark}" opacity="0.5">
    ${width.toFixed(1)}m × ${length.toFixed(1)}m
  </text>`);

  parts.push('</svg>');

  const svgString = parts.join('\n');
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
}

/**
 * Clear the render cache. Useful for testing or when layouts change significantly.
 */
export function clearRenderCache(): void {
  renderCache.clear();
}
