'use client';

import { ScryfallCard } from '@/types/mtg';
import { getManaCost } from '@/lib/scryfall';
import { ManaCost } from './ManaCost';

type SearchMode = 'commander' | 'cards';

interface Props {
  mode: SearchMode;
  query: string;
  results: ScryfallCard[];
  searching: boolean;
  commander: ScryfallCard | null;
  onQueryChange: (q: string) => void;
  onModeChange: (m: SearchMode) => void;
  onSelectCard: (card: ScryfallCard) => void;
}

const RARITY_COLOR: Record<string, string> = {
  mythic: 'text-orange-400',
  rare: 'text-yellow-400',
  uncommon: 'text-gray-300',
  common: 'text-gray-500',
};

export function CardSearch({ mode, query, results, searching, commander, onQueryChange, onModeChange, onSelectCard }: Props) {
  return (
    <div className="w-full md:w-72 md:flex-shrink-0 flex flex-col bg-[#1a1a2e] md:border-r border-[#9d6b2e]">
      {/* Mode tabs */}
      <div className="flex border-b border-[#9d6b2e]">
        <button
          onClick={() => onModeChange('commander')}
          className={`flex-1 py-3 md:py-2.5 text-sm font-semibold transition-colors ${
            mode === 'commander'
              ? 'bg-[#c8a951] text-[#0f0f1a]'
              : 'text-[#c8a951] hover:bg-[#1e2035]'
          }`}
        >
          Commander
        </button>
        <button
          onClick={() => onModeChange('cards')}
          className={`flex-1 py-3 md:py-2.5 text-sm font-semibold transition-colors ${
            mode === 'cards'
              ? 'bg-[#c8a951] text-[#0f0f1a]'
              : 'text-[#c8a951] hover:bg-[#1e2035]'
          }`}
        >
          Cards
        </button>
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-[#2a2a4a]">
        {mode === 'cards' && !commander && (
          <p className="text-xs text-amber-400 mb-2">Set a commander first to filter by color identity.</p>
        )}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={mode === 'commander' ? 'Search commanders...' : 'Search cards...'}
            className="w-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] placeholder-gray-600 px-3 py-2.5 md:py-2 pr-8 rounded text-base md:text-sm focus:outline-none focus:border-[#c8a951]"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
        )}
        {!searching && query && results.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">No results found.</div>
        )}
        {!searching && !query && (
          <div className="p-4 text-center text-gray-600 text-xs">
            {mode === 'commander'
              ? 'Search for a legendary creature or planeswalker to lead your deck.'
              : 'Search for cards to add to your deck.'}
          </div>
        )}
        {results.map(card => (
          <button
            key={card.id}
            onClick={() => onSelectCard(card)}
            className="w-full text-left px-3 py-3 md:py-2 border-b border-[#1e2035] hover:bg-[#1e2035] transition-colors"
          >
            <div className="flex items-start justify-between gap-1">
              <span className={`text-sm font-medium truncate ${RARITY_COLOR[card.rarity] ?? 'text-[#e8e0d0]'}`}>
                {card.name}
              </span>
              <div className="flex-shrink-0 mt-0.5">
                <ManaCost cost={getManaCost(card)} size="xs" />
              </div>
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">{card.type_line}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
