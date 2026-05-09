import { useEffect, useMemo, useState } from 'react';
import Planner2D from '../components/Planner2D';
import { getAIRankedLayouts } from '../lib/ai/layoutService';
import { estimateCostSummary, formatINR } from '../lib/costing';
import { buildItemsFromSolverPlacements, buildItemsFromVibeSuggestions } from '../lib/layout/itemBuilders';
import type { LayoutResult } from '../solver/layoutSolver';
import type { DoorWindowItem, Item, RoomConfig } from '../store/useStore';
import type { Act1HandoffPayload } from '../types/journey';

interface RankedLayout {
  layoutId: number;
  title: string;
  description: string;
  rank: number;
  recommended: boolean;
  reasoning: string;
}

export interface OptionsGallerySelection {
  title: string;
  description: string;
  layout: LayoutResult;
  items: Item[];
  room: RoomConfig;
  doorWindows: DoorWindowItem[];
}

interface OptionsGalleryProps {
  act1Payload: Act1HandoffPayload;
  onSelectLayout: (selection: OptionsGallerySelection) => void;
  onSkipToPlanner: () => void;
  onBack: () => void;
}

interface GalleryCardData {
  id: string;
  title: string;
  description: string;
  recommended: boolean;
  layout: LayoutResult;
  items: Item[];
  totalLow: number;
  totalHigh: number;
}

const GALLERY_ROOM: RoomConfig = {
  type: 'bedroom',
  width: 10,
  length: 11,
  shape: 'rectangle',
};

const GALLERY_DOOR_WINDOWS: DoorWindowItem[] = [
  { id: 'gallery_door', type: 'door', wallIndex: 3, position: 0.5 },
  { id: 'gallery_window', type: 'window', wallIndex: 1, position: 0.5 },
];

const LOADING_STEPS = [
  'Tracing your room geometry',
  'Applying Vastu and movement rules',
  'Generating five complete layout directions',
  'Ranking options with your city and style context',
  'Preparing ready-to-edit room options',
];

function normalizeCards(
  layouts: LayoutResult[],
  rankings: RankedLayout[],
  city: string,
): GalleryCardData[] {
  const orderedRankings = [...rankings].sort((a, b) => a.rank - b.rank);
  const usedLayoutIds = new Set<number>();
  const cards: GalleryCardData[] = [];

  for (const ranking of orderedRankings) {
    const layout = layouts[ranking.layoutId];
    if (!layout) continue;
    usedLayoutIds.add(ranking.layoutId);
    const items = buildItemsFromSolverPlacements(layout.placements);
    const summary = estimateCostSummary(items, city);
    cards.push({
      id: `ranked_${ranking.rank}_${ranking.layoutId}`,
      title: ranking.title || `Layout Option ${cards.length + 1}`,
      description: ranking.description || 'Balanced room layout generated from your preferences.',
      recommended: ranking.recommended || cards.length === 0,
      layout,
      items,
      totalLow: summary.totalLow,
      totalHigh: summary.totalHigh,
    });
    if (cards.length >= 5) break;
  }

  for (let i = 0; i < layouts.length && cards.length < 5; i++) {
    if (usedLayoutIds.has(i)) continue;
    const layout = layouts[i];
    const items = buildItemsFromSolverPlacements(layout.placements);
    const summary = estimateCostSummary(items, city);
    cards.push({
      id: `fallback_${i}`,
      title: `Layout Option ${cards.length + 1}`,
      description: `Generated with ${layout.placements.length} placed items and a spatial score of ${layout.score}.`,
      recommended: cards.length === 0,
      layout,
      items,
      totalLow: summary.totalLow,
      totalHigh: summary.totalHigh,
    });
  }

  return cards.slice(0, 5);
}

