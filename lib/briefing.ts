/**
 * AI Deck Briefing engine (server-only).
 *
 * Pipeline, adapted from the Commander Deck Assistant design:
 *   1. Resolve commander (+partner) via Scryfall.
 *   2. Ask Gemini for a structured briefing (game plan, pillars, categorized
 *      suggestions, win lines) as strict JSON.
 *   3. Ground every suggested card name against Scryfall: exact match passes,
 *      near-miss typos are autocorrected via fuzzy lookup, misses are flagged
 *      unverified, and anything outside the commander's color identity is dropped.
 *   4. Attach Scryfall images + USD prices + TCGPlayer links.
 */

import {
  Briefing,
  BriefingSuggestions,
  CardSuggestion,
  ScryfallCard,
  WinLine,
} from '@/types/mtg';
import { fetchCardByExactName, scryfallEncode } from './scryfall';

const SCRYFALL = 'https://api.scryfall.com';
const GEMINI_MODEL = 'gemini-2.5-flash';

/** Scryfall rejects generic HTTP-library User-Agents (this module runs server-side). */
const SCRYFALL_HEADERS = {
  'User-Agent': 'MTG-Commander-Deck-Builder/1.0 (https://github.com/ABerger94/MTG-Commander-Deck-Builder)',
  'Content-Type': 'application/json',
};

