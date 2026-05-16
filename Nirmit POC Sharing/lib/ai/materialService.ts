import { MATERIAL_RECOMMENDATION_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const MODEL = 'kimi-k2-instruct';

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
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT_INTERIOR_DESIGNER },
            { role: 'user', content: `${MATERIAL_RECOMMENDATION_PROMPT}\n\nRoom: ${JSON.stringify(room)}\nCity: ${city}\nStyle: ${style}\nBudget: ${budget}` },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      console.warn('AI material recommendation failed');
    }
  }

  return DEFAULTS.mid;
}