'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ScryfallCard, ScryfallSet } from '@/types/mtg';
import { fetchSets, fetchRandomCommander, searchCardsInSet, getCardImage } from '@/lib/scryfall';
import { ManaCost } from '@/components/ManaCost';
import { StarButton } from '@/components/StarButton';

type Tab = 'sets' | 'cards' | 'random';

const COLOR_DOT: Record<string, string> = {
  W: 'bg-amber-50',
  U: 'bg-blue-500',
  B: 'bg-gray-900 ring-1 ring-gray-600',
  R: 'bg-red-600',
  G: 'bg-green-700',
};

function prettySetType(t: string): string {
  return t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function Explore() {
  const [tab, setTab] = useState<Tab>('sets');

  // Sets
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setQuery, setSetQuery] = useState('');
  const [activeSet, setActiveSet] = useState<ScryfallSet | null>(null);

  // Card search
  const [cardQuery, setCardQuery] = useState('');
  const [cardResults, setCardResults] = useState<ScryfallCard[]>([]);
  const [cardSearching, setCardSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const cardDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random commander
  const [randomCommander, setRandomCommander] = useState<ScryfallCard | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    fetchSets().then(s => {
      setSets(s);
      setSetsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (cardDebounce.current) clearTimeout(cardDebounce.current);
    if (!cardQuery.trim() && !activeSet) {
      setCardResults([]);
      return;
    }
    cardDebounce.current = setTimeout(async () => {
      setCardSearching(true);
      try {
        const res = await searchCardsInSet(cardQuery, activeSet?.code);
        setCardResults(res.slice(0, 60));
      } finally {
        setCardSearching(false);
      }
    }, 400);
    return () => { if (cardDebounce.current) clearTimeout(cardDebounce.current); };
  }, [cardQuery, activeSet]);

  const rollCommander = async () => {
    setRolling(true);
    try {
      const card = await fetchRandomCommander();
      if (card) setRandomCommander(card);
    } finally {
      setRolling(false);
    }
  };

  const filteredSets = sets.filter(s => {
    const q = setQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  const pickSet = (s: ScryfallSet) => {
    setActiveSet(s);
    setSelectedCard(null);
    setTab('cards');
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
        tab === t ? 'text-[#c8a951]' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {tab === t && <span className="block h-0.5 bg-[#c8a951] mt-1 -mb-2.5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e8e0d0]">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-[#c8a951] px-3 md:px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/"
          className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 rounded text-sm transition-colors"
        >
          ← Deck Builder
        </Link>
        <span className="text-[#c8a951] font-bold text-base md:text-lg">🔍 Explore Magic</span>
        <span className="text-xs text-gray-500 hidden md:inline">sets, cards & random commanders</span>
        <span className="ml-auto flex items-center gap-2">
          <Link
            href="/briefing"
            className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 rounded text-sm transition-colors"
          >
            ✨ Briefing
          </Link>
          <Link
            href="/library"
            className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 rounded text-sm transition-colors"
          >
            ★ Library
          </Link>
        </span>
      </header>

      {/* Tabs */}
      <nav className="flex bg-[#1a1a2e] border-b border-[#9d6b2e] px-2">
        {tabBtn('sets', `Sets (${sets.length || '…'})`)}
        {tabBtn('cards', 'Card Search')}
        {tabBtn('random', 'Random Commander')}
      </nav>

      <main className="max-w-5xl mx-auto p-3 md:p-6">
        {tab === 'sets' && (
          <section>
            <input
              type="text"
              value={setQuery}
              onChange={e => setSetQuery(e.target.value)}
              placeholder="Filter sets by name or code…"
              className="w-full bg-[#1a1a2e] border border-[#9d6b2e] rounded-lg px-4 py-2.5 text-sm text-[#e8e0d0] placeholder-gray-600 focus:outline-none focus:border-[#c8a951] mb-4"
            />
            {setsLoading ? (
              <p className="text-gray-500 text-sm">Loading sets…</p>
            ) : filteredSets.length === 0 ? (
              <p className="text-gray-500 text-sm">No sets match “{setQuery}”.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredSets.map(s => (
                  <button
                    key={s.code}
                    onClick={() => pickSet(s)}
                    className="flex items-center gap-3 bg-[#1a1a2e] border border-[#2a2a4a] hover:border-[#c8a951] rounded-lg p-3 text-left transition-colors"
                    title={`Browse cards in ${s.name}`}
                  >
                    {s.icon_svg_uri ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.icon_svg_uri} alt="" className="w-8 h-8 flex-shrink-0 invert opacity-80" />
                    ) : (
                      <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-[#c8a951] font-bold text-xs border border-[#9d6b2e] rounded">
                        {s.code.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#e8e0d0] truncate">{s.name}</span>
                      <span className="block text-[11px] text-gray-500">
                        {s.code.toUpperCase()} · {prettySetType(s.set_type)}
                        {s.released_at ? ` · ${s.released_at}` : ''}
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-500 flex-shrink-0">{s.card_count} cards</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'cards' && (
          <section>
            {activeSet && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400">
                  Browsing set: <span className="text-[#c8a951] font-semibold">{activeSet.name}</span>
                </span>
                <button
                  onClick={() => setActiveSet(null)}
                  className="text-xs text-gray-500 hover:text-red-400 border border-[#2a2a4a] rounded px-2 py-0.5"
                >
                  × clear
                </button>
              </div>
            )}
            <input
              type="text"
              value={cardQuery}
              onChange={e => setCardQuery(e.target.value)}
              placeholder={activeSet ? `Search cards in ${activeSet.name}…` : 'Search all cards… (leave blank with a set selected to browse it)'}
              className="w-full bg-[#1a1a2e] border border-[#9d6b2e] rounded-lg px-4 py-2.5 text-sm text-[#e8e0d0] placeholder-gray-600 focus:outline-none focus:border-[#c8a951] mb-4"
            />
            {cardSearching && <p className="text-gray-500 text-sm mb-2">Searching…</p>}
            {!cardSearching && cardResults.length === 0 && (cardQuery.trim() || activeSet) && (
              <p className="text-gray-500 text-sm">No cards found.</p>
            )}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 content-start">
                {cardResults.map(c => {
                  const img = getCardImage(c, 'small');
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCard(c)}
                      className={`rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedCard?.id === c.id ? 'border-[#c8a951]' : 'border-transparent hover:border-[#9d6b2e]'
                      }`}
                      title={c.name}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={c.name} className="w-full h-auto block" loading="lazy" />
                      ) : (
                        <span className="block p-2 text-xs text-gray-400 bg-[#1a1a2e]">{c.name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedCard && (
                <div className="md:w-72 flex-shrink-0 bg-[#1a1a2e] border border-[#9d6b2e] rounded-lg p-4 h-fit md:sticky md:top-24">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="text-base font-bold text-[#c8a951]">{selectedCard.name}</h2>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StarButton
                        cardId={selectedCard.id}
                        name={selectedCard.name}
                        imageSmall={getCardImage(selectedCard, 'small')}
                        imageNormal={getCardImage(selectedCard, 'normal')}
                        className="w-7 h-7"
                      />
                      <button onClick={() => setSelectedCard(null)} className="text-gray-500 hover:text-gray-300">×</button>
                    </div>
                  </div>
                  <div className="mb-2"><ManaCost cost={selectedCard.mana_cost ?? selectedCard.card_faces?.[0]?.mana_cost ?? ''} /></div>
                  <p className="text-xs text-gray-400 mb-2">{selectedCard.type_line}</p>
                  {selectedCard.oracle_text && (
                    <p className="text-xs text-[#e8e0d0] whitespace-pre-line mb-2">{selectedCard.oracle_text}</p>
                  )}
                  {(selectedCard.power || selectedCard.toughness) && (
                    <p className="text-xs text-gray-400 mb-2">{selectedCard.power}/{selectedCard.toughness}</p>
                  )}
                  <p className="text-[11px] text-gray-500">
                    {selectedCard.set_name} ({selectedCard.set.toUpperCase()}) · {selectedCard.rarity}
                    {selectedCard.prices?.usd ? ` · $${selectedCard.prices.usd}` : ''}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'random' && (
          <section className="flex flex-col items-center">
            <p className="text-sm text-gray-400 text-center max-w-md mb-4">
              Looking for a new deck to build? Roll a random legal commander and see what sparks.
            </p>
            <button
              onClick={rollCommander}
              disabled={rolling}
              className="bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-6 py-3 rounded-lg font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-6"
            >
              {rolling ? 'Rolling…' : randomCommander ? '🎲 Roll again' : '🎲 Find me a commander'}
            </button>
            {randomCommander && (
              <div className="w-full max-w-3xl bg-[#1a1a2e] border border-[#9d6b2e] rounded-xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
                {(() => {
                  const img = getCardImage(randomCommander, 'normal');
                  return img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={randomCommander.name} className="w-48 md:w-64 rounded-lg mx-auto md:mx-0 flex-shrink-0" />
                  ) : null;
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {randomCommander.color_identity.map(c => (
                        <span key={c} className={`w-3.5 h-3.5 rounded-full ${COLOR_DOT[c] ?? 'bg-gray-500'}`} />
                      ))}
                      {randomCommander.color_identity.length === 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-gray-500" />
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[#c8a951] mb-1">{randomCommander.name}</h2>
                  <div className="mb-2"><ManaCost cost={randomCommander.mana_cost ?? randomCommander.card_faces?.[0]?.mana_cost ?? ''} /></div>
                  <p className="text-sm text-gray-400 mb-2">{randomCommander.type_line}</p>
                  {randomCommander.oracle_text && (
                    <p className="text-sm text-[#e8e0d0] whitespace-pre-line mb-3">{randomCommander.oracle_text}</p>
                  )}
                  {(randomCommander.power || randomCommander.toughness) && (
                    <p className="text-sm text-gray-400 mb-3">{randomCommander.power}/{randomCommander.toughness}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">
                    {randomCommander.set_name} ({randomCommander.set.toUpperCase()}) · {randomCommander.rarity}
                    {randomCommander.prices?.usd ? ` · $${randomCommander.prices.usd}` : ''}
                  </p>
                  <Link
                    href={`/?commander=${encodeURIComponent(randomCommander.name)}`}
                    className="inline-block bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-4 py-2 rounded text-sm font-semibold transition-colors"
                  >
                    ⚔ Build around {randomCommander.name.split(',')[0]}
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