/** Extract probable card names from pasted decklist text (one per line). */
export function parseDecklistNames(text: string): string[] {
  const names: string[] = [];
  for (const rawLine of (text ?? '').split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;
    // Strip leading quantities: "1 Sol Ring", "1x Sol Ring", "4xSol Ring"
    const qtyMatch = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (qtyMatch) line = qtyMatch[2].trim();
    // Skip sideboard / section headers
    if (/^(sideboard|maybeboard|commander|companion)\s*:?\s*$/i.test(line)) continue;
    if (/^\/\//.test(line)) continue;
    names.push(line);
  }
  return names;
}

function colorIdentityText(identity: string[]): string {
  if (identity.length === 0) return 'colorless';
  const names: Record<string, string> = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' };
  return identity.map(c => names[c] ?? c).join(', ');
}

const TAXONOMY_HINT = `MTG card taxonomy for categorization:
- Ramp: mana rocks (Sol Ring, Arcane Signet), land ramp (Cultivate, Nature's Lore), rituals, cost reducers, dorks.
- Draw: card draw engines (Rhystic Study, Mystic Remora), cantrips, wheel effects, looting.
- Removal: targeted removal (Swords to Plowshares, Beast Within), board wipes (Blasphemous Act, Farewell), counterspells, graveyard hate.
- Wincons: combo pieces, finishers (Craterhoof Behemoth, Torment of Hailfire), alt-win cards, infinite mana outlets.
- Synergies: cards that directly amplify the commander's mechanics or the deck's pillars.
- Creatures: high-value creatures fitting the plan (value engines, recursion, protection).
- ManaBase: lands, fetchlands, duals, utility lands fitting the color identity.
- Upgrades: cards in the provided decklist that should be CUT, with a better replacement named in the rationale.
- CardsToConsider: niche, meta, or spicy picks worth knowing about.`;

export const SYSTEM_PROMPT: string = `You are an expert Magic: The Gathering Commander (EDH) deckbuilding coach. You know the full MTG card pool through recent sets. You give practical, specific advice: real card names, why each card earns its slot, and how the deck actually wins games.

STRICT RULES:
- Every card you name MUST be a real, printed Magic: The Gathering card.
- Every suggested card MUST be legal in the Commander format.
- Every suggested card's color identity MUST fit within the commander's color identity given (colorless cards are always fine). NEVER suggest an off-color card.
- Do NOT suggest cards already in the provided decklist, except in "upgrades" (where you name a cut and its replacement).
- Do NOT suggest the commander itself (or partner) as a suggestion.
- Prefer well-known staples and proven EDH cards over obscure picks; flag spicy picks in cardsToConsider.
- Respond with ONLY the JSON object described by the schema. No markdown, no commentary.`;

export interface BriefingRequest {
  commanderName: string;
  partnerName?: string;
  decklistText?: string;
  notes?: string;
}

export interface ResolvedCommander {
  card: ScryfallCard;
  partner: ScryfallCard | null;
  colorIdentity: string[];
  decklistNames: string[];
}

/** Resolve commander/partner/decklist before prompting. Throws on unresolvable commander. */
export async function resolveBriefingInput(req: BriefingRequest): Promise<ResolvedCommander> {
  const card = await fetchCardByExactName(req.commanderName);
  if (!card) throw new Error(`Could not find a card named "${req.commanderName}".`);
  let partner: ScryfallCard | null = null;
  if (req.partnerName?.trim()) {
    partner = await fetchCardByExactName(req.partnerName);
    if (!partner) throw new Error(`Could not find a card named "${req.partnerName}".`);
  }
  const identity = Array.from(new Set([...card.color_identity, ...(partner?.color_identity ?? [])]));
  const decklistNames = parseDecklistNames(req.decklistText ?? '').slice(0, 99);
  return { card, partner, colorIdentity: identity, decklistNames };
}

function cardContextLine(card: ScryfallCard): string {
  const oracle = (card.oracle_text ?? card.card_faces?.map(f => f.oracle_text).join(' // ') ?? '').slice(0, 600);
  return `- ${card.name} ${card.mana_cost ?? ''} — ${card.type_line}. ${oracle}`;
}

export function buildBriefingPrompt(resolved: ResolvedCommander, notes?: string): string {
  const { card, partner, colorIdentity, decklistNames } = resolved;
  const lines = [
    `Commander:`,
    cardContextLine(card),
  ];
  if (partner) {
    lines.push(`Partner:`, cardContextLine(partner));
  }
  lines.push(
    ``,
    `Color identity: ${colorIdentityText(colorIdentity)} (${colorIdentity.length ? colorIdentity.join('') : 'C'}).`,
    ``,
    TAXONOMY_HINT,
    ``,
  );
  if (decklistNames.length > 0) {
    lines.push(`Existing decklist (${decklistNames.length} cards) — build around these, suggest upgrades as cuts with replacements:`);
    for (const n of decklistNames.slice(0, 60)) lines.push(`- ${n}`);
    if (decklistNames.length > 60) lines.push(`- ... and ${decklistNames.length - 60} more`);
    lines.push(``);
  } else {
    lines.push(`No decklist provided — this is a from-scratch brew. Suggest the full core of the deck.`, ``);
  }
  if (notes?.trim()) {
    lines.push(`Player notes (budget, power level, themes, combos to avoid): ${notes.trim().slice(0, 500)}`, ``);
  }
  lines.push(
    `Write the briefing now. Guidance on counts: ramp 6-10, draw 6-10, removal 6-10, wincons 4-8, synergies 6-10, creatures 10-16, manaBase 8-14, upgrades 3-6 (only if a decklist was given, else empty), cardsToConsider 4-8, winconStrategies 2-4.`,
    `deckRatios are target percentages of the final 100 that sum to roughly 100.`,
    `Each suggestion needs: name (exact card name), role (e.g. "Early ramp", "Board wipe"), rationale (1-2 sentences, concrete), pillar (which mechanical pillar it serves, or "Core need").`,
    `Each winconStrategy needs: title, explanation, steps (ordered, 2-8), keyCards (card names with one-line roles).`
  );
  return lines.join('\n');
}

/* ---------- Gemini structured call ---------- */

function suggestionSchema() {
  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      role: { type: 'string' },
      rationale: { type: 'string' },
      pillar: { type: 'string' },
    },
    required: ['name', 'role', 'rationale', 'pillar'],
  };
}

