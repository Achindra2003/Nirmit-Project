/**
 * Nirmit PlannerScreen — Chat-First Redesign
 *
 * Phase 2: Intent-Based 3D Editing
 * - Chat panel on LEFT (400px), always visible after welcome
 * - 3D/2D viewer on RIGHT, fills remaining space
 * - Welcome overlay replaced by in-chat welcome message
 * - AI collaborator drives the experience
 *
 * Phase 3: Collaborator That Always Takes a Position
 * - All messages go to Groq AI with NIRMIT_COLLABORATOR_PROMPT (fast-path for simple commands only)
 * - Proactive welcome referencing user intake (family, feeling, frustrations, loved item, vastu)
 * - Proactive savings every 3-4 actions
 * - Extended conversation memory (5-turn history + userPreferences)
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Planner2D from '../components/Planner2D';
import Viewer3D from '../components/Viewer3D';
import { estimateCostSummary, formatINR } from '../lib/costing';
import { useStore, type Item, type ItemDraft } from '../store/useStore';
import type { IntakePayload, LegacyContextFromIntake, LegacyVibeFromIntake } from '../types/journey';
import { deriveLegacyContext, deriveLegacyVibe } from '../types/journey';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import type { CatalogItem, CatalogCategory } from '../catalog/types';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Search,
  Sofa,
  Bed,
  Archive,
  Utensils,
  Laptop,
  Palette,
  Wrench,
  BoxSelect,
  Check,
  Eye,
  Grid3X3,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {
  processUserMessage,
  createConversation,
  getAICollaboratorResponse,
  type ConversationContext,
  type ChatResult,
  type ChatAction,
} from '../lib/ai/chatEngine';
import { logWarn } from '../lib/logger';
import { trackEvent } from '../lib/analytics';

interface PlannerScreenProps {
  intakePayload: IntakePayload;
  onBack: () => void;
  onContinue: () => void;
}

function getCategoryIcon(category: string, color: string = 'var(--brand)') {
  const props = { size: 14, color, strokeWidth: 1.5 };
  switch (category) {
    case 'seating':
      return <Sofa {...props} />;
    case 'sleeping':
      return <Bed {...props} />;
    case 'storage':
      return <Archive {...props} />;
    case 'dining':
      return <Utensils {...props} />;
    case 'pooja':
      return <Sparkles {...props} />;
    case 'kitchen':
      return <Utensils {...props} />;
    case 'work':
      return <Laptop {...props} />;
    case 'decor':
      return <Palette {...props} />;
    case 'fixtures':
      return <Wrench {...props} />;
    default:
      return <BoxSelect {...props} />;
  }
}

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    seating: '#F0E8D8',
    sleeping: '#E8E4DC',
    storage: '#EDEAE4',
    dining: '#F5F0E8',
    pooja: '#FFF8E7',
    work: '#E8F0E8',
    decor: '#F8F5F0',
    kitchen: '#F0ECE4',
    fixtures: '#EEEBE6',
  };
  return map[category] ?? '#F4F3EE';
}

function buildDraftFromCatalog(
  item: CatalogItem,
  overrides?: Partial<{ x: number; y: number; rotation: number }>,
): ItemDraft {
  return {
    code: item.id,
    name: item.label,
    x: overrides?.x ?? 5,
    y: overrides?.y ?? 5,
    width: item.dimensions.width,
    length: item.dimensions.depth,
    height: item.dimensions.height,
    rotation: overrides?.rotation ?? 0,
    color:
      item.pricing.materialOptions['wood_teak']?.colorHex ?? '#8B6914',
    modelPath: item.modelPath.startsWith('primitive:') ? '' : item.modelPath,
    price: item.pricing.baseCost,
    brand: 'Nirmit Catalog',
  };
}

function resolveMustHaveGaps(mustHaves: string[], items: Item[]) {
  const codes = items.map((item) => item.code);
  const gaps: string[] = [];
  for (const mh of mustHaves) {
    if (mh === 'WFH Desk' && !codes.some((c) => c.includes('desk')))
      gaps.push('WFH Desk is requested but not placed yet.');
    if (
      mh === 'Heavy Storage' &&
      !codes.some((c) => c.includes('wardrobe') || c.includes('trunk'))
    )
      gaps.push('Heavy Storage requested. Add a wardrobe.');
    if (
      mh === 'Reading Nook' &&
      !codes.some((c) => c.includes('chair') || c.includes('divan'))
    )
      gaps.push('Reading Nook requested. Add a lounge chair.');
    if (
      mh === 'Mandir Space' &&
      !codes.some((c) => c.includes('pooja') || c.includes('mandir'))
    )
      gaps.push('Mandir Space requested. Add a pooja unit.');
  }
  return gaps;
}

/**
 * Streaming typewriter hook: reveals text character-by-character at ~30 chars/sec.
 */
