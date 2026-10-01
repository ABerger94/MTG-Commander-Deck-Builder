import { ScryfallCard, DeckCard } from '@/types/mtg';
import { isBasicLand, isWithinColorIdentity } from './scryfall';

export interface LegalityCheck {
  id: 'count' | 'singleton' | 'color' | 'banned';
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Full Commander legality check for the current deck state.
 * - exactly 100 cards including commander
 * - singleton (basic lands exempt)
 * - every card within the commander's color identity
 * - nothing banned in Commander
 */
export function checkDeck(commander: ScryfallCard | null, cards: DeckCard[]): LegalityCheck[] {
  const total = (commander ? 1 : 0) + cards.reduce((s, dc) => s + dc.quantity, 0);

  const dupes = cards.filter(dc => dc.quantity > 1 && !isBasicLand(dc.card));
  const offColor = commander ? cards.filter(dc => !isWithinColorIdentity(dc.card, commander)) : [];
  const banned: DeckCard[] = [];
  if (commander && commander.legalities.commander === 'banned') {
    banned.push({ card: commander, quantity: 1 });
  }
  for (const dc of cards) {
    if (dc.card.legalities.commander === 'banned') banned.push(dc);
  }

  return [
    {
      id: 'count',
      label: '100 cards',
      ok: total === 100,
      detail: total === 100 ? 'Deck is complete' : `${total}/100 cards`,
    },
    {
      id: 'singleton',
      label: 'Singleton',
      ok: dupes.length === 0,
      detail: dupes.length === 0
        ? 'No duplicates'
        : `${dupes.length} duplicate${dupes.length === 1 ? '' : 's'}: ${dupes.slice(0, 3).map(d => d.card.name).join(', ')}${dupes.length > 3 ? '…' : ''}`,
    },
    {
      id: 'color',
      label: 'Color identity',
      ok: offColor.length === 0,
      detail: !commander
        ? 'Set a commander first'
        : offColor.length === 0
          ? 'All cards match'
          : `${offColor.length} off-identity: ${offColor.slice(0, 3).map(d => d.card.name).join(', ')}${offColor.length > 3 ? '…' : ''}`,
    },
    {
      id: 'banned',
      label: 'No banned cards',
      ok: banned.length === 0,
      detail: banned.length === 0
        ? 'Clean'
        : `Banned: ${banned.slice(0, 3).map(d => d.card.name).join(', ')}${banned.length > 3 ? '…' : ''}`,
    },
  ];
}

/**
 * Validate adding a single card. Returns null when the add is fine,
 * otherwise a short human-readable reason (shown inline by the UI).
 */
export function validateAdd(
  card: ScryfallCard,
  deck: Map<string, DeckCard>,
  commander: ScryfallCard | null,
  totalCards: number,
): string | null {
  if (card.id === commander?.id) return 'Already your commander';
  if (totalCards >= 100) return 'Deck is full (100 cards)';
  if (card.legalities.commander === 'banned') return 'Banned in Commander';
  if (commander && !isWithinColorIdentity(card, commander)) {
    return `Outside ${commander.name}'s color identity`;
  }
  const existing = deck.get(card.id);
  if (existing && !isBasicLand(card)) return 'Singleton — only 1 copy allowed';
  return null;
}