export const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    deckPlan: {
      type: 'object',
      properties: {
        primaryGamePlan: { type: 'string' },
        mechanicalPillars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              explanation: { type: 'string' },
              expansionCards: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'explanation', 'expansionCards'],
          },
        },
        themesToAvoid: { type: 'array', items: { type: 'string' } },
        deckRatios: {
          type: 'object',
          properties: {
            creatures: { type: 'number' },
            spells: { type: 'number' },
            manaBase: { type: 'number' },
            interaction: { type: 'number' },
            cardAdvantage: { type: 'number' },
          },
          required: ['creatures', 'spells', 'manaBase', 'interaction', 'cardAdvantage'],
        },
      },
      required: ['primaryGamePlan', 'mechanicalPillars', 'themesToAvoid', 'deckRatios'],
    },
    suggestions: {
      type: 'object',
      properties: {
        ramp: { type: 'array', items: suggestionSchema() },
        draw: { type: 'array', items: suggestionSchema() },
        removal: { type: 'array', items: suggestionSchema() },
        wincons: { type: 'array', items: suggestionSchema() },
        synergies: { type: 'array', items: suggestionSchema() },
        creatures: { type: 'array', items: suggestionSchema() },
        manaBase: { type: 'array', items: suggestionSchema() },
        upgrades: { type: 'array', items: suggestionSchema() },
        cardsToConsider: { type: 'array', items: suggestionSchema() },
      },
      required: ['ramp', 'draw', 'removal', 'wincons', 'synergies', 'creatures', 'manaBase', 'upgrades', 'cardsToConsider'],
    },
    winconStrategies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          keyCards: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, role: { type: 'string' } },
              required: ['name', 'role'],
            },
          },
        },
        required: ['title', 'explanation', 'steps', 'keyCards'],
      },
    },
    considerationsAndCautions: { type: 'string' },
  },
  required: ['deckPlan', 'suggestions', 'winconStrategies', 'considerationsAndCautions'],
};

interface RawSuggestion { name: string; role: string; rationale: string; pillar: string; }
interface RawWinLine { title: string; explanation: string; steps: string[]; keyCards: { name: string; role: string }[]; }
interface RawBriefing {
  deckPlan: Briefing['deckPlan'];
  suggestions: Record<keyof BriefingSuggestions, RawSuggestion[]>;
  winconStrategies: RawWinLine[];
  considerationsAndCautions: string;
}

export async function callGeminiBriefing(apiKey: string, prompt: string): Promise<RawBriefing> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: BRIEFING_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content.');
  return JSON.parse(text) as RawBriefing;
}

/* ---------- Scryfall grounding ---------- */

function imageUris(card: ScryfallCard): { small: string | null; normal: string | null } {
  const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return { small: uris?.small ?? null, normal: uris?.normal ?? null };
}

async function fetchFuzzy(name: string): Promise<ScryfallCard | null> {
  try {
    const res = await fetch(`${SCRYFALL}/cards/named?fuzzy=${scryfallEncode(name.trim())}`, {
      headers: { 'User-Agent': SCRYFALL_HEADERS['User-Agent'] },
    });
    if (!res.ok) return null;
    return (await res.json()) as ScryfallCard;
  } catch {
    return null;
  }
}

/**
 * Verify every suggested name against Scryfall, autocorrect near-misses,
 * drop off-color cards, and attach images/prices.
 */