export default function OptionsGallery({ act1Payload, onSelectLayout, onSkipToPlanner, onBack }: OptionsGalleryProps) {
  const [cards, setCards] = useState<GalleryCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        const seededItems = buildItemsFromVibeSuggestions(act1Payload.vibeConfig.suggestedFurnitureLayout);
        const requiredFurniture = seededItems.map((item) => ({
          catalogId: item.code,
          priority: 'mandatory' as const,
        }));

        const result = await getAIRankedLayouts(
          {
            roomVertices: [
              { x: 0, y: 0 },
              { x: GALLERY_ROOM.width, y: 0 },
              { x: GALLERY_ROOM.width, y: GALLERY_ROOM.length },
              { x: 0, y: GALLERY_ROOM.length },
            ],
            doorPositions: [{ wallIndex: 3, position: 0.5 }],
            windowPositions: [{ wallIndex: 1, position: 0.5 }],
            requiredFurniture,
            constraints: {
              walkwayMinWidth: 0.6,
              vastuRules: true,
              bedOrientation: 'head_south',
              poojaDirection: 'northeast',
              kitchenDirection: 'southeast',
            },
          },
          {
            style: act1Payload.vibeConfig.name,
            city: act1Payload.context.city,
            mustHaves: act1Payload.context.mustHaves,
          },
        );

        if (ignore) return;
        const normalized = normalizeCards(
          result.layouts,
          result.rankings as RankedLayout[],
          act1Payload.context.city,
        );
        setCards(normalized);
      } catch {
        if (ignore) return;
        setError('Could not generate options right now. You can still continue to the editor.');
      } finally {
        if (!ignore) {
          setDataReady(true);
        }
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [act1Payload]);

  const loadingDone = stepIndex >= LOADING_STEPS.length - 1;
  const showGallery = dataReady && loadingDone && cards.length > 0;
  const subtitle = useMemo(
    () => `City: ${act1Payload.context.city} | Style: ${act1Payload.vibeConfig.name}`,
    [act1Payload.context.city, act1Payload.vibeConfig.name],
  );

  return (
    <section style={{ minHeight: 'calc(100vh - 56px)', background: '#1C1917', color: '#FAFAF8', padding: '32px 28px 40px' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,250,248,0.6)', marginBottom: 8 }}>Options Gallery</div>
            <h1 style={{ margin: 0, fontFamily: 'var(--f-display)', fontSize: '3rem', fontWeight: 400, lineHeight: 1 }}>
              Your home, before you build it.
            </h1>
            <p style={{ margin: '10px 0 0', color: 'rgba(250,250,248,0.75)', fontSize: 14 }}>{subtitle}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={onBack} style={{ border: '1px solid rgba(250,250,248,0.25)', color: '#FAFAF8', padding: '9px 16px' }}>
            Back
          </button>
        </div>

        {!showGallery && (
          <div style={{ borderRadius: 20, border: '1px solid rgba(250,250,248,0.15)', padding: '24px 26px', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LOADING_STEPS.map((step, idx) => {
                const visible = idx <= stepIndex;
                const active = idx === stepIndex;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: visible ? 1 : 0.25, transform: visible ? 'translateY(0)' : 'translateY(6px)', transition: 'all 250ms ease' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9999, border: '1px solid rgba(250,250,248,0.45)', background: active ? '#FAFAF8' : 'transparent' }} />
                    <span style={{ fontSize: 13, color: active ? '#FAFAF8' : 'rgba(250,250,248,0.75)' }}>{step}</span>
                  </div>
                );
              })}
            </div>
            {error && <p style={{ marginTop: 16, color: '#FCA5A5', fontSize: 12 }}>{error}</p>}
          </div>
        )}

        {showGallery && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(250,250,248,0.8)' }}>
                Pick the direction that feels closest. You can tweak everything later.
              </p>
              <button type="button" className="btn-ghost" onClick={onSkipToPlanner} style={{ color: 'rgba(250,250,248,0.9)', border: '1px solid rgba(250,250,248,0.25)', padding: '8px 14px' }}>
                Start from scratch
              </button>
            </div>

            <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(300px, 360px)', gap: 16, overflowX: 'auto', paddingBottom: 6 }}>
              {cards.map((card, idx) => (
                <article key={card.id} style={{ background: 'white', color: '#1C1917', borderRadius: 18, border: '1px solid #E8E6DF', overflow: 'hidden', boxShadow: '0 18px 36px rgba(0,0,0,0.2)' }}>
                  <div style={{ height: 220, borderBottom: '1px solid #E8E6DF', background: '#FAFAF8' }}>
                    <Planner2D compact snapshot={{ room: GALLERY_ROOM, items: card.items, doorWindows: GALLERY_DOOR_WINDOWS }} />
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--f-display)', fontSize: '1.45rem', fontWeight: 500, lineHeight: 1 }}>{card.title}</h3>
                      {(card.recommended || idx === 0) && (
                        <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid #1C1917', borderRadius: 9999, padding: '4px 8px' }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#57534E', fontSize: 12, minHeight: 34, lineHeight: 1.45 }}>{card.description}</p>
                    <div style={{ fontSize: 12, color: '#292524', fontWeight: 600 }}>
                      INR {formatINR(card.totalLow)} - INR {formatINR(card.totalHigh)}
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: 4, width: '100%', padding: '10px 0' }}
                      onClick={() => onSelectLayout({
                        title: card.title,
                        description: card.description,
                        layout: card.layout,
                        items: card.items,
                        room: GALLERY_ROOM,
                        doorWindows: GALLERY_DOOR_WINDOWS,
                      })}
                    >
                      Choose this layout
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
