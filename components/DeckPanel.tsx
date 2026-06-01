'use client';

import { ScryfallCard, DeckCard } from '@/types/mtg';
import { getCardType, TYPE_ORDER } from '@/lib/scryfall';

interface Props {
  commander: ScryfallCard | null;
  cards: DeckCard[];
  totalCards: number;
  onSelectCard: (card: ScryfallCard) => void;
  onRemoveCard: (id: string) => void;
  onRemoveCommander: () => void;
}

const COLOR_DOT: Record<string, string> = {
  W: 'bg-amber-50',
  U: 'bg-blue-500',
  B: 'bg-gray-900 ring-1 ring-gray-600',
  R: 'bg-red-600',
  G: 'bg-green-700',
};

function ManaCurve({ cards }: { cards: DeckCard[] }) {
  const counts = Array(8).fill(0);
  for (const { card, quantity } of cards) {
    if (!card.type_line.includes('Land')) {
      const idx = Math.min(card.cmc, 7);
      counts[idx] += quantity;
    }
  }
  const max = Math.max(...counts, 1);

  return (
    <div className="mt-3 border-t border-[#2a2a4a] pt-3">
      <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Mana Curve</div>
      <div className="flex items-end gap-1 h-16">
        {counts.map((count, cmc) => (
          <div key={cmc} className="flex-1 flex flex-col items-center gap-0.5">
            {count > 0 && (
              <span className="text-[9px] text-gray-400">{count}</span>
            )}
            <div
              className="w-full bg-[#c8a951] rounded-t opacity-80"
              style={{ height: `${(count / max) * 44}px`, minHeight: count > 0 ? '2px' : '0' }}
            />
            <span className="text-[9px] text-gray-500">{cmc === 7 ? '7+' : cmc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeckPanel({ commander, cards, totalCards, onSelectCard, onRemoveCard, onRemoveCommander }: Props) {
  const pct = Math.round((totalCards / 100) * 100);

  // Group cards by type
  const groups: Record<string, DeckCard[]> = {};
  for (const dc of cards) {
    const type = getCardType(dc.card.type_line);
    if (!groups[type]) groups[type] = [];
    groups[type].push(dc);
  }

  // Sort each group alphabetically
  for (const type of Object.keys(groups)) {
    groups[type].sort((a, b) => a.card.name.localeCompare(b.card.name));
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-[#1a1a2e] border-l border-[#9d6b2e]">
      {/* Header */}
      <div className="p-3 border-b border-[#9d6b2e]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#c8a951]">Deck</span>
          <span className={`text-sm font-bold ${totalCards === 100 ? 'text-green-400' : 'text-[#e8e0d0]'}`}>
            {totalCards}/100
          </span>
        </div>
        <div className="w-full bg-[#0f0f1a] rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${totalCards === 100 ? 'bg-green-400' : 'bg-[#c8a951]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Commander zone */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">Commander</div>
        {commander ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {commander.color_identity.map(c => (
                <span key={c} className={`w-3 h-3 rounded-full ${COLOR_DOT[c] ?? 'bg-gray-500'}`} />
              ))}
              {commander.color_identity.length === 0 && (
                <span className="w-3 h-3 rounded-full bg-gray-500" />
              )}
            </div>
            <button
              onClick={() => onSelectCard(commander)}
              className="flex-1 text-sm text-[#c8a951] font-semibold hover:text-white text-left truncate"
            >
              {commander.name}
            </button>
            <button
              onClick={onRemoveCommander}
              className="text-gray-600 hover:text-red-400 text-sm flex-shrink-0"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-600">No commander selected</div>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {TYPE_ORDER.filter(t => groups[t]?.length > 0).map(type => (
          <div key={type}>
            <div className="sticky top-0 bg-[#1a1a2e] px-3 py-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wide border-b border-[#2a2a4a] flex justify-between">
              <span>{type}</span>
              <span>{groups[type].reduce((s, dc) => s + dc.quantity, 0)}</span>
            </div>
            {groups[type].map(({ card, quantity }) => (
              <div key={card.id} className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1e2035] hover:bg-[#1e2035] group">
                {quantity > 1 && (
                  <span className="text-xs text-gray-500 font-mono w-5 text-right flex-shrink-0">{quantity}×</span>
                )}
                <button
                  onClick={() => onSelectCard(card)}
                  className="flex-1 text-sm text-[#e8e0d0] hover:text-[#c8a951] text-left truncate"
                >
                  {card.name}
                </button>
                <button
                  onClick={() => onRemoveCard(card.id)}
                  className="text-gray-700 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}

        {cards.length === 0 && (
          <div className="p-4 text-xs text-gray-600 text-center">
            Add cards from the search panel.
          </div>
        )}

        {/* Mana curve */}
        {cards.length > 0 && (
          <div className="px-3 pb-3">
            <ManaCurve cards={cards} />
          </div>
        )}
      </div>
    </div>
  );
}
