'use client';

import { useState } from 'react';
import { ScryfallCard, DeckCard } from '@/types/mtg';
import { getCardType, TYPE_ORDER } from '@/lib/scryfall';
import { LegalityCheck } from '@/lib/legality';

interface Props {
  commander: ScryfallCard | null;
  cards: DeckCard[];
  totalCards: number;
  checks: LegalityCheck[];
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

const COLOR_LABEL: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
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

function DeckStats({ commander, cards }: { commander: ScryfallCard | null; cards: DeckCard[] }) {
  let total = 0;
  let cmcSum = 0;
  let nonLandCount = 0;
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

  const priceOf = (c: ScryfallCard) => {
    const p = parseFloat(c.prices?.usd ?? '');
    return Number.isFinite(p) ? p : 0;
  };

  if (commander) {
    total += priceOf(commander);
    for (const col of commander.color_identity) {
      if (col in colorCounts) colorCounts[col] += 1;
    }
    if (commander.color_identity.length === 0) colorCounts.C += 1;
  }
  for (const { card, quantity } of cards) {
    total += priceOf(card) * quantity;
    if (!card.type_line.includes('Land')) {
      cmcSum += card.cmc * quantity;
      nonLandCount += quantity;
    }
    if (card.color_identity.length === 0) {
      colorCounts.C += quantity;
    } else {
      for (const col of card.color_identity) {
        if (col in colorCounts) colorCounts[col] += quantity;
      }
    }
  }

  const maxColor = Math.max(...Object.values(colorCounts), 1);
  const avgCmc = nonLandCount > 0 ? (cmcSum / nonLandCount).toFixed(2) : '—';

  return (
    <div className="mt-3 border-t border-[#2a2a4a] pt-3">
      <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Deck Stats</div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Est. value</span>
        <span className="text-green-400 font-semibold">${total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs mb-3">
        <span className="text-gray-400">Avg. mana value (non-land)</span>
        <span className="text-[#e8e0d0] font-semibold">{avgCmc}</span>
      </div>
      <div className="space-y-1">
        {(['W', 'U', 'B', 'R', 'G', 'C'] as const).map(col => (
          <div key={col} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${col === 'C' ? 'bg-gray-500' : (COLOR_DOT[col] ?? 'bg-gray-500')}`} />
            <span className="text-[10px] text-gray-500 w-10">{col === 'C' ? 'Colorless' : COLOR_LABEL[col]}</span>
            <div className="flex-1 bg-[#0f0f1a] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#9d6b2e]"
                style={{ width: `${(colorCounts[col] / maxColor) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 w-6 text-right">{colorCounts[col]}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-2">Prices are Scryfall USD estimates, non-foil.</p>
    </div>
  );
}

function SampleHand({ cards }: { cards: DeckCard[] }) {
  const [hand, setHand] = useState<ScryfallCard[] | null>(null);

  const librarySize = cards.reduce((s, dc) => s + dc.quantity, 0);

  const drawHand = () => {
    // Expand quantities into a library, shuffle, and draw 7.
    const library: ScryfallCard[] = [];
    for (const { card, quantity } of cards) {
      for (let i = 0; i < quantity; i++) library.push(card);
    }
    for (let i = library.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [library[i], library[j]] = [library[j], library[i]];
    }
    setHand(library.slice(0, 7));
  };

  const landCount = hand?.filter(c => c.type_line.includes('Land')).length ?? 0;

  return (
    <div className="mt-3 border-t border-[#2a2a4a] pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Sample Opening Hand</div>
        <button
          onClick={drawHand}
          disabled={librarySize < 7}
          className="text-xs bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-2.5 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {hand ? 'Redraw' : 'Draw 7'}
        </button>
      </div>
      {librarySize < 7 ? (
        <p className="text-[11px] text-gray-600">Add at least 7 cards to sample an opening hand.</p>
      ) : hand ? (
        <div>
          <p className="text-[11px] text-gray-500 mb-1.5">
            {landCount} land{landCount === 1 ? '' : 's'} · {7 - landCount} spell{7 - landCount === 1 ? '' : 's'}
          </p>
          <ul className="space-y-0.5">
            {hand.map((c, i) => (
              <li key={`${c.id}-${i}`} className="text-xs text-[#e8e0d0] truncate">
                <span className={c.type_line.includes('Land') ? 'text-green-400' : 'text-[#e8e0d0]'}>
                  {c.name}
                </span>
                <span className="text-gray-600"> — {c.type_line.split('—')[0].trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-gray-600">Draw 7 from your {librarySize}-card library to test your curve.</p>
      )}
    </div>
  );
}

export function DeckPanel({ commander, cards, totalCards, checks, onSelectCard, onRemoveCard, onRemoveCommander }: Props) {
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
    <div className="w-full md:w-72 md:flex-shrink-0 flex flex-col bg-[#1a1a2e] md:border-l border-[#9d6b2e]">
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

      {/* Legality checklist */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">Legality</div>
        <div className="space-y-1">
          {checks.map(check => (
            <div key={check.id} className="flex items-start gap-2">
              <span className={`text-sm leading-5 flex-shrink-0 ${check.ok ? 'text-green-400' : 'text-red-400'}`}>
                {check.ok ? '✓' : '✗'}
              </span>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#e8e0d0]">{check.label}</span>
                <span className="text-xs text-gray-500"> — {check.detail}</span>
              </div>
            </div>
          ))}
        </div>
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
          <div className="px-3 pb-1">
            <ManaCurve cards={cards} />
          </div>
        )}

        {/* Deck stats */}
        {(cards.length > 0 || commander) && (
          <div className="px-3 pb-3">
            <DeckStats commander={commander} cards={cards} />
            <SampleHand cards={cards} />
          </div>
        )}
      </div>
    </div>
  );
}
