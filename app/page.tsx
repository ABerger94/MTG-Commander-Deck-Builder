'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ScryfallCard, DeckCard, SavedDeck } from '@/types/mtg';
import { searchCards, searchCommanders, isBasicLand, fetchCardByExactName } from '@/lib/scryfall';
import { checkDeck, validateAdd } from '@/lib/legality';
import { CardSearch } from '@/components/CardSearch';
import { CardDetail } from '@/components/CardDetail';
import { DeckPanel } from '@/components/DeckPanel';
import { ImportModal, ImportOutcome } from '@/components/ImportModal';

type SearchMode = 'commander' | 'cards';
type MobileTab = 'search' | 'card' | 'deck';

const DECKS_KEY = 'mtg-decks';
const LEGACY_KEY = 'mtg-deck';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `deck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadSavedDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (raw) return JSON.parse(raw) as SavedDeck[];
    // Migrate the legacy single-deck slot
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      const migrated: SavedDeck[] = [{
        id: newId(),
        name: data.name ?? 'My Commander Deck',
        commander: data.commander ?? null,
        cards: data.cards ?? [],
        updatedAt: Date.now(),
      }];
      localStorage.setItem(DECKS_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch { /* ignore */ }
  return [];
}

function persistDecks(decks: SavedDeck[]) {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
  } catch { /* ignore */ }
}

export default function Home() {
  const [mode, setMode] = useState<SearchMode>('commander');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [commander, setCommander] = useState<ScryfallCard | null>(null);
  const [deck, setDeck] = useState<Map<string, DeckCard>>(new Map());
  const [selected, setSelected] = useState<ScryfallCard | null>(null);
  const [deckName, setDeckName] = useState('My Commander Deck');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('search');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCards = (commander ? 1 : 0) + Array.from(deck.values()).reduce((s, dc) => s + dc.quantity, 0);

  useEffect(() => {
    setSavedDecks(loadSavedDecks());
    // Deep link from the Explore page: ?commander=<exact card name>
    try {
      const name = new URLSearchParams(window.location.search).get('commander');
      if (name) {
        fetchCardByExactName(name).then(card => {
          if (card) {
            setCommander(card);
            setSelected(card);
            setMode('cards');
          }
        });
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch { /* ignore */ }
  }, []);

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
    setMobileTab('search');
  };

  const handleAddCard = (card: ScryfallCard) => {
    const reason = validateAdd(card, deck, commander, totalCards);
    if (reason) return;
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

  const handleSelectCard = (card: ScryfallCard) => {
    setSelected(card);
    setMobileTab('card');
  };

  // ---- Saved decks ----

  const handleSave = () => {
    const snapshot: SavedDeck = {
      id: activeDeckId ?? newId(),
      name: deckName || 'Untitled Deck',
      commander,
      cards: Array.from(deck.values()),
      updatedAt: Date.now(),
    };
    setSavedDecks(prev => {
      const next = activeDeckId ? prev.map(d => d.id === activeDeckId ? snapshot : d) : [...prev, snapshot];
      persistDecks(next);
      return next;
    });
    setActiveDeckId(snapshot.id);
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleSelectDeck = (id: string) => {
    const found = savedDecks.find(d => d.id === id);
    if (!found) return;
    setDeckName(found.name);
    setCommander(found.commander);
    const map = new Map<string, DeckCard>();
    for (const dc of found.cards) map.set(dc.card.id, dc);
    setDeck(map);
    setSelected(found.commander);
    setActiveDeckId(found.id);
    setMode(found.commander ? 'cards' : 'commander');
    setMobileTab('deck');
  };

  const handleNewDeck = () => {
    setDeckName('My Commander Deck');
    setCommander(null);
    setDeck(new Map());
    setSelected(null);
    setActiveDeckId(null);
    setMode('commander');
    setQuery('');
    setResults([]);
    setMobileTab('search');
  };

  const handleDeleteDeck = () => {
    if (!activeDeckId) return;
    if (!confirm(`Delete "${deckName}"?`)) return;
    setSavedDecks(prev => {
      const next = prev.filter(d => d.id !== activeDeckId);
      persistDecks(next);
      return next;
    });
    handleNewDeck();
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

  // ---- Import ----

  // Validates an import against deck rules and returns what was actually added,
  // so the import dialog can report accurate counts and skip reasons.
  const handleImport = async (initial: ImportOutcome): Promise<ImportOutcome> => {
    const skipped: { name: string; reason: string }[] = [...initial.skipped];
    let newCommander: ScryfallCard | null = null;

    if (initial.commander) {
      if (initial.commander.legalities.commander !== 'legal') {
        skipped.push({ name: initial.commander.name, reason: 'Not a legal commander' });
      } else if (commander && commander.id !== initial.commander.id) {
        skipped.push({ name: initial.commander.name, reason: 'Commander already set' });
      } else {
        newCommander = initial.commander;
      }
    }

    const effCommander = newCommander ?? commander;

    // Simulate the import against a working copy so singleton and 100-card
    // cap checks see cards added earlier in the same batch.
    const sim = new Map(deck);
    let simTotal = (effCommander ? 1 : 0) + Array.from(sim.values()).reduce((s, dc) => s + dc.quantity, 0);
    const addedCards: ScryfallCard[] = [];

    for (const card of initial.cards) {
      const reason = validateAdd(card, sim, effCommander, simTotal);
      if (reason) {
        if (!skipped.some(s => s.name === card.name && s.reason === reason)) {
          skipped.push({ name: card.name, reason });
        }
        continue;
      }
      const existing = sim.get(card.id);
      if (existing) sim.set(card.id, { card, quantity: existing.quantity + 1 });
      else sim.set(card.id, { card, quantity: 1 });
      simTotal += 1;
      addedCards.push(card);
    }

    if (newCommander) {
      setCommander(newCommander);
      setSelected(newCommander);
    }
    if (addedCards.length > 0) {
      setDeck(prev => {
        const next = new Map(prev);
        for (const card of addedCards) {
          const existing = next.get(card.id);
          if (existing) next.set(card.id, { card, quantity: existing.quantity + 1 });
          else next.set(card.id, { card, quantity: 1 });
        }
        return next;
      });
    }
    setMobileTab('deck');

    return { commander: newCommander, cards: addedCards, skipped };
  };

  const deckCards = Array.from(deck.values());
  const checks = checkDeck(commander, deckCards);
  const addBlockReason = selected ? validateAdd(selected, deck, commander, totalCards) : null;

  const tabButton = (tab: MobileTab, label: string, badge?: number) => (
    <button
      onClick={() => setMobileTab(tab)}
      className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
        mobileTab === tab ? 'text-[#c8a951]' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1/2 translate-x-6 bg-[#c8a951] text-[#0f0f1a] text-[10px] font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
          {badge}
        </span>
      )}
      {mobileTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c8a951]" />}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-[#0f0f1a] text-[#e8e0d0] overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#1a1a2e] border-b border-[#c8a951] px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[#c8a951] font-bold text-base md:text-lg mr-1">⚔ MTG Commander Deck Builder</span>
        <Link
          href="/explore"
          className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 md:py-1 rounded text-sm transition-colors"
        >
          🔍 Explore
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={activeDeckId ?? ''}
            onChange={e => e.target.value ? handleSelectDeck(e.target.value) : handleNewDeck()}
            className="bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-2 py-1.5 md:py-1 rounded text-sm max-w-36 md:max-w-48 focus:outline-none focus:border-[#c8a951]"
            title="Saved decks"
          >
            <option value="">Unsaved deck</option>
            {savedDecks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            className="bg-[#0f0f1a] border border-[#9d6b2e] text-[#e8e0d0] px-2.5 py-1.5 md:py-1 rounded text-sm w-32 md:w-44 focus:outline-none focus:border-[#c8a951]"
          />
          <button
            onClick={handleNewDeck}
            className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 md:py-1 rounded text-sm transition-colors"
          >
            New
          </button>
          <button
            onClick={handleSave}
            className="bg-[#9d6b2e] hover:bg-[#c8a951] hover:text-[#0f0f1a] text-white px-3 py-1.5 md:py-1 rounded text-sm font-semibold transition-colors"
          >
            {saveMsg || 'Save'}
          </button>
          {activeDeckId && (
            <button
              onClick={handleDeleteDeck}
              className="bg-[#1e2035] hover:bg-red-900 text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 md:py-1 rounded text-sm transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="bg-[#1e2035] hover:bg-[#2a2a4a] text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 md:py-1 rounded text-sm transition-colors"
          >
            Import / Export
          </button>
          <button
            onClick={handleClear}
            className="bg-[#1e2035] hover:bg-red-900 text-[#c8a951] border border-[#9d6b2e] px-3 py-1.5 md:py-1 rounded text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Body — three panels on desktop, tabbed single panel on mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className={`${mobileTab === 'search' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-none overflow-hidden`}>
          <CardSearch
            mode={mode}
            query={query}
            results={results}
            searching={searching}
            commander={commander}
            onQueryChange={setQuery}
            onModeChange={setMode}
            onSelectCard={handleSelectCard}
          />
        </div>
        <div className={`${mobileTab === 'card' ? 'flex' : 'hidden'} md:flex flex-1 overflow-hidden`}>
          <CardDetail
            card={selected}
            commander={commander}
            inDeck={selected ? deck.has(selected.id) : false}
            deckCount={selected ? (deck.get(selected.id)?.quantity ?? 0) : 0}
            totalCards={totalCards}
            addBlockReason={addBlockReason}
            onSetCommander={handleSetCommander}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
          />
        </div>
        <div className={`${mobileTab === 'deck' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-none overflow-hidden`}>
          <DeckPanel
            commander={commander}
            cards={deckCards}
            totalCards={totalCards}
            checks={checks}
            onSelectCard={handleSelectCard}
            onRemoveCard={handleRemoveCard}
            onRemoveCommander={() => { setCommander(null); setMode('commander'); }}
          />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden flex-shrink-0 flex bg-[#1a1a2e] border-t border-[#9d6b2e]">
        {tabButton('search', 'Search')}
        {tabButton('card', 'Card')}
        {tabButton('deck', 'Deck', totalCards)}
      </nav>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        exportCommander={commander}
        exportCards={deckCards}
        deckName={deckName}
      />
    </div>
  );
}
