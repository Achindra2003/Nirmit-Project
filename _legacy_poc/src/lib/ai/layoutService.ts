import { generateLayouts, type SolverInput, type LayoutResult } from '../../solver/layoutSolver';
import { LAYOUT_RANKING_PROMPT, SYSTEM_PROMPT_INTERIOR_DESIGNER } from './prompts';
import type { Item } from '../../store/useStore';
import { fetchWithRetry, GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, ApiError } from './apiClient';

export interface AIRankedLayout {
  layoutId: number;
  title: string;
  description: string;
  rank: number;
  recommended: boolean;
  reasoning: string;
  /** Design philosophy: gathering, breath, or keeper */
  philosophy?: 'gathering' | 'breath' | 'keeper';
  /** Personalized "why this was made for you" explanation from AI */
  whyThisWasMadeForYou?: string;
}

export interface AIRankedResult {
  layouts: LayoutResult[];
  rankings: AIRankedLayout[];
  /** True when the AI API was unavailable and we fell back to solver-only rankings */
  degraded: boolean;
}

/**
 * Get AI-ranked layouts with optional streaming support.
 * When `onToken` is provided, uses fetch with streaming to deliver
 * tokens as they arrive from the Groq API.
 *
 * Returns a `degraded` flag when the AI API fails and we fall back
 * to solver-only algorithmic rankings.
 */
