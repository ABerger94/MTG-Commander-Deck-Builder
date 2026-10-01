'use client';

import Image from 'next/image';
import { ScryfallCard } from '@/types/mtg';
import { getCardImage, getManaCost } from '@/lib/scryfall';
import { ManaCost } from './ManaCost';
import { StarButton } from './StarButton';

interface Props {
  card: ScryfallCard | null;
  commander: ScryfallCard | null;
  inDeck: boolean;
  deckCount: number;
  totalCards: number;
  /** Non-null when the card cannot be added right now; shown as inline feedback. */
  addBlockReason: string | null;
  onSetCommander: (card: ScryfallCard) => void;
  onAddCard: (card: ScryfallCard) => void;
  onRemoveCard: (id: string) => void;
}

const RARITY_STYLES: Record<string, string> = {
  mythic: 'text-orange-400 border-orange-400',
  rare: 'text-yellow-400 border-yellow-400',
  uncommon: 'text-gray-300 border-gray-300',
  common: 'text-gray-500 border-gray-500',
};

const COLOR_BADGE: Record<string, string> = {
  W: 'bg-amber-50 text-amber-900',
  U: 'bg-blue-500 text-white',
  B: 'bg-gray-900 text-gray-200 ring-1 ring-gray-600',
  R: 'bg-red-600 text-white',
  G: 'bg-green-700 text-white',
};

export function CardDetail({ card, commander, inDeck, deckCount, totalCards, addBlockReason, onSetCommander, onAddCard, onRemoveCard }: Props) {
  if (!card) {
    return (
      <div className="w-full flex-1 flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center text-gray-600 max-w-xs">
          <div className="text-6xl mb-4">⚔</div>
          <p className="text-lg font-semibold text-gray-500">Select a card to view details</p>
          <p className="text-sm mt-2">Search for a commander to get started, then build your 99-card deck.</p>
        </div>
      </div>
    );
  }

  const imageUrl = getCardImage(card, 'normal');
  const manaCost = getManaCost(card);
  const isCommander = commander?.id === card.id;
  const canBeCommander = card.legalities.commander === 'legal';
  const rarityStyle = RARITY_STYLES[card.rarity] ?? 'text-gray-400 border-gray-400';
  const oracleText = card.oracle_text ?? card.card_faces?.map(f => f.oracle_text).join('\n—\n') ?? '';

  return (
    <div className="w-full flex-1 overflow-y-auto bg-[#0f0f1a] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Card image */}
          <div className="flex-shrink-0 mx-auto md:mx-0 relative">
            <div className="absolute top-2 left-2 z-10">
              <StarButton
                cardId={card.id}
                name={card.name}
                imageSmall={getCardImage(card, 'small')}
                imageNormal={getCardImage(card, 'normal')}
              />
            </div>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={card.name}
                width={265}
                height={370}
                className="rounded-xl shadow-2xl shadow-black w-56 md:w-[265px] h-auto"
                priority
              />
            ) : (
              <div className="w-56 md:w-[265px] h-[310px] md:h-[370px] bg-[#1a1a2e] rounded-xl border border-[#9d6b2e] flex items-center justify-center text-gray-600">
                No Image
              </div>
            )}
          </div>

          {/* Card info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-[#c8a951] font-bold text-xl leading-tight">{card.name}</h2>
              <ManaCost cost={manaCost} size="md" />
            </div>

            <div className="text-sm text-gray-400 mb-3">{card.type_line}</div>

            {/* Color identity */}
            {card.color_identity.length > 0 && (
              <div className="flex gap-1 mb-3">
                {card.color_identity.map(c => (
                  <span key={c} className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${COLOR_BADGE[c] ?? 'bg-gray-500 text-white'}`}>
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Oracle text */}
            {oracleText && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-3 mb-3 text-sm text-[#e8e0d0] whitespace-pre-wrap leading-relaxed">
                {oracleText}
              </div>
            )}

            {/* P/T or Loyalty */}
            {(card.power || card.loyalty) && (
              <div className="text-sm text-[#c8a951] font-bold mb-3">
                {card.power ? `${card.power}/${card.toughness}` : `Loyalty: ${card.loyalty}`}
              </div>
            )}

            {/* Set / Rarity / Price */}
            <div className="flex flex-wrap gap-2 items-center mb-4 text-xs">
              <span className={`border rounded px-1.5 py-0.5 uppercase font-semibold ${rarityStyle}`}>
                {card.rarity}
              </span>
              <span className="text-gray-500">{card.set_name}</span>
              {card.prices?.usd && (
                <span className="text-green-400">${card.prices.usd}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {isCommander ? (
                <span className="bg-[#c8a951] text-[#0f0f1a] px-4 py-2 rounded font-bold text-sm">
                  Commander
                </span>
              ) : canBeCommander ? (
                <button
                  onClick={() => onSetCommander(card)}
                  className="bg-[#9d6b2e] hover:bg-[#c8a951] text-white hover:text-[#0f0f1a] px-4 py-2.5 md:py-2 rounded font-semibold text-sm transition-colors"
                >
                  Set as Commander
                </button>
              ) : null}

              {!isCommander && (
                <>
                  {inDeck ? (
                    <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[#9d6b2e] rounded overflow-hidden">
                      <button
                        onClick={() => onRemoveCard(card.id)}
                        className="px-4 md:px-3 py-2.5 md:py-2 text-[#c8a951] hover:bg-[#2a2a4a] font-bold text-lg leading-none transition-colors"
                      >
                        −
                      </button>
                      <span className="px-2 text-sm text-[#e8e0d0] font-semibold">{deckCount}</span>
                      <button
                        onClick={() => onAddCard(card)}
                        disabled={addBlockReason !== null}
                        className="px-4 md:px-3 py-2.5 md:py-2 text-[#c8a951] hover:bg-[#2a2a4a] font-bold text-lg leading-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddCard(card)}
                      disabled={addBlockReason !== null}
                      className="bg-[#1a3a6e] hover:bg-blue-700 text-white px-4 py-2.5 md:py-2 rounded font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addBlockReason === 'Banned in Commander' ? 'Banned' : addBlockReason === 'Deck is full (100 cards)' ? 'Deck Full' : 'Add to Deck'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Inline validation feedback */}
            {addBlockReason && !isCommander && (
              <p className="mt-2 text-xs text-amber-400">{addBlockReason}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
