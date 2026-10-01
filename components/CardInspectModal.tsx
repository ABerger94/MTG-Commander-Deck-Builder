'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ScryfallCard } from '@/types/mtg';
import { getCardImage } from '@/lib/scryfall';
import { StarButton } from './StarButton';

interface Props {
  card: ScryfallCard | null;
  onClose: () => void;
}

function tcgplayerUrl(card: ScryfallCard): string | null {
  const id = (card as unknown as { tcgplayer_id?: number }).tcgplayer_id;
  return id ? `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(card.name)}` : null;
}

/**
 * Zoomable card inspector: large image (click to zoom), oracle text,
 * Scryfall / TCGPlayer links, star toggle.
 */
export function CardInspectModal({ card, onClose }: Props) {
  const [zoomed, setZoomed] = useState(false);
  if (!card) return null;

  const imageUrl = getCardImage(card, zoomed ? 'large' : 'normal') ?? getCardImage(card, 'normal');
  const oracleText = card.oracle_text ?? card.card_faces?.map(f => f.oracle_text).join('\n—\n') ?? '';
  const scryfallUri = (card as unknown as { scryfall_uri?: string }).scryfall_uri;
  const tcgUrl = tcgplayerUrl(card);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-[#c8a951] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#0f0f1a] border border-[#9d6b2e] text-[#c8a951] text-lg leading-none hover:bg-[#2a2a4a] z-10"
          title="Close"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 mx-auto md:mx-0 relative">
            {imageUrl ? (
              <button onClick={() => setZoomed(z => !z)} title={zoomed ? 'Zoom out' : 'Zoom in'} className="block cursor-zoom-in">
                <Image
                  src={imageUrl}
                  alt={card.name}
                  width={zoomed ? 488 : 265}
                  height={zoomed ? 680 : 370}
                  className={`rounded-xl shadow-2xl shadow-black h-auto transition-all ${zoomed ? 'w-[min(488px,80vw)] cursor-zoom-out' : 'w-56 md:w-[265px]'}`}
                />
              </button>
            ) : (
              <div className="w-56 h-[310px] bg-[#0f0f1a] rounded-xl border border-[#9d6b2e] flex items-center justify-center text-gray-600">
                No Image
              </div>
            )}
            <div className="absolute top-2 left-2">
              <StarButton
                cardId={card.id}
                name={card.name}
                imageSmall={getCardImage(card, 'small')}
                imageNormal={getCardImage(card, 'normal')}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[#c8a951] font-bold text-xl leading-tight pr-8">{card.name}</h2>
            <div className="text-sm text-gray-400 mt-1 mb-3">{card.type_line}</div>
            {oracleText && (
              <div className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg p-3 mb-4 text-sm text-[#e8e0d0] whitespace-pre-wrap leading-relaxed">
                {oracleText}
              </div>
            )}
            {(card.power || card.loyalty) && (
              <div className="text-sm text-[#c8a951] font-bold mb-3">
                {card.power ? `${card.power}/${card.toughness}` : `Loyalty: ${card.loyalty}`}
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center mb-4 text-xs text-gray-500">
              <span className="uppercase">{card.rarity}</span>
              <span>{card.set_name}</span>
              {card.prices?.usd && <span className="text-green-400">${card.prices.usd}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {scryfallUri && (
                <a
                  href={scryfallUri}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-2 rounded text-sm transition-colors"
                >
                  View on Scryfall ↗
                </a>
              )}
              {tcgUrl && (
                <a
                  href={tcgUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-2 rounded text-sm transition-colors"
                >
                  TCGPlayer ↗
                </a>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-3">Tap the card image to zoom.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
