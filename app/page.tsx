'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ScryfallCard, DeckCard } from '@/types/mtg';
import { searchCards, searchCommanders, isBasicLand } from '@/lib/scryfall';
import { CardSearch } from '@/components/CardSearch';
import { CardDetail } from '@/components/CardDetail';
import { DeckPanel } from '@/components/DeckPanel';

type SearchMode = 'commander' | 'cards';

export default function Home() {
  const [mode, setMode] = useState<SearchMode>('commander');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [commander, setCommander] = useState<ScryfallCard | null>(null);
  const [deck, setDeck] = useState<Map<string, DeckCard>>(new Map());
  const [selected, setSelected] = useState<ScryfallCard | null>(null);
  const [deckName, setDeckName] = useState('My Commander Deck');
  const [saveMsg, setSaveMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCards = (commander ? 1 : 0) + Array.from(deck.values()).reduce((s, dc) => s + dc.quantity, 0);

  const doSearch = useCallback(async (q: string, m: SearchMode, colorId?: string[]) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const cards = m === 'commander'
        ? await searchCommanders(q)
        : await searchCards(q, colorId);
      setResults(cards.slice(0, 100));
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, mode, commander?.color_identity);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, mode, commander?.color_identity, doSearch]);

  const handleSetCommander = (card: ScryfallCard) => {
    setCommander(card);
    setSelected(card);
    setMode('cards');
    setQuery('');
    setResults([]);
  };

  const handleAddCard = (card: ScryfallCard) => {
    if (card.id === commander?.id) return;
    if (totalCards >= 100) return;
    setDeck(prev => {
      const next = new Map(prev);
      const existing = next.get(card.id);
      if (existing) {
        if (!isBasicLand(card)) return next;
        next.set(card.id, { card, quantity: existing.quantity + 1 });
      } else {
        next.set(card.id, { card, quantity: 1 });
      }
      return next;
    });
  };

  const handleRemoveCard = (cardId: string) => {
    setDeck(prev => {
      const next = new Map(prev);
      const existing = next.get(cardId);
      if (!existing) return next;
      if (existing.quantity <= 1) next.delete(cardId);
      else next.set(cardId, { ...existing, quantity: existing.quantity - 1 });
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem('mtg-deck', JSON.stringify({
      name: deckName,
      commander,
      cards: Array.from(deck.values()),
    }));
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleLoad = () => {
    try {
      const raw = localStorage.getItem('mtg-deck');
      if (!raw) return;
      const data = JSON.parse(raw);
      setDeckName(data.name ?? 'My Commander Deck');
      setCommander(data.commander ?? null);
      const map = new Map<string, DeckCard>();
      for (const dc of (data.cards ?? [])) map.set(dc.card.id, dc);
      setDeck(map);
    } catch { /* ignore */ }
  };

  const handleClear = () => {
    if (!confirm('Clear the entire deck?')) return;
    setCommander(null);
    setDeck(new Map());
    setSelected(null);
    setMode('commander');
    setQuery('');
    setResults([]);
  };

  const deckCards = Array.from(deck.values());

  return (
    <div className="h-screen flex flex-col bg-[#0f0f1a] text-[#e8e0d0] overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#1a1a2e] border-b border-[#c8a951] px-4 py-2.5 flex items-center gap-3">
        <span className="text-[#c8a951] font-bold text-lg">⚔ MTG Commander Deck Builder</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            className="bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-2.5 py-1 rounded text-sm w-44 focus:outline-none focus:border-[#c8a951]"
          />
          <button
            onClick={handleSave}
            className="bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
          >
            {saveMsg || 'Save'}
          </button>
          <button
            onClick={handleLoad}
            className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1 rounded text-sm transition-colors"
          >
            Load
          </button>
          <button
            onClick={handleClear}
            className="bg-[#1e2035] hover:bg-red-900 text-[#c8a951] border border-[#9d6b2e] px-3 py-1 rounded text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <CardSearch
          mode={mode}
          query={query}
          results={results}
          searching={searching}
          commander={commander}
          onQueryChange={setQuery}
          onModeChange={setMode}
          onSelectCard={setSelected}
        />
        <CardDetail
          card={selected}
          commander={commander}
          inDeck={selected ? deck.has(selected.id) : false}
          deckCount={selected ? (deck.get(selected.id)?.quantity ?? 0) : 0}
          totalCards={totalCards}
          onSetCommander={handleSetCommander}
          onAddCard={handleAddCard}
          onRemoveCard={handleRemoveCard}
        />
        <DeckPanel
          commander={commander}
          cards={deckCards}
          totalCards={totalCards}
          onSelectCard={setSelected}
          onRemoveCard={handleRemoveCard}
          onRemoveCommander={() => { setCommander(null); setMode('commander'); }}
        />
      </div>
    </div>
  );
}
