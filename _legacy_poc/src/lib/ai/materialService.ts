import { MATERIAL_RECOMMENDATION_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';
import { fetchWithRetry, GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, ApiError } from './apiClient';

export interface MaterialRecommendation {
  walls: Array<{ surface: string; product: string; color: string; finish: string; reasoning: string }>;
  flooring: Array<{ type: string; product: string; color: string; sqft: number; reasoning: string }>;
  furnitureFinish: { primary: string; secondary: string; reasoning: string };
  hardwareFinish: { color: string; reasoning: string };
}

const DEFAULTS: Record<string, MaterialRecommendation> = {
  mid: {
    walls: [{ surface: 'main_walls', product: 'Asian Paints Royale Luxury Emulsion', color: 'Warm Bisque (7834)', finish: 'matte', reasoning: 'Warm neutral for Indian homes with natural light.' }],
    flooring: [{ type: 'living_floor', product: 'CenturyPly Premium Laminates', color: 'Smoked Oak', sqft: 0, reasoning: 'Durable wood-finish laminate.' }],
    furnitureFinish: { primary: 'Teak Veneer', secondary: 'White Laminate', reasoning: 'Two-tone contemporary. Teak adds warmth.' },
    hardwareFinish: { color: 'Brushed Brass', reasoning: 'Warm metallic accent.' },
  },
};

export async function getMaterialRecommendations(
  room: { type: string; width: number; length: number; height: number },
  city: string,
  style: string,
  budget: 'budget' | 'mid' | 'premium'
): Promise<MaterialRecommendation> {
  if (GROQ_API_KEY) {
    try {
      const response = await fetchWithRetry(
        GROQ_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT_INTERIOR_DESIGNER },
              { role: 'user', content: `${MATERIAL_RECOMMENDATION_PROMPT}\n\nRoom: ${JSON.stringify(room)}\nCity: ${city}\nStyle: ${style}\nBudget: ${budget}` },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
        { maxRetries: 3, baseDelay: 1000, timeout: 30000 },
      );

      // Check HTTP status — fetchWithRetry already throws on !ok,
      // but we keep the explicit check for defense-in-depth
      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          console.warn('[Nirmit] Material AI: API key invalid — using defaults');
        } else if (status === 429) {
          console.warn('[Nirmit] Material AI: Rate limited — using defaults');
        } else {
          console.warn(`[Nirmit] Material AI: HTTP ${status} — using defaults`);
        }
        throw new ApiError(status, `HTTP ${status}`, false);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn(`[Nirmit] Material AI error (${err.status}): ${err.message} — using defaults`);
      } else {
        console.warn('[Nirmit] AI material recommendation failed — using defaults');
      }
    }
  } else {
    console.info('[Nirmit] No Groq API key — using default material recommendations');
  }

  return DEFAULTS.mid;
}