export async function verifyAndEnrichBriefing(
  raw: RawBriefing,
  resolved: ResolvedCommander,
  req: BriefingRequest
): Promise<Briefing> {
  const identity = new Set(resolved.colorIdentity);
  const commanderNames = new Set(
    [resolved.card.name, resolved.partner?.name].filter(Boolean).map(n => (n as string).toLowerCase())
  );
  const deckNames = new Set(resolved.decklistNames.map(n => n.toLowerCase()));

  // Collect every unique name needing verification (suggestions + win-line key cards)
  const wanted = new Map<string, { key: keyof BriefingSuggestions | 'winline'; }>();
  const categories = Object.keys(raw.suggestions ?? {}) as (keyof BriefingSuggestions)[];
  for (const cat of categories) {
    for (const s of raw.suggestions[cat] ?? []) {
      const k = s.name.trim().toLowerCase();
      if (k && !wanted.has(k)) wanted.set(k, { key: cat });
    }
  }
  for (const w of raw.winconStrategies ?? []) {
    for (const kc of w.keyCards ?? []) {
      const k = kc.name.trim().toLowerCase();
      if (k && !wanted.has(k)) wanted.set(k, { key: 'winline' });
    }
  }

  // Batch exact lookups via /cards/collection (max 75 identifiers)
  const names = Array.from(wanted.keys());
  const found = new Map<string, ScryfallCard>();
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    try {
      const res = await fetch(`${SCRYFALL}/cards/collection`, {
        method: 'POST',
        headers: SCRYFALL_HEADERS,
        body: JSON.stringify({ identifiers: chunk.map(name => ({ name })) }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const c of (data.data ?? []) as ScryfallCard[]) {
        found.set(c.name.toLowerCase(), c);
      }
    } catch {
      /* keep going; misses handled below */
    }
    // Scryfall etiquette: small pause between batch calls
    await new Promise(r => setTimeout(r, 120));
  }

  // Resolve each wanted name: exact hit -> fuzzy autocorrect -> unverified
  const resolvedCards = new Map<string, { card: ScryfallCard | null; correctedFrom?: string }>();
  for (const key of names) {
    const exact = found.get(key);
    if (exact) {
      resolvedCards.set(key, { card: exact });
      continue;
    }
    const fuzzy = await fetchFuzzy(key);
    if (fuzzy) {
      resolvedCards.set(key, { card: fuzzy, correctedFrom: key });
    } else {
      resolvedCards.set(key, { card: null });
    }
    await new Promise(r => setTimeout(r, 60));
  }

  const withinIdentity = (card: ScryfallCard) =>
    card.color_identity.every(c => identity.has(c));
  const isCommanderLegal = (card: ScryfallCard) =>
    card.legalities?.commander === 'legal';

  function enrichSuggestion(rawS: RawSuggestion): CardSuggestion | null {
    const key = rawS.name.trim().toLowerCase();
    const hit = resolvedCards.get(key);
    const card = hit?.card ?? null;
    if (!card) {
      // Unverified: keep the name flagged so the UI can warn, no image/price.
      return {
        name: rawS.name.trim(), role: rawS.role, rationale: rawS.rationale, pillar: rawS.pillar,
        imageSmall: null, imageNormal: null, verified: false,
        tcgplayerId: null, scryfallUsd: null,
      };
    }
    if (!withinIdentity(card) || commanderNames.has(card.name.toLowerCase())) return null;
    const imgs = imageUris(card);
    return {
      name: card.name,
      role: rawS.role,
      rationale: rawS.rationale,
      pillar: rawS.pillar,
      imageSmall: imgs.small,
      imageNormal: imgs.normal,
      verified: true,
      correctedFrom: hit?.correctedFrom && hit.correctedFrom !== card.name.toLowerCase()
        ? rawS.name.trim() : undefined,
      tcgplayerId: (card as unknown as { tcgplayer_id?: number }).tcgplayer_id ?? null,
      scryfallUsd: card.prices?.usd ?? null,
      scryfallUri: (card as unknown as { scryfall_uri?: string }).scryfall_uri,
    };
  }

  const suggestions = {} as BriefingSuggestions;
  for (const cat of categories) {
    const out: CardSuggestion[] = [];
    for (const s of raw.suggestions[cat] ?? []) {
      // Skip cards already in the provided decklist (except upgrades, which are cuts)
      if (cat !== 'upgrades' && deckNames.has(s.name.trim().toLowerCase())) continue;
      const enriched = enrichSuggestion(s);
      if (enriched) out.push(enriched);
    }
    suggestions[cat] = out;
  }

  const winconStrategies: WinLine[] = (raw.winconStrategies ?? []).map(w => ({
    title: w.title,
    explanation: w.explanation,
    steps: w.steps ?? [],
    keyCards: (w.keyCards ?? []).map(kc => {
      const key = kc.name.trim().toLowerCase();
      const hit = resolvedCards.get(key);
      const card = hit?.card ?? null;
      const imgs = card ? imageUris(card) : { small: null, normal: null };
      return {
        name: card?.name ?? kc.name.trim(),
        role: kc.role,
        rationale: '',
        pillar: '',
        imageSmall: imgs.small,
        imageNormal: imgs.normal,
        verified: !!card && isCommanderLegal(card),
        tcgplayerId: card ? ((card as unknown as { tcgplayer_id?: number }).tcgplayer_id ?? null) : null,
        scryfallUsd: card?.prices?.usd ?? null,
        scryfallUri: card ? (card as unknown as { scryfall_uri?: string }).scryfall_uri : undefined,
      } as CardSuggestion;
    }),
  }));

  return {
    commanderName: resolved.card.name,
    partnerName: resolved.partner?.name ?? null,
    notes: req.notes?.trim() || undefined,
    deckPlan: raw.deckPlan,
    suggestions,
    winconStrategies,
    considerationsAndCautions: raw.considerationsAndCautions,
    generatedAt: Date.now(),
  };
}
