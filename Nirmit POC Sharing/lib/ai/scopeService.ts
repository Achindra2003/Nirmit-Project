import { SCOPE_OF_WORK_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';
import type { Item } from '../../store/useStore';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const MODEL = 'kimi-k2-instruct';

interface ScopeRequest {
  room: { type: string; width: number; length: number; shape: string };
  furniture: Item[];
  materials: { wallColor: string; flooring: string; woodFinish: string };
  city: string;
}

export async function generateScopeOfWork(request: ScopeRequest): Promise<string> {
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
            { role: 'user', content: `${SCOPE_OF_WORK_PROMPT}\n\n${JSON.stringify(request, null, 2)}` },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || generateFallbackScope(request);
    } catch {
      console.warn('AI scope generation failed');
    }
  }

  return generateFallbackScope(request);
}

function generateFallbackScope(request: ScopeRequest): string {
  const area = request.room.width * request.room.length;
  return `SCOPE OF WORK — ${request.room.type} (${request.room.width}ft × ${request.room.length}ft)

1. Wall Preparation & Painting
   - Surface leveling with putty
   - One coat primer + two coats ${request.materials.wallColor}
   - Estimated time: 2 days

2. Flooring Installation
   - ${request.materials.flooring.replace('-', ' ')} — ${area} sq.ft.
   - Includes skirting
   - Estimated time: 1-2 days

3. Furniture Installation
   - ${request.furniture.length} items — ${request.materials.woodFinish} finish
   - Estimated time: ${Math.ceil(request.furniture.length / 3)} days

4. Cleanup & Handover — 0.5 day

Total: ~${Math.ceil(request.furniture.length / 3) + 4} days`;
}