import { ScryfallCard } from '@/types/mtg';

const BASE = 'https://api.scryfall.com';

let lastRequest = 0;

async function throttledFetch(url: string): Promise<Response> {
  const gap = Date.now() - lastRequest;
  if (gap < 100) await new Promise(r => setTimeout(r, 100 - gap));
  lastRequest = Date.now();
  return fetch(url);
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

export function getCardImage(card: ScryfallCard, size = 'normal'): string | null {
  const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  if (!uris) return null;
  return (uris as unknown as Record<string, string>)[size] ?? null;
}

export function isBasicLand(card: ScryfallCard): boolean {
  return /\bBasic\b/.test(card.type_line);
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
