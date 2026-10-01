import { ScryfallCard, ScryfallSet } from '@/types/mtg';

const BASE = 'https://api.scryfall.com';

let lastRequest = 0;

/** Scryfall rejects generic HTTP-library User-Agents; identify ourselves server-side. */
function scryfallHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { 'User-Agent': 'MTG-Commander-Deck-Builder/1.0 (https://github.com/ABerger94/MTG-Commander-Deck-Builder)' };
  }
  return {};
}

async function throttledFetch(url: string): Promise<Response> {
  const gap = Date.now() - lastRequest;
  if (gap < 100) await new Promise(r => setTimeout(r, 100 - gap));
  lastRequest = Date.now();
  return fetch(url, { headers: scryfallHeaders() });
}

/**
 * encodeURIComponent leaves ' ( ) ! ~ * unescaped, and Scryfall's
 * /cards/named endpoint 400s on a raw apostrophe (e.g. "Atraxa, Praetors' Voice").
 */
export function scryfallEncode(s: string): string {
  return encodeURIComponent(s).replace(/'/g, '%27');
}

export async function searchCards(query: string, colorIdentity?: string[]): Promise<ScryfallCard[]> {
  if (!query.trim()) return [];

  let q = query + ' f:commander -t:conspiracy -t:attraction';

  if (colorIdentity !== undefined) {
    if (colorIdentity.length > 0) {
      q += ` id<=${colorIdentity.join('')}`;
    } else {
      q += ' c:colorless';
    }
  }

  try {
    const res = await throttledFetch(`${BASE}/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as ScryfallCard[];
  } catch {
    return [];
  }
}

export async function searchCommanders(query: string): Promise<ScryfallCard[]> {
  if (!query.trim()) return [];
  try {
    const res = await throttledFetch(
      `${BASE}/cards/search?q=${encodeURIComponent(query + ' is:commander')}&order=name&unique=cards`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as ScryfallCard[];
  } catch {
    return [];
  }
}

/** Exact-name lookup, used by the decklist importer. Returns null when not found. */
export async function fetchCardByExactName(name: string): Promise<ScryfallCard | null> {
  if (!name.trim()) return null;
  try {
    const res = await throttledFetch(`${BASE}/cards/named?exact=${scryfallEncode(name.trim())}`);
    if (!res.ok) return null;
    return (await res.json()) as ScryfallCard;
  } catch {
    return null;
  }
}

export function getCardImage(card: ScryfallCard, size = 'normal'): string | null {
  const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  if (!uris) return null;
  return (uris as unknown as Record<string, string>)[size] ?? null;
}

export function isBasicLand(card: ScryfallCard): boolean {
  return /\bBasic\b/.test(card.type_line);
}

/** True when every color in the card's color identity is also in the commander's. */
export function isWithinColorIdentity(card: ScryfallCard, commander: ScryfallCard | null): boolean {
  if (!commander) return true;
  const identity = new Set(commander.color_identity);
  return card.color_identity.every(c => identity.has(c));
}

export function getManaCost(card: ScryfallCard): string {
  return card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? '';
}

export function getCardType(typeLine: string): string {
  if (typeLine.includes('Creature')) return 'Creatures';
  if (typeLine.includes('Planeswalker')) return 'Planeswalkers';
  if (typeLine.includes('Instant')) return 'Instants';
  if (typeLine.includes('Sorcery')) return 'Sorceries';
  if (typeLine.includes('Enchantment')) return 'Enchantments';
  if (typeLine.includes('Artifact')) return 'Artifacts';
  if (typeLine.includes('Land')) return 'Lands';
  return 'Other';
}

export const TYPE_ORDER = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Lands', 'Other'];

export const COLOR_NAMES: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
};

/** Fetch every Scryfall set, newest first. */
export async function fetchSets(): Promise<ScryfallSet[]> {
  try {
    const res = await throttledFetch(`${BASE}/sets`);
    if (!res.ok) return [];
    const data = await res.json();
    const sets = (data.data ?? []) as ScryfallSet[];
    return sets.sort((a, b) => (b.released_at ?? '').localeCompare(a.released_at ?? ''));
  } catch {
    return [];
  }
}

/** Fetch a random legal commander — for discovering new commanders to build around. */
export async function fetchRandomCommander(): Promise<ScryfallCard | null> {
  try {
    const res = await throttledFetch(`${BASE}/cards/random?q=${encodeURIComponent('is:commander legal:commander')}`);
    if (!res.ok) return null;
    return (await res.json()) as ScryfallCard;
  } catch {
    return null;
  }
}

/** Search cards, optionally restricted to a set code (e.g. "dmu"). */
export async function searchCardsInSet(query: string, setCode?: string): Promise<ScryfallCard[]> {
  const q = query.trim();
  if (!q && !setCode) return [];
  const search = setCode ? `${q ? q + ' ' : ''}e:${setCode}` : q;
  try {
    const res = await throttledFetch(`${BASE}/cards/search?q=${encodeURIComponent(search)}&order=name&unique=cards`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as ScryfallCard[];
  } catch {
    return [];
  }
}
