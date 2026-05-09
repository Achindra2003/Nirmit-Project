import { SCOPE_OF_WORK_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';
import type { Item } from '../../store/useStore';
import { fetchWithRetry, GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, ApiError } from './apiClient';

interface ScopeRequest {
  room: { type: string; width: number; length: number; shape: string };
  furniture: Item[];
  materials: { wallColor: string; flooring: string; woodFinish: string };
  city: string;
}

export async function generateScopeOfWork(request: ScopeRequest): Promise<string> {
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
              { role: 'user', content: `${SCOPE_OF_WORK_PROMPT}\n\n${JSON.stringify(request, null, 2)}` },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
        { maxRetries: 3, baseDelay: 1000, timeout: 30000 },
      );

      // Check HTTP status — fetchWithRetry already throws on !ok,
      // but we keep the explicit check for defense-in-depth
      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          console.warn('[Nirmit] Scope AI: API key invalid — using fallback scope');
        } else if (status === 429) {
          console.warn('[Nirmit] Scope AI: Rate limited — using fallback scope');
        } else {
          console.warn(`[Nirmit] Scope AI: HTTP ${status} — using fallback scope`);
        }
        throw new ApiError(status, `HTTP ${status}`, false);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || generateFallbackScope(request);
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn(`[Nirmit] Scope AI error (${err.status}): ${err.message} — using fallback scope`);
      } else {
        console.warn('[Nirmit] AI scope generation failed — using fallback scope');
      }
    }
  } else {
    console.info('[Nirmit] No Groq API key — using fallback scope of work');
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
