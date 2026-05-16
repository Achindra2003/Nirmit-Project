import { generateLayouts, type SolverInput, type LayoutResult } from '../../solver/layoutSolver';
import { LAYOUT_RANKING_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const MODEL = 'kimi-k2-instruct';

interface AIRankedLayout {
  layoutId: number;
  title: string;
  description: string;
  rank: number;
  recommended: boolean;
  reasoning: string;
}

export async function getAIRankedLayouts(
  solverInput: SolverInput,
  userPreferences: { style: string; city: string; mustHaves: string[] }
): Promise<{ layouts: LayoutResult[]; rankings: AIRankedLayout[] }> {
  const solverLayouts = generateLayouts(solverInput, 10);
  if (solverLayouts.length === 0) return { layouts: [], rankings: [] };

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
            {
              role: 'user',
              content: `${LAYOUT_RANKING_PROMPT}\n\nRoom vertices: ${JSON.stringify(solverInput.roomVertices)}\nLayouts: ${JSON.stringify(solverLayouts.map((l, i) => ({ index: i, placements: l.placements, score: l.score })))}\nPreferences: ${JSON.stringify(userPreferences)}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { layouts: solverLayouts, rankings: parsed.rankings };
      }
    } catch {
      console.warn('AI ranking failed, using solver scores');
    }
  }

  const fallbackRankings: AIRankedLayout[] = solverLayouts.slice(0, 5).map((layout, i) => ({
    layoutId: i,
    title: `Layout Option ${i + 1}`,
    description: `${layout.placements.length} items placed. Score: ${layout.score}`,
    rank: i + 1,
    recommended: i === 0,
    reasoning: 'Ranked by spatial scoring algorithm',
  }));

  return { layouts: solverLayouts, rankings: fallbackRankings };
}