function useTypewriter(fullText: string, enabled: boolean, speed: number = 30) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const fullRef = useRef(fullText);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(fullText);
      return;
    }

    if (fullRef.current !== fullText) {
      fullRef.current = fullText;
      indexRef.current = 0;
      setDisplayed('');
    }

    const intervalMs = 1000 / speed;
    const timer = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= fullText.length) {
        setDisplayed(fullText);
        clearInterval(timer);
      } else {
        setDisplayed(fullText.slice(0, indexRef.current));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [fullText, enabled, speed]);

  return displayed;
}

export default function PlannerScreen({
  intakePayload,
  onBack,
  onContinue,
}: PlannerScreenProps) {
  // Derive legacy shapes for internal use during migration
  const legacyContext = useMemo<LegacyContextFromIntake>(
    () => deriveLegacyContext(intakePayload),
    [intakePayload],
  );
  const legacyVibe = useMemo<LegacyVibeFromIntake>(
    () => deriveLegacyVibe(intakePayload),
    [intakePayload],
  );
  // Compatibility proxy: all old act1Payload.* accesses route through these derived objects
  const act1Payload = useMemo(
    () => ({
      context: legacyContext,
      vibeConfig: legacyVibe,
    }),
    [legacyContext, legacyVibe],
  );

  const items = useStore((s) => s.items);
  const activeItemId = useStore((s) => s.activeItemId);
  const room = useStore((s) => s.room);
  const advisories = useStore((s) => s.advisories);
  const addItem = useStore((s) => s.addItem);
  const removeItem = useStore((s) => s.removeItem);
  const rotateItem = useStore((s) => s.rotateItem);
  const setRoomConfig = useStore((s) => s.setRoomConfig);
  const setActiveItem = useStore((s) => s.setActiveItem);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');
  const [suppressedVastu, setSuppressedVastu] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null);

  // ── Chat-first: no welcome overlay, chat is always primary ──
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Build proactive welcome message from deep user context ──
  const buildWelcomeMessage = useCallback(() => {
    const ctx = act1Payload.context;
    const roomType = act1Payload.vibeConfig?.name ?? 'room';
    const whoFor = ctx?.whoIsThisRoomFor ?? '';
    let impliedName = '';
    if (whoFor && whoFor.length > 0 && !whoFor.toLowerCase().includes('family')) {
      impliedName = whoFor.split(' ')[0];
    }
    const greeting = impliedName ? `, ${impliedName}` : '';

    // Build specific references from intake
    const refs: string[] = [];
    if (ctx.mustHaves?.includes('Mandir Space'))
      refs.push('the mandir is placed northeast for Vastu');
    if (ctx.mustHaves?.includes('WFH Desk'))
      refs.push('the work desk is positioned near natural light');
    if (ctx.mustHaves?.includes('Heavy Storage'))
      refs.push('storage units line the walls to keep things organized');
    if (ctx.mustHaves?.includes('Reading Nook'))
      refs.push('a cozy reading corner is tucked in by the window');

    const lovedItem = ctx?.lovedItemToKeep;
    if (lovedItem && lovedItem.trim()) {
      refs.push(`I left space for your ${lovedItem}`);
    }

    const feeling = ctx?.desiredFeeling;
    if (feeling && feeling.trim()) {
      refs.push(`the palette is tuned to feel ${feeling}`);
    }

    const frustrations = ctx?.currentRoomFrustration;
    if (frustrations && frustrations.trim()) {
      refs.push(`I addressed your frustration with "${frustrations}"`);
    }

    const refsText =
      refs.length > 0
        ? ` I've placed everything based on what you told us — ${refs.join(', ')}.`
        : '';

    return `Welcome to your ${roomType}${greeting}!${refsText} Take a look. If anything doesn't feel right, just tell me — I have opinions!`;
  }, [act1Payload]);

  const [chatMessages, setChatMessages] = useState<
    { role: 'ai' | 'user'; text: string }[]
  >(() => [
    {
      role: 'ai',
      text: buildWelcomeMessage(),
    },
  ]);

  // ── Conversation memory ──
  const conversationRef = useRef<ConversationContext>(createConversation());

  // ── Action counter for proactive savings suggestions ──
  const actionCountRef = useRef(0);

  // ── Streaming state ──
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamingComplete, setStreamingComplete] = useState(false);

  // ── What-if preview state ──
  const [whatifActive, setWhatifActive] = useState(false);
  const [whatifData, setWhatifData] = useState<{
    description: string;
    costDelta: number;
    spaceDelta?: string;
    vastuDelta?: string;
    aestheticNote?: string;
  } | null>(null);
  const [whatifAffectedItems, setWhatifAffectedItems] = useState<Set<string>>(
    new Set(),
  );

  // ── Suggestions chips ──
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // ── Cost pulse animation ──
  const [costPulse, setCostPulse] = useState(false);
  const prevItemCount = useRef(items.length);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  useEffect(() => {
    if (items.length !== prevItemCount.current) {
      setCostPulse(true);
      prevItemCount.current = items.length;
      const timeout = setTimeout(() => setCostPulse(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [items.length]);

  // ── Streaming typewriter effect ──
  const displayedStreaming = useTypewriter(
    streamingText ?? '',
    streamingText !== null && !streamingComplete,
    30,
  );

  // When streaming completes, add the message to chat
  useEffect(() => {
    if (streamingComplete && streamingText) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: streamingText },
      ]);
      setStreamingText(null);
      setStreamingComplete(false);
    }
  }, [streamingComplete, streamingText]);

  // ── Determine if a message is a simple command (fast path) ──
  const isSimpleCommand = useCallback((text: string): boolean => {
    const lower = text.toLowerCase().trim();
    const simplePatterns = [
      /\b(add|place|put|include)\b/,
      /\b(remove|delete|take away|get rid of)\b/,
      /\b(move|shift|push|pull|drag|slide)\b/,
      /\b(rotate|turn|flip)\b/,
      /\b(bigger|larger|smaller|compact)\b/,
      /\b(swap|switch|replace)\b.*\b(for|with)\b/,
      /\b(duplicate|clone|copy|another one)\b/,
      /\b(undo|go back|revert)\b/,
      /\b(align|line up|straighten)\b/,
      /\b(cost|price|total|budget|estimate|what's my)\b/,
    ];
    return simplePatterns.some((p) => p.test(lower));
  }, []);

  const handleChatSubmit = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    setChatLoading(true);
    setSuggestions([]);

    // Update conversation history
    const ctx = conversationRef.current;
    ctx.messageHistory.push({ role: 'user', content: text });
    if (ctx.messageHistory.length > 10) ctx.messageHistory.shift();

    actionCountRef.current++;

    // Simple commands go to regex engine for instant response
    if (isSimpleCommand(text)) {
      setTimeout(() => {
        const result: ChatResult = processUserMessage(text, ctx);
        applyChatResult(result);
        checkProactiveSavings();
      }, 250);
      return;
    }

    // Everything else goes to the AI collaborator (Groq)
    setAiThinking(true);
    try {
      const state = useStore.getState();
      const result: ChatResult = await getAICollaboratorResponse(text, {
        items: state.items,
        room: { width: state.room.width, length: state.room.length },
        materials: state.materials,
        budget: act1Payload.context.budget ?? null,
        city: act1Payload.context.city ?? null,
        mustHaves: act1Payload.context.mustHaves,
        desiredFeeling: act1Payload.context.desiredFeeling,
        whoIsThisRoomFor: act1Payload.context.whoIsThisRoomFor,
        lovedItemToKeep: act1Payload.context.lovedItemToKeep,
        vastuContext: act1Payload.context.vastuContext,
        conversationHistory: ctx.messageHistory.slice(-10),
      });

      ctx.messageHistory.push({ role: 'assistant', content: result.message });
      if (ctx.messageHistory.length > 10) ctx.messageHistory.shift();

      applyChatResult(result);
      checkProactiveSavings();
    } catch (err) {
      // Fallback to regex engine on AI failure
      logWarn('PlannerScreen', 'AI collaborator failed, falling back to regex engine', { error: String(err) });
      const result: ChatResult = processUserMessage(text, ctx);
      applyChatResult(result);
    } finally {
      setAiThinking(false);
    }
  }, [chatInput, items, isSimpleCommand, act1Payload]);

  // ── Apply a ChatResult to the UI ──
  const applyChatResult = useCallback((result: ChatResult) => {
    if (result.whatifPreview) {
      setWhatifActive(true);
      setWhatifData(result.whatifPreview);
      setWhatifAffectedItems(new Set(items.map((i) => i.id)));
    }

    if (result.suggestions && result.suggestions.length > 0) {
      setSuggestions(result.suggestions);
    }

    setStreamingText(result.message);
    setStreamingComplete(false);
    setChatLoading(false);

    const streamDuration = (result.message.length / 30) * 1000 + 200;
    setTimeout(() => {
      setStreamingComplete(true);
    }, streamDuration);
  }, [items]);

  // ── Proactive savings every 3-4 actions ──
  const checkProactiveSavings = useCallback(() => {
    if (actionCountRef.current > 0 && actionCountRef.current % 3 === 0) {
      const state = useStore.getState();
      const totalCost = state.items.reduce((sum, i) => sum + i.price, 0);
      if (totalCost > 50000) {
        const tvUnit = state.items.find((i) => i.code.includes('tv'));
        const wardrobe = state.items.find((i) => i.code.includes('wardrobe'));
        let savingsMsg = '';

        if (tvUnit && tvUnit.price > 15000) {
          const saving = Math.round(tvUnit.price * 0.35);
          savingsMsg = `I notice we're at ₹${totalCost.toLocaleString('en-IN')}. I can get this to ₹${(totalCost - saving).toLocaleString('en-IN')} by switching the TV unit to a carpenter build — same look, same finish, ₹${saving.toLocaleString('en-IN')} cheaper. Want to see?`;
        } else if (wardrobe && wardrobe.price > 20000) {
          const saving = Math.round(wardrobe.price * 0.3);
          savingsMsg = `We're at ₹${totalCost.toLocaleString('en-IN')}. Switching the wardrobe to a local carpenter build with laminate finish would save about ₹${saving.toLocaleString('en-IN')} — same storage, same look. Should I explore that?`;
        } else {
          savingsMsg = `We're at ₹${totalCost.toLocaleString('en-IN')}. I can look for ways to trim this without compromising the design — want me to find savings?`;
        }

        if (savingsMsg) {
          setChatMessages((prev) => [
            ...prev,
            { role: 'ai', text: savingsMsg },
          ]);
        }
      }
    }
  }, []);

  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      setChatInput(suggestion);
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { role: 'user', text: suggestion },
        ]);
        setChatInput('');
        setChatLoading(true);
        setSuggestions([]);

        const ctx = conversationRef.current;
        ctx.messageHistory.push({ role: 'user', content: suggestion });
        actionCountRef.current++;

        setTimeout(() => {
          const result: ChatResult = processUserMessage(suggestion, ctx);

          if (result.whatifPreview) {
            setWhatifActive(true);
            setWhatifData(result.whatifPreview);
            setWhatifAffectedItems(new Set(items.map((i) => i.id)));
          }
          if (result.suggestions && result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
          }

          setStreamingText(result.message);
          setStreamingComplete(false);
          setChatLoading(false);

          const streamDuration = (result.message.length / 30) * 1000 + 200;
          setTimeout(() => setStreamingComplete(true), streamDuration);

          checkProactiveSavings();
        }, 300);
      }, 50);
    },
    [items, checkProactiveSavings],
  );

  const handleApplyWhatif = useCallback(() => {
    if (whatifData) {
      const applyMsg = `yes apply ${whatifData.description}`;
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: 'Apply this change' },
      ]);
      setChatLoading(true);

      setTimeout(() => {
        const result: ChatResult = processUserMessage(
          applyMsg,
          conversationRef.current,
        );

        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
        }

        setStreamingText(result.message);
        setStreamingComplete(false);
        setChatLoading(false);

        const streamDuration = (result.message.length / 30) * 1000 + 200;
        setTimeout(() => setStreamingComplete(true), streamDuration);
      }, 300);
    }

    setWhatifActive(false);
    setWhatifData(null);
    setWhatifAffectedItems(new Set());
  }, [whatifData]);

  const handleDismissWhatif = useCallback(() => {
    setWhatifActive(false);
    setWhatifData(null);
    setWhatifAffectedItems(new Set());
    setChatMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text: 'No changes applied. Your room stays as it was. 👍',
      },
    ]);
  }, []);

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeItemId) ?? null,
    [activeItemId, items],
  );
  const mustHaveGaps = useMemo(
    () => resolveMustHaveGaps(act1Payload.context.mustHaves, items),
    [act1Payload.context.mustHaves, items],
  );
  const costSummary = useMemo(
    () => estimateCostSummary(items, act1Payload.context.city),
    [act1Payload.context.city, items],
  );
  const categories = FurnitureFactory.getCategories().filter(
    (c) => c.count > 0,
  );

  // Get sidebar items for quick-add
  const quickAddItems = useMemo(() => {
    let list = [
      ...FurnitureFactory.getByCategory('seating').slice(0, 3),
      ...FurnitureFactory.getByCategory('sleeping').slice(0, 2),
      ...FurnitureFactory.getByCategory('storage').slice(0, 2),
      ...FurnitureFactory.getByCategory('dining').slice(0, 1),
      ...FurnitureFactory.getByCategory('work').slice(0, 1),
      ...FurnitureFactory.getByCategory('pooja').slice(0, 1),
    ];
    if (activeCategory) list = FurnitureFactory.getByCategory(activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [searchQuery, activeCategory]);

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
        background: 'var(--n-50)',
      }}
    >
      {/* ──────────────────────────────────────────── */}
      {/* LEFT: Chat Panel (always visible, primary UI) */}
      {/* ──────────────────────────────────────────── */}
      <div
        style={{
          width: 400,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '1px solid rgba(200,169,110,0.15)',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(200,169,110,0.12)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#F5F0E8',
                  fontFamily: 'var(--f-body)',
                }}
              >
                Nirmit AI Designer
              </div>
              <div style={{ fontSize: 11, color: 'rgba(200,169,110,0.7)' }}>
                {act1Payload.vibeConfig?.name ?? 'Room'} • {act1Payload.context.city}
              </div>
            </div>
          </div>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              borderRadius: 9999,
              padding: '6px 14px',
              fontSize: 12,
              fontFamily: 'var(--f-body)',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>

        {/* Chat messages */}
        <div
          style={{
            flex: 1,
            padding: '16px 16px 8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex',
                gap: 10,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {msg.role === 'ai' && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={14} />
                </div>
              )}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 16,
                  background:
                    msg.role === 'user'
                      ? 'var(--brand)'
                      : 'rgba(255,255,255,0.06)',
                  color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.9)',
                  border:
                    msg.role === 'ai'
                      ? '1px solid rgba(200,169,110,0.15)'
                      : 'none',
                  borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                  borderTopLeftRadius: msg.role === 'ai' ? 4 : 16,
                  whiteSpace: 'pre-wrap',
                  maxWidth: 300,
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: 'var(--f-body)',
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          {streamingText !== null && !streamingComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 10 }}
            >
              <div
                className="avatar-thinking"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(200,169,110,0.2)',
                  borderTopLeftRadius: 4,
                  whiteSpace: 'pre-wrap',
                  maxWidth: 300,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.55,
                  fontFamily: 'var(--f-body)',
                }}
              >
                {displayedStreaming}
                <span className="streaming-cursor" />
              </div>
            </motion.div>
          )}

          {/* AI thinking indicator */}
          {aiThinking && streamingText === null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 10 }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} />
              </div>
              <div
                style={{
                  padding: '12px 20px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(200,169,110,0.1)',
                  borderTopLeftRadius: 4,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.4)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--f-body)',
                }}
              >
                Thinking...
              </div>
            </motion.div>
          )}

          {/* Typing indicator (regex engine) */}
          {chatLoading && streamingText === null && !aiThinking && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} />
              </div>
              <div
                style={{
                  padding: '12px 20px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(200,169,110,0.1)',
                  borderTopLeftRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions chips */}
        {suggestions.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(0,0,0,0.2)',
              borderTop: '1px solid rgba(200,169,110,0.1)',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionTap(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  border: '1px solid rgba(200,169,110,0.4)',
                  background: 'rgba(200,169,110,0.1)',
                  color: '#C8A96E',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--f-body)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#C8A96E';
                  e.currentTarget.style.color = '#1a1a2e';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(200,169,110,0.1)';
                  e.currentTarget.style.color = '#C8A96E';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat input */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(200,169,110,0.12)',
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChatSubmit();
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tell me how you'd like to adjust it..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 9999,
                padding: '10px 18px',
                fontSize: 13,
                border: '1px solid rgba(200,169,110,0.2)',
                outline: 'none',
                fontFamily: 'var(--f-body)',
                color: '#F5F0E8',
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: chatInput.trim()
                  ? 'linear-gradient(135deg, #C8A96E, #A67C52)'
                  : 'rgba(255,255,255,0.06)',
                color: chatInput.trim() ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                flexShrink: 0,
                cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* RIGHT: 3D/2D Canvas + Bottom Controls        */}
      {/* ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--n-50)',
        }}
      >
        {/* Canvas toolbar */}
        <div
          style={{
            padding: '8px 20px',
            borderBottom: '1px solid var(--n-200)',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Room shape toggle */}
          <div
            style={{ display: 'flex', gap: 4, alignItems: 'center' }}
          >
            {(['rectangle', 'l-shape'] as const).map((shape) => (
              <button
                key={shape}
                type="button"
                onClick={() => setRoomConfig({ shape })}
                style={{
                  padding: '5px 12px',
                  borderRadius: 9999,
                  border:
                    room.shape === shape
                      ? '1px solid var(--brand)'
                      : '1px solid var(--n-200)',
                  background: room.shape === shape ? 'var(--brand)' : 'white',
                  color: room.shape === shape ? '#fff' : 'var(--n-600)',
                  fontSize: 11,
                  fontFamily: 'var(--f-body)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {shape === 'rectangle' ? 'Rectangle' : 'L-Shape'}
              </button>
            ))}
          </div>

          {/* Room dimensions */}
          <div
            style={{
              fontSize: 12,
              color: 'var(--n-500)',
              fontFamily: 'var(--f-body)',
            }}
          >
            {room.width}ft × {room.length}ft
          </div>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <input
              type="number"
              min={6}
              max={20}
              step={0.5}
              value={room.width}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v)) setRoomConfig({ width: v });
              }}
              style={{
                width: 58,
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid var(--n-200)',
                borderRadius: 6,
                textAlign: 'center',
                fontFamily: 'var(--f-body)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--n-400)', alignSelf: 'center' }}>
              ×
            </span>
            <input
              type="number"
              min={6}
              max={20}
              step={0.5}
              value={room.length}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v)) setRoomConfig({ length: v });
              }}
              style={{
                width: 58,
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid var(--n-200)',
                borderRadius: 6,
                textAlign: 'center',
                fontFamily: 'var(--f-body)',
              }}
            />
          </div>
        </div>

        {/* Main canvas */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {/* Must-have gaps badge */}
          {mustHaveGaps.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                background: 'white',
                border: '1px solid var(--n-200)',
                boxShadow: 'var(--sh-md)',
                padding: '6px 16px',
                borderRadius: 9999,
                fontFamily: 'var(--f-body)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--brand)',
              }}
            >
              Must-have coverage: {mustHaveGaps.length} missing
            </div>
          )}

          {/* What-if preview overlay */}
          <AnimatePresence>
            {whatifActive && whatifData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 40,
                  background: 'rgba(30,30,50,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '2px dashed #C8A96E',
                  borderRadius: 16,
                  padding: '16px 24px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minWidth: 340,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#C8A96E" />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: '#C8A96E',
                      fontFamily: 'var(--f-body)',
                    }}
                  >
                    What-if Preview
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  {whatifData.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                  <span>
                    💰 Cost:{' '}
                    {whatifData.costDelta > 0
                      ? `+${formatINR(whatifData.costDelta)}`
                      : whatifData.costDelta < 0
                        ? `-${formatINR(Math.abs(whatifData.costDelta))}`
                        : 'No change'}
                  </span>
                  {whatifData.spaceDelta && <span>📐 {whatifData.spaceDelta}</span>}
                  {whatifData.vastuDelta && <span>🕉️ {whatifData.vastuDelta}</span>}
                  {whatifData.aestheticNote && <span>🎨 {whatifData.aestheticNote}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleApplyWhatif}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 9999,
                      border: 'none',
                      background: 'linear-gradient(135deg, #C8A96E, #A67C52)',
                      color: '#1a1a2e',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontFamily: 'var(--f-body)',
                    }}
                  >
                    <Check size={16} />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissWhatif}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontFamily: 'var(--f-body)',
                    }}
                  >
                    <X size={16} />
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2D / 3D canvas */}
          {viewMode === '2D' ? (
            <Planner2D captureId="planner-2d-capture" />
          ) : (
            <Viewer3D
              inactive={viewMode !== '3D'}
              whatifGlowIds={whatifActive ? whatifAffectedItems : undefined}
            />
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            padding: '8px 20px',
            borderTop: '1px solid var(--n-200)',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {/* 2D/3D toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--n-100)',
              border: '1px solid var(--n-200)',
              borderRadius: 9999,
              padding: 3,
              gap: 2,
              position: 'relative',
            }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: viewMode === '2D' ? 3 : 'calc(50% + 1px)',
                width: 'calc(50% - 4px)',
                background: 'var(--brand)',
                borderRadius: 9999,
                boxShadow: 'var(--sh-sm)',
              }}
            />
            {(['2D', '3D'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 20px',
                  borderRadius: 9999,
                  border: 'none',
                  fontFamily: 'var(--f-body)',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'color 240ms cubic-bezier(0.16,1,0.3,1)',
                  background: 'transparent',
                  color: viewMode === mode ? '#fff' : 'var(--n-500)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Quick-add furniture chips (compact, visible but secondary to chat) */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              overflowX: 'auto',
              maxWidth: '50%',
            }}
          >
            {quickAddItems.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => {
                  addItem(
                    buildDraftFromCatalog(item, {
                      x: room.width / 2,
                      y: room.length / 2,
                    }),
                  );
                  trackEvent('furniture', 'add', item.label);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: getCategoryBg(item.category),
                  border: '1px solid var(--n-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = 'var(--sh-sm)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {getCategoryIcon(item.category, 'var(--brand)')}
              </button>
            ))}
          </div>

          {/* Confirm layout button */}
          <button
            type="button"
            onClick={() => {
              trackEvent('journey', 'complete', 'planner_confirm', items.length);
              onContinue();
            }}
            disabled={items.length === 0}
            style={{
              padding: '10px 24px',
              borderRadius: 9999,
              border: 'none',
              background: items.length === 0
                ? 'var(--n-200)'
                : 'linear-gradient(135deg, #C8A96E, #A67C52)',
              color: items.length === 0 ? 'var(--n-400)' : '#1a1a2e',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--f-body)',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Confirm Layout
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* RIGHT SIDEBAR: Cost & Advisories              */}
      {/* ──────────────────────────────────────────── */}
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto',
          borderLeft: '1px solid var(--n-200)',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Running Estimate */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}>
          <div
            style={{
              fontSize: '0.625rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--n-400)',
              marginBottom: 4,
            }}
          >
            Running Estimate
          </div>
          <motion.div
            style={{
              fontFamily: 'var(--f-display)',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: 'var(--brand)',
              lineHeight: 1,
            }}
            animate={costPulse ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            ₹{formatINR(costSummary.totalLow)} – ₹{formatINR(costSummary.totalHigh)}
          </motion.div>
          <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>
            {items.length} items · {act1Payload.context.city} rates
          </div>
          <div
            style={{ height: 3, background: 'var(--n-100)', borderRadius: 2, marginTop: 8 }}
          >
            <div
              style={{
                height: '100%',
                width: Math.min(20 + items.length * 8, 85) + '%',
                background: 'var(--brand)',
                borderRadius: 2,
                transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>
        </div>

        {/* Selected item controls */}
        {activeItem && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--n-200)',
              background: 'var(--n-50)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--n-400)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Selected
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 8 }}>
              {activeItem.name}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => rotateItem(activeItem.id, 90)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 9999,
                  border: '1px solid var(--n-300)',
                  background: 'white',
                  fontSize: 12,
                  color: 'var(--brand)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontFamily: 'var(--f-body)',
                }}
              >
                ↻ Rotate
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent('furniture', 'remove', activeItem.name);
                  removeItem(activeItem.id);
                  setActiveItem(null);
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 9999,
                  border: '1px solid var(--clash-border)',
                  background: 'var(--clash-bg)',
                  fontSize: 12,
                  color: 'var(--clash-label)',
                  cursor: 'pointer',
                  fontFamily: 'var(--f-body)',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Advisories */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {advisories.spatial.map((msg, i) => {
            const isPositive =
              msg.toLowerCase().includes('clear') ||
              msg.toLowerCase().includes('healthy');
            return (
              <div
                key={`s${i}`}
                style={{
                  padding: 14,
                  background: isPositive ? 'var(--ok-bg)' : 'var(--clash-bg)',
                  border: `1px solid ${isPositive ? 'var(--ok-border)' : 'var(--clash-border)'}`,
                  borderRadius: 12,
                  cursor: 'default',
                  transition: 'transform 200ms',
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: isPositive ? 'var(--ok-label)' : 'var(--clash-label)', flexShrink: 0 }}>
                    {isPositive ? '✓' : '⊘'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: isPositive ? 'var(--ok-text)' : 'var(--clash-text)', lineHeight: 1.4 }}>
                    {isPositive ? 'Layout check' : 'Space constraint'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: isPositive ? 'var(--ok-text)' : 'var(--clash-text)', opacity: 0.85, lineHeight: 1.55, margin: 0 }}>
                  {msg}
                </p>
              </div>
            );
          })}
          {advisories.vastu
            .filter((msg) => !suppressedVastu.has(msg))
            .map((msg, i) => (
              <div
                key={`v${i}`}
                style={{
                  padding: 14,
                  background: 'var(--vastu-bg)',
                  border: '1px solid var(--vastu-border)',
                  borderRadius: 12,
                  cursor: 'default',
                  transition: 'transform 200ms',
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--vastu-label)', flexShrink: 0 }}>◐</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--vastu-text)', lineHeight: 1.4 }}>
                    Vastu advisory
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--vastu-text)', opacity: 0.85, lineHeight: 1.55, marginBottom: 10, marginTop: 0 }}>
                  {msg}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1px solid var(--vastu-border)',
                      background: 'transparent',
                      color: 'var(--vastu-label)',
                      cursor: 'pointer',
                      fontFamily: 'var(--f-body)',
                    }}
                  >
                    Move it
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuppressedVastu((prev) => new Set([...prev, msg]))}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1px solid var(--vastu-border)',
                      background: 'transparent',
                      color: 'var(--vastu-label)',
                      cursor: 'pointer',
                      fontFamily: 'var(--f-body)',
                    }}
                  >
                    Keep here
                  </button>
                </div>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}