export async function getAIRankedLayouts(
  solverInput: SolverInput,
  userPreferences: {
    style: string;
    city: string;
    mustHaves: string[];
    desiredFeeling?: string;
    whoIsThisRoomFor?: string;
    currentRoomFrustration?: string;
    lovedItemToKeep?: string;
    vastuContext?: 'personal' | 'family' | 'none';
    budgetPhase?: 'full' | 'phase1' | 'unsure';
  },
  onToken?: (token: string) => void,
  signal?: AbortSignal,
): Promise<AIRankedResult> {
  const solverLayouts = generateLayouts(solverInput, 10);
  if (solverLayouts.length === 0) return { layouts: [], rankings: [], degraded: false };

  if (GROQ_API_KEY) {
    try {
      const body = {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_INTERIOR_DESIGNER },
          {
            role: 'user',
            content: `${LAYOUT_RANKING_PROMPT}\n\nRoom vertices: ${JSON.stringify(solverInput.roomVertices)}\nLayouts: ${JSON.stringify(solverLayouts.map((l, i) => ({ index: i, placements: l.placements, score: l.score })))}\nPreferences: ${JSON.stringify(userPreferences)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      };

      // If streaming callback provided, use streaming fetch
      if (onToken) {
        const text = await fetchStreaming(GROQ_API_URL, GROQ_API_KEY, body, onToken);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { layouts: solverLayouts, rankings: parsed.rankings, degraded: false };
        }
      } else {
        // Non-streaming: use fetchWithRetry for robustness
        const response = await fetchWithRetry(
          GROQ_API_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify(body),
            signal,
          },
          { maxRetries: 3, baseDelay: 1000, timeout: 30000 },
        );

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { layouts: solverLayouts, rankings: parsed.rankings, degraded: false };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          console.warn('[Nirmit] Groq API key invalid or unauthorized — falling back to solver rankings');
        } else if (err.status === 429) {
          console.warn('[Nirmit] Groq API rate limited — falling back to solver rankings');
        } else {
          console.warn(`[Nirmit] Groq API error (${err.status}): ${message} — using solver scores`);
        }
      } else {
        console.warn(`[Nirmit] AI ranking failed: ${message} — using solver scores`);
      }
    }
  } else {
    console.info('[Nirmit] No Groq API key configured — using solver-only rankings');
  }

  const philosophies: Array<'gathering' | 'breath' | 'keeper'> = ['gathering', 'breath', 'keeper'];
  const philosophyLabels: Record<string, { title: string; desc: string; driver: string }> = {
    gathering: { title: 'The Gathering', desc: 'Warm, conversation-first layout where everyone faces each other.', driver: 'Maximizes togetherness' },
    breath: { title: 'The Breath', desc: 'Open, minimal, made for peace and space. Light-filled with clear walkways.', driver: 'Maximizes openness' },
    keeper: { title: 'The Keeper', desc: 'Storage-first design where every wall works hard. Organized and efficient.', driver: 'Maximizes storage' },
  };

  const fallbackRankings: AIRankedLayout[] = solverLayouts
    .slice(0, 3)
    .map((layout, i) => {
      const phil = philosophies[i] ?? 'breath';
      const label = philosophyLabels[phil];
      const lovedItem = userPreferences.lovedItemToKeep;
      const feeling = userPreferences.desiredFeeling;
      const whoFor = userPreferences.whoIsThisRoomFor;

      let whyText = `This layout was designed with your needs in mind.`;
      if (phil === 'gathering') {
        whyText = whoFor
          ? `You said this room is for ${whoFor}. We arranged the seating to face inward so everyone can connect naturally.${lovedItem ? ` Your ${lovedItem} would sit beautifully on the side table near the window.` : ''}${feeling ? ` The warm, dense arrangement creates the ${feeling} feeling you're looking for.` : ''}`
          : `We prioritized conversation and togetherness in this layout. Seating faces inward to create natural gathering zones.${lovedItem ? ` Your ${lovedItem} finds a special spot near the window.` : ''}`;
      } else if (phil === 'breath') {
        whyText = feeling
          ? `You wanted this room to feel ${feeling}. We kept the center open and the furniture count low — just the essentials, placed to let light and air flow freely.${lovedItem ? ` Your ${lovedItem} gets a dedicated spot where it can be appreciated without clutter.` : ''}`
          : `We maximized openness and calm in this layout. The center stays free for movement, and every piece has room to breathe.${lovedItem ? ` Your ${lovedItem} would catch the light beautifully here.` : ''}`;
      } else {
        whyText = `Storage was a priority here. We lined the walls with functional units so everything has a home — without making the room feel cramped.${lovedItem ? ` Your ${lovedItem} gets a dedicated display shelf where it can shine.` : ''}${feeling ? ` The result is a room that feels ${feeling} and organized.` : ''}`;
      }

      return {
        layoutId: i,
        title: label.title,
        philosophy: phil,
        description: label.desc,
        whyThisWasMadeForYou: whyText,
        rank: i + 1,
        recommended: i === 0,
        reasoning: `Ranked by spatial scoring algorithm — ${label.driver}`,
      };
    });

  return { layouts: solverLayouts, rankings: fallbackRankings, degraded: true };
}

/**
 * Fetch with SSE streaming from Groq API.
 * Parses the SSE stream and calls onToken for each content delta.
 * Returns the full accumulated text.
 */
async function fetchStreaming(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void,
): Promise<string> {
  // Groq supports streaming via `stream: true`
  const streamBody = { ...body, stream: true };

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(streamBody),
    },
    { maxRetries: 2, baseDelay: 1000, timeout: 60000 },
  );

  if (!response.body) {
    throw new Error('Streaming response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines: each line starts with "data: "
    const lines = buffer.split('\n');
    // Keep the last partial line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const dataStr = trimmed.slice(6); // Remove "data: " prefix
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onToken(content);
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }

  return fullText;
}

// ─────────────────────────────────────────────────
// What-If Analysis
// ─────────────────────────────────────────────────

export interface WhatIfAnalysis {
  /** Cost impact in INR (positive = more expensive, negative = cheaper) */
  costImpact: number;
  /** Human-readable cost description */
  costDescription: string;
  /** Space impact description */
  spaceImpact: string;
  /** Vastu impact description with percentage change */
  vastuImpact: string;
  /** Aesthetic impact description */
  aestheticImpact: string;
  /** Whether the change is recommended */
  recommended: boolean;
  /** Summary recommendation */
  summary: string;
}

/**
 * Analyze the impact of a proposed change (material swap, item swap, move).
 * Uses the Groq API to generate a what-if analysis.
 */
export async function analyzeWhatIf(
  changeType: 'material' | 'swap' | 'move',
  changeDescription: string,
  currentItems: Item[],
  roomConfig: { type: string; width: number; length: number },
): Promise<WhatIfAnalysis | null> {
  if (!GROQ_API_KEY) return null;

  try {
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_INTERIOR_DESIGNER },
        {
          role: 'user',
          content: `Analyze this proposed change for an Indian home interior:\n\nChange type: ${changeType}\nChange: ${changeDescription}\nRoom: ${roomConfig.type} (${roomConfig.width}ft × ${roomConfig.length}ft)\nCurrent items: ${currentItems.length} pieces\n\nReturn a JSON object with: costImpact (INR, positive=more expensive), costDescription, spaceImpact, vastuImpact, aestheticImpact, recommended (boolean), summary.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    };

    const response = await fetchWithRetry(
      GROQ_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      },
      { maxRetries: 2, baseDelay: 1000, timeout: 20000 },
    );

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as WhatIfAnalysis;
    }
  } catch (err) {
    console.warn('[Nirmit] What-if analysis failed:', err instanceof Error ? err.message : String(err));
  }

  return null;
}
